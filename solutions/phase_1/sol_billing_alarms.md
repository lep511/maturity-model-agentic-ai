# Billing Alarms - CloudWatch + Cost Anomaly Detection

This solution configures billing alarms for compute services to detect potential cryptomining or account compromise, plus AWS Cost Anomaly Detection for ML-based anomaly identification.

## Recommended file structure

```
billing-alarms/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "notification_email" {
  description = "Email address to receive billing alerts"
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly budget threshold in USD"
  type        = number
  default     = 500
}

variable "compute_threshold_usd" {
  description = "Threshold for compute-specific spending in USD"
  type        = number
  default     = 200
}

variable "project" {
  default = "billing-alarms"
}

variable "tags" {
  default = {}
}
```

---

## 2. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"   # Billing metrics are only available in us-east-1
}

# SNS Topic for billing alerts
resource "aws_sns_topic" "billing" {
  name = "${var.project}-topic"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.billing.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# Total estimated charges alarm
resource "aws_cloudwatch_metric_alarm" "total_charges" {
  alarm_name          = "${var.project}-total-charges"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.monthly_budget_usd
  alarm_description   = "Total AWS charges exceeded ${var.monthly_budget_usd} USD"

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing.arn]
  tags          = var.tags
}

# EC2 compute charges alarm (cryptomining indicator)
resource "aws_cloudwatch_metric_alarm" "ec2_charges" {
  alarm_name          = "${var.project}-ec2-charges"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.compute_threshold_usd
  alarm_description   = "EC2 charges exceeded ${var.compute_threshold_usd} USD — possible cryptomining"

  dimensions = {
    Currency    = "USD"
    ServiceName = "AmazonEC2"
  }

  alarm_actions = [aws_sns_topic.billing.arn]
  tags          = var.tags
}

# Lambda charges alarm
resource "aws_cloudwatch_metric_alarm" "lambda_charges" {
  alarm_name          = "${var.project}-lambda-charges"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.compute_threshold_usd
  alarm_description   = "Lambda charges exceeded threshold — possible abuse"

  dimensions = {
    Currency    = "USD"
    ServiceName = "AWSLambda"
  }

  alarm_actions = [aws_sns_topic.billing.arn]
  tags          = var.tags
}

# AWS Cost Anomaly Detection
resource "aws_ce_anomaly_monitor" "compute" {
  name              = "${var.project}-compute-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "alerts" {
  name = "${var.project}-subscription"

  monitor_arn_list = [aws_ce_anomaly_monitor.compute.arn]

  frequency = "IMMEDIATE"

  subscriber {
    type    = "EMAIL"
    address = var.notification_email
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}
```

---

## 3. `outputs.tf`

```bash
output "sns_topic_arn" {
  description = "ARN of the SNS topic for billing alerts"
  value       = aws_sns_topic.billing.arn
}

output "anomaly_monitor_arn" {
  description = "ARN of the Cost Anomaly Detection monitor"
  value       = aws_ce_anomaly_monitor.compute.arn
}

output "total_alarm_name" {
  description = "Name of the total charges CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.total_charges.alarm_name
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="notification_email=security-team@yourcompany.com" \
  -var="monthly_budget_usd=1000" \
  -var="compute_threshold_usd=300"
```

## Important notes

- Billing metrics are **only available in us-east-1** — deploy alarms in that region.
- Ensure alerts reach the **security team**, not just FinOps — billing spikes are early indicators of compromise.
- **Cost Anomaly Detection** uses ML and requires no fixed thresholds — it adapts to your spending patterns.
- Alarms should reach **more than one person** to avoid single points of failure.
- Billing spikes from **EC2, ECS, EKS, or Lambda** often indicate cryptomining or botnet activity.
- Enable billing alerts in the **Billing preferences** console (required for CloudWatch billing metrics).
