# Advanced Threat Detection - Amazon GuardDuty Protection Plans

This solution extends GuardDuty beyond default VPC/CloudTrail sources by enabling all Protection Plans and configuring alerts for findings across all severity levels.

## Recommended file structure

```
guardduty-advanced/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "notification_email" {
  description = "Email for GuardDuty finding notifications"
  type        = string
}

variable "enable_runtime_monitoring" {
  description = "Enable Runtime Monitoring for EC2/ECS/EKS"
  type        = bool
  default     = true
}

variable "enable_s3_protection" {
  description = "Enable S3 Protection for adversarial S3 activity"
  type        = bool
  default     = true
}

variable "enable_rds_protection" {
  description = "Enable RDS Protection for Aurora login attacks"
  type        = bool
  default     = true
}

variable "enable_malware_protection" {
  description = "Enable agentless EBS volume malware scanning"
  type        = bool
  default     = true
}

variable "enable_lambda_protection" {
  description = "Enable Lambda network activity monitoring"
  type        = bool
  default     = true
}

variable "project" {
  default = "guardduty-advanced"
}

variable "tags" {
  default = {}
}
```

---

## 2. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# Get existing GuardDuty detector
data "aws_guardduty_detector" "current" {}

# Enable Protection Plans on existing detector
resource "aws_guardduty_detector_feature" "s3" {
  count = var.enable_s3_protection ? 1 : 0

  detector_id = data.aws_guardduty_detector.current.id
  name        = "S3_DATA_EVENTS"
  status      = "ENABLED"
}

resource "aws_guardduty_detector_feature" "rds" {
  count = var.enable_rds_protection ? 1 : 0

  detector_id = data.aws_guardduty_detector.current.id
  name        = "RDS_LOGIN_EVENTS"
  status      = "ENABLED"
}

resource "aws_guardduty_detector_feature" "lambda" {
  count = var.enable_lambda_protection ? 1 : 0

  detector_id = data.aws_guardduty_detector.current.id
  name        = "LAMBDA_NETWORK_LOGS"
  status      = "ENABLED"
}

resource "aws_guardduty_detector_feature" "runtime" {
  count = var.enable_runtime_monitoring ? 1 : 0

  detector_id = data.aws_guardduty_detector.current.id
  name        = "RUNTIME_MONITORING"
  status      = "ENABLED"

  additional_configuration {
    name   = "EKS_ADDON_MANAGEMENT"
    status = "ENABLED"
  }

  additional_configuration {
    name   = "ECS_FARGATE_AGENT_MANAGEMENT"
    status = "ENABLED"
  }

  additional_configuration {
    name   = "EC2_AGENT_MANAGEMENT"
    status = "ENABLED"
  }
}

resource "aws_guardduty_detector_feature" "malware" {
  count = var.enable_malware_protection ? 1 : 0

  detector_id = data.aws_guardduty_detector.current.id
  name        = "EBS_MALWARE_PROTECTION"
  status      = "ENABLED"
}

# SNS Topic for all severity findings
resource "aws_sns_topic" "findings" {
  name = "${var.project}-findings"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.findings.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# EventBridge rule for medium and above findings (severity >= 4)
resource "aws_cloudwatch_event_rule" "findings" {
  name        = "${var.project}-all-findings"
  description = "Alert on medium and above GuardDuty findings"

  event_pattern = jsonencode({
    "source"      = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
    "detail" = {
      "severity" = [{ "numeric" = [">=", 4] }]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.findings.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.findings.arn
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.findings.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.findings.arn
    }]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "detector_id" {
  description = "GuardDuty detector ID"
  value       = data.aws_guardduty_detector.current.id
}

output "findings_topic_arn" {
  description = "SNS topic for GuardDuty finding alerts"
  value       = aws_sns_topic.findings.arn
}

output "enabled_features" {
  description = "List of enabled protection plans"
  value = compact([
    var.enable_s3_protection ? "S3 Protection" : "",
    var.enable_rds_protection ? "RDS Protection" : "",
    var.enable_lambda_protection ? "Lambda Protection" : "",
    var.enable_runtime_monitoring ? "Runtime Monitoring" : "",
    var.enable_malware_protection ? "Malware Protection" : ""
  ])
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="notification_email=security@yourcompany.com"
```

## Important notes

- This assumes GuardDuty is already enabled (Phase 1). This solution **extends** it with Protection Plans.
- **Review all severity levels** — medium and low findings may indicate early reconnaissance or pre-compromise activity.
- **Runtime Monitoring** provides process-level visibility on EC2, ECS, and EKS workloads.
- **Malware Protection** performs agentless EBS volume scanning when GuardDuty detects suspicious activity.
- **RDS Protection** detects anomalous login attempts on Aurora databases.
- Enable auto-management of security agents for EKS, ECS Fargate, and EC2 to simplify deployment.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/guardduty-advanced/).
