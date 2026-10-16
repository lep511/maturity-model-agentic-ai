# Create Your Compliance Reports - AWS Audit Manager

This solution configures AWS Audit Manager with automated evidence collection for regulatory frameworks, generating audit-ready reports.

## Recommended file structure

```
audit-manager/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "framework_type" {
  description = "Compliance framework (CIS, PCI-DSS, SOC2, NIST-800-53, ISO-27001)"
  type        = string
  default     = "CIS"
}

variable "assessment_name" {
  description = "Name for the compliance assessment"
  type        = string
  default     = "annual-compliance-assessment"
}

variable "reports_bucket" {
  description = "S3 bucket for assessment reports"
  type        = string
}

variable "scope_accounts" {
  description = "AWS account IDs in scope for assessment"
  type        = list(string)
}

variable "project" {
  default = "audit-manager"
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

# Enable Audit Manager
resource "aws_auditmanager_account_registration" "this" {}

# IAM Role for Audit Manager
resource "aws_iam_role" "audit_manager" {
  name = "${var.project}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "auditmanager.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "audit_manager" {
  role       = aws_iam_role.audit_manager.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAuditManagerServiceRolePolicy"
}

# S3 bucket for reports
resource "aws_s3_bucket" "reports" {
  bucket = var.reports_bucket
  tags   = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket = aws_s3_bucket.reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Assessment using standard framework
resource "aws_auditmanager_assessment" "main" {
  name = var.assessment_name

  framework_id = data.aws_auditmanager_framework.selected.id

  assessment_reports_destination {
    destination      = "s3://${aws_s3_bucket.reports.bucket}"
    destination_type = "S3"
  }

  roles {
    role_arn  = aws_iam_role.audit_manager.arn
    role_type = "PROCESS_OWNER"
  }

  scope {
    dynamic "aws_accounts" {
      for_each = var.scope_accounts
      content {
        id = aws_accounts.value
      }
    }
  }

  depends_on = [aws_auditmanager_account_registration.this]
}

data "aws_auditmanager_framework" "selected" {
  name           = var.framework_type == "CIS" ? "CIS Benchmark" : var.framework_type == "PCI-DSS" ? "PCI DSS" : var.framework_type == "SOC2" ? "SOC 2" : var.framework_type == "NIST-800-53" ? "NIST 800-53 Rev 5" : "ISO/IEC 27001:2022"
  framework_type = "Standard"
}
```

---

## 3. `outputs.tf`

```bash
output "assessment_id" {
  description = "Audit Manager assessment ID"
  value       = aws_auditmanager_assessment.main.id
}

output "reports_bucket" {
  description = "S3 bucket for audit reports"
  value       = aws_s3_bucket.reports.bucket
}

output "framework" {
  description = "Compliance framework in use"
  value       = var.framework_type
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="framework_type=PCI-DSS" \
  -var="reports_bucket=my-audit-reports-123456" \
  -var='scope_accounts=["123456789012","987654321098"]'
```

## Important notes

- Compliance is a **shared responsibility**: AWS certifies infrastructure, but you must demonstrate your workloads are also compliant (GAP assessment).
- Audit Manager collects evidence from **CloudTrail, Security Hub, Config, and License Manager** automatically.
- Supplement with **manually attached evidence** for controls that require documentation or process attestation.
- Use **AWS Artifact** to provide auditors with AWS's own compliance certifications.
- Ensure you have the **people and processes** to produce reports on demand — tooling alone is insufficient.
- Supports multiple frameworks: **PCI-DSS, NIST 800-53, ISO 27001, CIS, SOC 2, GDPR, HIPAA**.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/compliance-reports/).
