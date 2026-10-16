# Discover Sensitive Data - Amazon Macie

This solution configures Amazon Macie with scheduled discovery jobs, custom data identifiers for organization-specific sensitive data, and alerting on new findings.

## Recommended file structure

```
macie-discovery/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "target_bucket_names" {
  description = "List of S3 bucket names to scan (empty = all buckets)"
  type        = list(string)
  default     = []
}

variable "custom_identifiers" {
  description = "Map of custom data identifiers (name => regex pattern)"
  type        = map(string)
  default = {
    "internal-employee-id" = "[A-Z]{3}-[0-9]{6}"
    "internal-project-code" = "PRJ-[0-9]{4}-[A-Z]{2}"
  }
}

variable "schedule_frequency" {
  description = "Discovery job frequency (ONE_TIME, DAILY, WEEKLY, MONTHLY)"
  type        = string
  default     = "WEEKLY"
}

variable "notification_email" {
  description = "Email for sensitive data findings"
  type        = string
}

variable "project" {
  default = "macie-discovery"
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

# Enable Macie
resource "aws_macie2_account" "this" {
  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

# Custom Data Identifiers
resource "aws_macie2_custom_data_identifier" "custom" {
  for_each = var.custom_identifiers

  name  = each.key
  regex = each.value

  depends_on = [aws_macie2_account.this]
}

# Classification Job — scheduled sensitive data discovery
resource "aws_macie2_classification_job" "main" {
  name     = "${var.project}-discovery"
  job_type = "SCHEDULED"

  schedule_frequency_and_times {
    type = var.schedule_frequency
  }

  s3_job_definition {
    dynamic "bucket_definitions" {
      for_each = length(var.target_bucket_names) > 0 ? [1] : []
      content {
        account_id = data.aws_caller_identity.current.account_id
        buckets    = var.target_bucket_names
      }
    }
  }

  custom_data_identifier_ids = [for id in aws_macie2_custom_data_identifier.custom : id.id]

  depends_on = [aws_macie2_account.this]
}

data "aws_caller_identity" "current" {}

# SNS alerts for Macie findings via EventBridge
resource "aws_sns_topic" "macie_findings" {
  name = "${var.project}-findings"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.macie_findings.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

resource "aws_cloudwatch_event_rule" "macie_findings" {
  name        = "${var.project}-findings"
  description = "Alert on Macie sensitive data findings"

  event_pattern = jsonencode({
    "source"      = ["aws.macie"]
    "detail-type" = ["Macie Finding"]
    "detail" = {
      "severity" = {
        "description" = ["High", "Medium"]
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.macie_findings.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.macie_findings.arn
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.macie_findings.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.macie_findings.arn
    }]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "classification_job_id" {
  description = "ID of the Macie classification job"
  value       = aws_macie2_classification_job.main.id
}

output "custom_identifier_ids" {
  description = "IDs of custom data identifiers"
  value       = { for k, v in aws_macie2_custom_data_identifier.custom : k => v.id }
}

output "findings_topic_arn" {
  description = "SNS topic for Macie findings"
  value       = aws_sns_topic.macie_findings.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="notification_email=security@yourcompany.com" \
  -var='target_bucket_names=["my-app-data","my-customer-records"]'
```

## Important notes

- Identify your **crown jewels** (most sensitive data) and document their expected locations before scanning.
- **Managed data identifiers** detect common types: credit cards, ID numbers, access keys, PII — no configuration needed.
- **Custom data identifiers** (regex-based) detect organization-, industry-, or region-specific data patterns.
- For sensitive data in **databases** (not S3), consider partner solutions: DataGuise, Imperva Data Security (AWS Marketplace).
- Macie integrates with **Security Hub** for centralized finding visibility.
- Run initial discovery as **ONE_TIME** to assess the landscape, then switch to **WEEKLY** for continuous monitoring.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/identify-sensitive-data/).
