# Data Backups - AWS Backup

This solution configures AWS Backup with centralized policies, cross-account vault for isolation, and automated backup plans for critical services.

## Recommended file structure

```
aws-backup/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "backup_vault_name" {
  description = "Name for the backup vault"
  type        = string
  default     = "central-backup-vault"
}

variable "backup_account_id" {
  description = "Account ID for the isolated backup account (cross-account copy)"
  type        = string
  default     = ""
}

variable "retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 35
}

variable "cold_storage_after_days" {
  description = "Days before transitioning to cold storage (0 to disable)"
  type        = number
  default     = 90
}

variable "schedule" {
  description = "Cron expression for backup schedule"
  type        = string
  default     = "cron(0 3 * * ? *)"
}

variable "resource_tags" {
  description = "Tag key-value to select resources for backup"
  type        = map(string)
  default     = { "backup" = "true" }
}

variable "project" {
  default = "aws-backup"
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

# Backup Vault with encryption
resource "aws_backup_vault" "main" {
  name = var.backup_vault_name
  tags = var.tags
}

# Vault lock — prevent deletion (optional, use for compliance)
resource "aws_backup_vault_lock_configuration" "main" {
  backup_vault_name   = aws_backup_vault.main.name
  min_retention_days  = 7
  max_retention_days  = var.retention_days
  changeable_for_days = 3
}

# Backup Plan
resource "aws_backup_plan" "main" {
  name = "${var.project}-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = var.schedule
    start_window      = 60
    completion_window = 180

    lifecycle {
      cold_storage_after = var.cold_storage_after_days > 0 ? var.cold_storage_after_days : null
      delete_after       = var.retention_days
    }

    # Cross-account copy (if backup account is specified)
    dynamic "copy_action" {
      for_each = var.backup_account_id != "" ? [1] : []
      content {
        destination_vault_arn = "arn:aws:backup:us-east-1:${var.backup_account_id}:backup-vault:${var.backup_vault_name}"
        lifecycle {
          delete_after = var.retention_days
        }
      }
    }
  }

  tags = var.tags
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup" {
  name = "${var.project}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Resource Selection — tag-based
resource "aws_backup_selection" "tagged" {
  name         = "${var.project}-tagged-resources"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.main.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = keys(var.resource_tags)[0]
    value = values(var.resource_tags)[0]
  }
}
```

---

## 3. `outputs.tf`

```bash
output "vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.main.arn
}

output "plan_id" {
  description = "ID of the backup plan"
  value       = aws_backup_plan.main.id
}

output "backup_role_arn" {
  description = "IAM role ARN used by AWS Backup"
  value       = aws_iam_role.backup.arn
}
```

---

## How to deploy

```bash
terraform init

# Basic deployment:
terraform apply

# With cross-account copy:
terraform apply -var="backup_account_id=999888777666"
```

## Important notes

- Tag resources with `backup=true` (or your chosen tag) to include them in the backup plan.
- Store backups in a **separate account** to isolate them from a primary environment compromise — attackers who gain admin access in the primary account cannot delete cross-account backups.
- **Vault Lock** prevents backup deletion even by account administrators — use for compliance requirements.
- AWS Backup supports **EBS, EC2, RDS, DynamoDB, EFS, FSx, S3, Neptune, DocumentDB, and Aurora**.
- Align retention policies with **RPO/RTO objectives** defined by the business.
- Test **restore procedures** regularly — untested backups are not backups.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/backups/).
