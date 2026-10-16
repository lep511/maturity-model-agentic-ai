# Automate Deviation Correction in Configurations - AWS Config Auto Remediation

This solution configures AWS Config auto-remediation to automatically correct misconfigurations using SSM Automation documents.

## Recommended file structure

```
config-auto-remediation/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "notification_email" {
  description = "Email for remediation notifications"
  type        = string
}

variable "auto_remediate" {
  description = "Enable automatic remediation (vs notify-only)"
  type        = bool
  default     = false
}

variable "project" {
  default = "config-auto-remediation"
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

# Config Rule: S3 buckets must not be public
resource "aws_config_config_rule" "s3_public" {
  name = "${var.project}-s3-no-public"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }
  tags = var.tags
}

# Auto-remediation: block public S3 access
resource "aws_config_remediation_configuration" "s3_public" {
  config_rule_name = aws_config_config_rule.s3_public.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-ConfigureS3BucketPublicAccessBlock"

  parameter {
    name         = "BucketName"
    resource_value = "RESOURCE_ID"
  }
  parameter {
    name         = "BlockPublicAcls"
    static_value = "true"
  }
  parameter {
    name         = "BlockPublicPolicy"
    static_value = "true"
  }
  parameter {
    name         = "IgnorePublicAcls"
    static_value = "true"
  }
  parameter {
    name         = "RestrictPublicBuckets"
    static_value = "true"
  }

  automatic                  = var.auto_remediate
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}

# Config Rule: EBS volumes must be encrypted
resource "aws_config_config_rule" "ebs_encrypted" {
  name = "${var.project}-ebs-encrypted"
  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }
  tags = var.tags
}

# Config Rule: Security Groups must not allow unrestricted SSH
resource "aws_config_config_rule" "no_open_ssh" {
  name = "${var.project}-no-open-ssh"
  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }
  tags = var.tags
}

# Auto-remediation: remove open SSH rules
resource "aws_config_remediation_configuration" "no_open_ssh" {
  config_rule_name = aws_config_config_rule.no_open_ssh.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-DisablePublicAccessForSecurityGroup"

  parameter {
    name         = "GroupId"
    resource_value = "RESOURCE_ID"
  }

  automatic                  = var.auto_remediate
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}

# SNS notifications for remediation actions
resource "aws_sns_topic" "remediation" {
  name = "${var.project}-notifications"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.remediation.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# EventBridge: notify on compliance state changes
resource "aws_cloudwatch_event_rule" "compliance_change" {
  name        = "${var.project}-compliance-change"
  description = "Notify on Config compliance state changes"

  event_pattern = jsonencode({
    "source"      = ["aws.config"]
    "detail-type" = ["Config Rules Compliance Change"]
    "detail" = {
      "newEvaluationResult" = {
        "complianceType" = ["NON_COMPLIANT"]
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.compliance_change.name
  target_id = "NotifyNonCompliant"
  arn       = aws_sns_topic.remediation.arn
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.remediation.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.remediation.arn
    }]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "config_rules" {
  description = "Config rules with auto-remediation"
  value = [
    aws_config_config_rule.s3_public.name,
    aws_config_config_rule.ebs_encrypted.name,
    aws_config_config_rule.no_open_ssh.name
  ]
}

output "notification_topic" {
  description = "SNS topic for remediation notifications"
  value       = aws_sns_topic.remediation.arn
}
```

---

## How to deploy

```bash
terraform init

# Notify-only mode (recommended first):
terraform apply -var="notification_email=security@yourcompany.com"

# Enable auto-remediation:
terraform apply -var="notification_email=security@yourcompany.com" -var="auto_remediate=true"
```

## Important notes

- Start with **softer approaches** — auto-create a ticket and notify the resource owner via tags before enabling fully automated correction.
- Auto-remediation complements **preventive controls** (SCPs/IAM) by correcting deviations introduced before a policy existed.
- It handles **privileged users** who can bypass SCPs (e.g., management account admins).
- **Test all remediation automations** to confirm they restore desired state without service disruption.
- Common remediations: enable S3 BPA, remove open SSH/RDP rules, enable EBS encryption, enforce IMDSv2.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/security-automations-config/).
