# Tagging Strategy - Organization-Wide Standards

This solution implements a tagging strategy with enforced required tags via Config rules, SCPs, and ABAC-enabled IAM policies.

## Recommended file structure

```
tagging-strategy/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "required_tags" {
  description = "Tags that must be present on all resources"
  type        = list(string)
  default     = ["Owner", "Environment", "Project", "DataClassification"]
}

variable "allowed_environments" {
  description = "Valid values for the Environment tag"
  type        = list(string)
  default     = ["production", "staging", "development", "sandbox"]
}

variable "allowed_data_classifications" {
  description = "Valid values for the DataClassification tag"
  type        = list(string)
  default     = ["public", "internal", "confidential", "restricted"]
}

variable "project" {
  default = "tagging-strategy"
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

# Config Rules — detect resources missing required tags
resource "aws_config_config_rule" "required_tags" {
  name = "${var.project}-required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key = var.required_tags[0]
    tag2Key = var.required_tags[1]
    tag3Key = var.required_tags[2]
    tag4Key = var.required_tags[3]
  })

  tags = var.tags
}

# SCP — deny resource creation without required tags
resource "aws_organizations_policy" "enforce_tags" {
  name        = "EnforceRequiredTags"
  description = "Deny creating resources without required tags"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyCreateWithoutTags"
      Effect = "Deny"
      Action = [
        "ec2:RunInstances",
        "ec2:CreateVolume",
        "rds:CreateDBInstance",
        "s3:CreateBucket",
        "lambda:CreateFunction"
      ]
      Resource = "*"
      Condition = {
        "Null" = {
          "aws:RequestTag/Owner"       = "true"
          "aws:RequestTag/Environment" = "true"
        }
      }
    }]
  })
}

# Tag Policy — enforce allowed tag values
resource "aws_organizations_policy" "tag_policy" {
  name = "StandardTagValues"
  type = "TAG_POLICY"

  content = jsonencode({
    tags = {
      Environment = {
        tag_key = { "@@assign" = "Environment" }
        tag_value = { "@@assign" = var.allowed_environments }
        enforced_for = { "@@assign" = ["ec2:instance", "rds:db", "s3:bucket"] }
      }
      DataClassification = {
        tag_key = { "@@assign" = "DataClassification" }
        tag_value = { "@@assign" = var.allowed_data_classifications }
      }
    }
  })
}

# ABAC example — restrict access by Environment tag
resource "aws_iam_policy" "abac_environment" {
  name        = "${var.project}-abac-env"
  description = "Restrict access to resources matching user's environment tag"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowSameEnvironmentOnly"
      Effect = "Allow"
      Action = [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances"
      ]
      Resource = "*"
      Condition = {
        StringEquals = {
          "aws:ResourceTag/Environment" = "$${aws:PrincipalTag/Environment}"
        }
      }
    }]
  })

  tags = var.tags
}
```

---

## 3. Tagging Schema

```markdown
## Required Tags (enforced)

| Tag Key | Purpose | Example Values |
|---------|---------|----------------|
| Owner | Team/individual responsible | platform-team, security-team |
| Environment | Deployment stage | production, staging, development, sandbox |
| Project | Business project or application | payments, auth-service |
| DataClassification | Data sensitivity level | public, internal, confidential, restricted |

## Recommended Tags (optional)

| Tag Key | Purpose | Example Values |
|---------|---------|----------------|
| CostCenter | Billing allocation | CC-1234 |
| Compliance | Regulatory scope | pci, hipaa, sox |
| AutoShutdown | Schedule for non-prod resources | true/false |
| BackupPolicy | Backup tier | daily, weekly, none |
| IncidentIsolated | IR automation trigger | true (triggers deny policy) |

## Rules
- Never include PII in tag values
- Use lowercase for consistency
- Manage programmatically via Resource Groups Tagging API
- Audit compliance via Config rules
```

---

## 4. `outputs.tf`

```bash
output "config_rule_name" {
  description = "Config rule checking required tags"
  value       = aws_config_config_rule.required_tags.name
}

output "scp_id" {
  description = "SCP enforcing tags on resource creation"
  value       = aws_organizations_policy.enforce_tags.id
}

output "abac_policy_arn" {
  description = "ABAC policy ARN for environment-based access"
  value       = aws_iam_policy.abac_environment.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply
```

## Important notes

- Tags enable **ABAC** (Attribute-Based Access Control) — restrict access by environment, team, or data classification without per-resource policies.
- Use tags for **incident response automation** — tagging a compromised instance with `IncidentIsolated=true` can trigger a deny policy.
- **Avoid PII in tag values** — tags are visible in billing reports and API responses.
- Enforce required tags via **Config rules** (detect) and **SCPs** (prevent creation without tags).
- **Tag Policies** enforce allowed values organization-wide — prevent typos and inconsistency.
- Manage tags programmatically via the **AWS Resource Groups Tagging API** for bulk operations.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/tags-strategy/).
