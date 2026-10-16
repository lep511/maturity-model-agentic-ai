# Automate Evidence Gathering - AWS Audit Manager

This solution configures Audit Manager for continuous automated compliance evidence collection mapped to regulatory frameworks with audit-ready report generation.

## Recommended file structure

```
evidence-gathering/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "frameworks" {
  description = "Compliance frameworks to assess"
  type        = list(string)
  default     = ["SOC2", "PCI-DSS"]
}

variable "scope_accounts" {
  description = "AWS account IDs in scope"
  type        = list(string)
}

variable "reports_bucket" {
  description = "S3 bucket for assessment reports"
  type        = string
}

variable "project" {
  default = "evidence-gathering"
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

resource "aws_auditmanager_account_registration" "this" {}

resource "aws_s3_bucket" "reports" {
  bucket = var.reports_bucket
  tags   = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role" "audit_manager" {
  name = "${var.project}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "auditmanager.amazonaws.com" }
    }]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "audit_manager" {
  role       = aws_iam_role.audit_manager.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAuditManagerServiceRolePolicy"
}
```

---

## 3. `outputs.tf`

```bash
output "reports_bucket" {
  description = "S3 bucket for audit reports"
  value       = aws_s3_bucket.reports.bucket
}

output "audit_role_arn" {
  description = "Audit Manager service role ARN"
  value       = aws_iam_role.audit_manager.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var='scope_accounts=["123456789012"]' \
  -var="reports_bucket=my-audit-reports-123"
```

## Important notes

- Audit Manager collects evidence **continuously** from Security Hub and CloudTrail — not just at audit time.
- Evidence that cannot be collected automatically can be **manually uploaded** to complete the audit package.
- Use the **AWS Audit Manager Mindmap** to plan implementation across regulatory frameworks.
- Supported frameworks: **PCI DSS, HIPAA, SOC 2, ISO 27001, NIST 800-53, GDPR, CIS**.
- The result is a **ready-to-present audit report** — reducing audit preparation from weeks to hours.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/automate-evidence-gathering/).
