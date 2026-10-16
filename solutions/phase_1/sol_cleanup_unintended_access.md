# Cleanup Unintended Access - IAM Access Analyzer

This solution deploys IAM Access Analyzer at the organization level to discover externally shared resources and identify unused roles, access keys, and permissions.

## Recommended file structure

```
iam-access-analyzer/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "enable_unused_access" {
  description = "Enable unused access analysis (paid feature)"
  type        = bool
  default     = false
}

variable "unused_access_age_days" {
  description = "Days of inactivity before flagging unused access"
  type        = number
  default     = 90
}

variable "project" {
  default = "iam-access-analyzer"
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

# Organization-level External Access Analyzer (free)
resource "aws_accessanalyzer_analyzer" "external" {
  analyzer_name = "${var.project}-external"
  type          = "ORGANIZATION"
  tags          = var.tags
}

# Unused Access Analyzer (paid — identifies unused roles, keys, permissions)
resource "aws_accessanalyzer_analyzer" "unused" {
  count = var.enable_unused_access ? 1 : 0

  analyzer_name = "${var.project}-unused"
  type          = "ORGANIZATION_UNUSED_ACCESS"

  configuration {
    unused_access {
      unused_access_age = var.unused_access_age_days
    }
  }

  tags = var.tags
}

# EventBridge rule to alert on new external access findings
resource "aws_cloudwatch_event_rule" "new_findings" {
  name        = "${var.project}-new-findings"
  description = "Alert on new IAM Access Analyzer findings"

  event_pattern = jsonencode({
    "source"      = ["aws.access-analyzer"]
    "detail-type" = ["Access Analyzer Finding"]
    "detail" = {
      "status" = ["ACTIVE"]
      "isPublic" = [true]
    }
  })

  tags = var.tags
}

# SNS Topic for findings
resource "aws_sns_topic" "findings" {
  name = "${var.project}-findings"
  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.new_findings.name
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
output "external_analyzer_arn" {
  description = "ARN of the external access analyzer"
  value       = aws_accessanalyzer_analyzer.external.arn
}

output "unused_analyzer_arn" {
  description = "ARN of the unused access analyzer (if enabled)"
  value       = var.enable_unused_access ? aws_accessanalyzer_analyzer.unused[0].arn : "Not enabled"
}

output "findings_topic_arn" {
  description = "SNS topic ARN for access analyzer findings"
  value       = aws_sns_topic.findings.arn
}
```

---

## How to deploy

```bash
terraform init

# External access analysis only (free)
terraform apply

# With unused access analysis (paid)
terraform apply -var="enable_unused_access=true" -var="unused_access_age_days=90"
```

## Important notes

- **External access analysis is free** — it identifies resources shared outside your organization (S3 buckets, IAM roles, KMS keys, Lambda functions, SQS queues).
- **Unused access analysis is paid** — identifies unused roles, access keys, and overly permissive policies.
- Deploy at the **ORGANIZATION** level for visibility across all member accounts.
- Actively **remediate findings** — the analyzer only detects, it does not auto-fix.
- Reducing unintended access **limits blast radius** during a compromise.
- CIEM solutions (Wiz, Tenable, Prisma Cloud) offer similar capabilities and are often bundled in CNAPP platforms.
- Archive findings you have explicitly accepted (e.g., intentional cross-account sharing).
