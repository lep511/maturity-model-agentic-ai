# Detect Common Threats - Amazon GuardDuty

This solution enables Amazon GuardDuty across all accounts and regions in an AWS Organization with a delegated administrator, protection plans, and automated alerting for high-severity findings.

## Recommended file structure

```
guardduty-org/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "delegated_admin_account_id" {
  description = "Account ID for the GuardDuty delegated administrator"
  type        = string
}

variable "notification_email" {
  description = "Email to receive high-severity GuardDuty alerts"
  type        = string
}

variable "enable_s3_protection" {
  description = "Enable S3 Protection plan"
  type        = bool
  default     = true
}

variable "enable_eks_protection" {
  description = "Enable EKS Protection plan"
  type        = bool
  default     = true
}

variable "enable_malware_protection" {
  description = "Enable Malware Protection plan"
  type        = bool
  default     = true
}

variable "enable_rds_protection" {
  description = "Enable RDS Protection plan"
  type        = bool
  default     = true
}

variable "enable_lambda_protection" {
  description = "Enable Lambda Protection plan"
  type        = bool
  default     = true
}

variable "project" {
  default = "guardduty-org"
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

# Enable GuardDuty detector
resource "aws_guardduty_detector" "this" {
  enable = true

  datasources {
    s3_logs {
      enable = var.enable_s3_protection
    }
    kubernetes {
      audit_logs {
        enable = var.enable_eks_protection
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = var.enable_malware_protection
        }
      }
    }
  }

  tags = var.tags
}

# Designate delegated administrator
resource "aws_guardduty_organization_admin_account" "this" {
  admin_account_id = var.delegated_admin_account_id
}

# Auto-enable GuardDuty for new member accounts
resource "aws_guardduty_organization_configuration" "this" {
  detector_id = aws_guardduty_detector.this.id
  auto_enable_organization_members = "ALL"

  datasources {
    s3_logs {
      auto_enable = var.enable_s3_protection
    }
    kubernetes {
      audit_logs {
        auto_enable = var.enable_eks_protection
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          auto_enable = var.enable_malware_protection
        }
      }
    }
  }
}

# SNS Topic for high-severity alerts
resource "aws_sns_topic" "guardduty_alerts" {
  name = "${var.project}-alerts"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.guardduty_alerts.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# EventBridge rule for HIGH and CRITICAL findings
resource "aws_cloudwatch_event_rule" "high_findings" {
  name        = "${var.project}-high-findings"
  description = "Alert on HIGH and CRITICAL GuardDuty findings"

  event_pattern = jsonencode({
    "source"      = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
    "detail" = {
      "severity" = [{ "numeric" = [">=", 7] }]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.high_findings.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.guardduty_alerts.arn
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.guardduty_alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.guardduty_alerts.arn
    }]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "detector_id" {
  description = "GuardDuty detector ID"
  value       = aws_guardduty_detector.this.id
}

output "delegated_admin" {
  description = "Delegated administrator account ID"
  value       = var.delegated_admin_account_id
}

output "alerts_topic_arn" {
  description = "SNS topic for high-severity findings"
  value       = aws_sns_topic.guardduty_alerts.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="delegated_admin_account_id=123456789012" \
  -var="notification_email=security@yourcompany.com"
```

## Important notes

- Enable GuardDuty in **all regions and all accounts** — attackers target unused regions.
- Designate a **delegated administrator** for centralized finding visibility.
- Enable relevant **Protection Plans** based on your workload (S3, EKS, Lambda, RDS, Malware).
- HIGH and CRITICAL findings (severity >= 7) should trigger **immediate notifications** via SNS or integration with your SIEM/ticketing system.
- Export findings to **EventBridge** for automated response workflows.
- GuardDuty has a **30-day free trial** — evaluate coverage before committing.
- Review findings regularly, including **medium and low severity** — they may indicate early reconnaissance.
