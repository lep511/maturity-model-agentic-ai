# Least Privilege Review - IAM Access Analyzer

This solution uses IAM Access Analyzer to detect unused permissions, generate least-privilege policies from CloudTrail activity, and establish a review workflow.

## Recommended file structure

```
least-privilege/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "unused_access_age_days" {
  description = "Days of inactivity before flagging unused access"
  type        = number
  default     = 90
}

variable "notification_email" {
  description = "Email for unused access findings"
  type        = string
}

variable "project" {
  default = "least-privilege"
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

# Organization-level unused access analyzer
resource "aws_accessanalyzer_analyzer" "unused" {
  analyzer_name = "${var.project}-unused-access"
  type          = "ORGANIZATION_UNUSED_ACCESS"

  configuration {
    unused_access {
      unused_access_age = var.unused_access_age_days
    }
  }

  tags = var.tags
}

# SNS for findings
resource "aws_sns_topic" "findings" {
  name = "${var.project}-findings"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.findings.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# EventBridge for new unused access findings
resource "aws_cloudwatch_event_rule" "unused_access" {
  name        = "${var.project}-unused-findings"
  description = "Alert on new unused access findings"

  event_pattern = jsonencode({
    "source"      = ["aws.access-analyzer"]
    "detail-type" = ["Access Analyzer Finding"]
    "detail" = {
      "status"     = ["ACTIVE"]
      "findingType" = [
        { "prefix" = "UnusedIAMRole" },
        { "prefix" = "UnusedIAMUserAccessKey" },
        { "prefix" = "UnusedIAMUserPassword" },
        { "prefix" = "UnusedPermission" }
      ]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.unused_access.name
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

## 3. Least Privilege Workflow

```markdown
## Recommended Process for New Roles

1. **Development**: Grant broad permissions (e.g., PowerUserAccess)
2. **Run application**: Exercise all functionality for 30-90 days
3. **Generate policy**: Use IAM Access Analyzer to generate a least-privilege policy from actual CloudTrail usage
4. **Review**: Validate the generated policy covers all required actions
5. **Apply**: Replace broad policy with generated least-privilege policy
6. **Promote**: Deploy to staging/production with the tightened policy

## CLI Commands

```bash
# Generate policy from CloudTrail activity
aws accessanalyzer start-policy-generation \
  --policy-generation-details '{
    "principalArn": "arn:aws:iam::123:role/MyAppRole",
    "cloudTrailDetails": {
      "trails": [{"cloudTrailArn": "arn:aws:cloudtrail:us-east-1:123:trail/org-trail", "allRegions": true}],
      "accessRole": "arn:aws:iam::123:role/AccessAnalyzerRole",
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-03-31T23:59:59Z"
    }
  }'

# Check unused access findings
aws accessanalyzer list-findings \
  --analyzer-arn "arn:aws:access-analyzer:us-east-1:123:analyzer/unused-access" \
  --filter '{"status": {"eq": ["ACTIVE"]}}'

# Check IAM Access Advisor (services never accessed)
aws iam generate-service-last-accessed-details --arn arn:aws:iam::123:role/MyRole
aws iam get-service-last-accessed-details --job-id <job-id>
```

---

## 4. `outputs.tf`

```bash
output "analyzer_arn" {
  description = "Unused access analyzer ARN"
  value       = aws_accessanalyzer_analyzer.unused.arn
}

output "findings_topic_arn" {
  description = "SNS topic for unused access findings"
  value       = aws_sns_topic.findings.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="notification_email=security@yourcompany.com"
```

## Important notes

- Focus on **wildcard actions (`*`) and wildcard resources (`*`)** — these provide the most blast radius reduction.
- Use Access Analyzer to **generate policies from actual CloudTrail usage** — not guessing what permissions are needed.
- **IAM Access Advisor** shows which services a role has NEVER accessed — remove those entirely.
- Recommended workflow: broad permissions in dev → run → generate tight policy → validate → promote to prod.
- For advanced CIEM capabilities, consider **partner solutions** (Ermetic, Sonrai, Wiz) that provide graph-based permission analysis.
- Make least privilege enforcement part of the **role creation process**, not just periodic audits.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/iam-least-privilege/).
