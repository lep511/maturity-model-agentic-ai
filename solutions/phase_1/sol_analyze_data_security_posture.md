# Analyze Data Security Posture - Amazon Macie

This solution enables Amazon Macie across the organization with automated sensitive data discovery to identify publicly exposed, unencrypted, or externally shared S3 buckets.

## Recommended file structure

```
macie-data-posture/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "delegated_admin_account_id" {
  description = "AWS account ID for the Macie delegated administrator"
  type        = string
}

variable "publishing_frequency" {
  description = "Frequency for publishing findings (FIFTEEN_MINUTES, ONE_HOUR, SIX_HOURS)"
  type        = string
  default     = "ONE_HOUR"
}

variable "project" {
  default = "macie-data-posture"
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

# Enable Macie in the management account
resource "aws_macie2_account" "this" {
  finding_publishing_frequency = var.publishing_frequency
}

# Designate delegated administrator for organization-wide visibility
resource "aws_macie2_organization_admin_account" "this" {
  admin_account_id = var.delegated_admin_account_id
  depends_on       = [aws_macie2_account.this]
}

# Enable automated sensitive data discovery
resource "aws_macie2_automated_discovery_configuration" "this" {
  status     = "ENABLED"
  depends_on = [aws_macie2_account.this]
}

# Classification export configuration — store discovery results in S3
resource "aws_s3_bucket" "macie_results" {
  bucket = "${var.project}-results-${data.aws_caller_identity.current.account_id}"
  tags   = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "macie_results" {
  bucket = aws_s3_bucket.macie_results.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "macie_results" {
  bucket = aws_s3_bucket.macie_results.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_macie2_classification_export_configuration" "this" {
  s3_destination {
    bucket_name = aws_s3_bucket.macie_results.bucket
    key_prefix  = "macie-findings/"
  }
  depends_on = [aws_macie2_account.this]
}

data "aws_caller_identity" "current" {}
```

---

## 3. `outputs.tf`

```bash
output "macie_account_id" {
  description = "Account ID where Macie is enabled"
  value       = data.aws_caller_identity.current.account_id
}

output "results_bucket" {
  description = "S3 bucket storing Macie classification results"
  value       = aws_s3_bucket.macie_results.bucket
}

output "delegated_admin" {
  description = "Delegated administrator account ID"
  value       = var.delegated_admin_account_id
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="delegated_admin_account_id=123456789012"
```

## Important notes

- Run this in the **management account** to designate the delegated admin.
- Automated Sensitive Data Discovery samples buckets continuously — it does not scan every object.
- Macie findings integrate with **Security Hub** for centralized visibility.
- Review the Macie dashboard for buckets that are: publicly accessible, shared with external accounts, or unencrypted.
- Define a **data security policy** specifying where each type of sensitive data is allowed to reside.
- External access analysis is free; automated discovery has a per-bucket cost.
