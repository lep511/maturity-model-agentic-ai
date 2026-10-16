# Audit API Calls - AWS CloudTrail

This solution enables an organizational CloudTrail trail with centralized logging to a dedicated S3 bucket, protected by SCPs against tampering.

## Recommended file structure

```
cloudtrail-org/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "organization_id" {
  description = "AWS Organization ID (e.g., o-xxxxxxxxxx)"
  type        = string
}

variable "logging_account_id" {
  description = "Account ID for the centralized logging account"
  type        = string
}

variable "retention_days" {
  description = "Number of days to retain CloudTrail logs in S3"
  type        = number
  default     = 365
}

variable "project" {
  default = "cloudtrail-org"
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

data "aws_caller_identity" "current" {}

# S3 bucket for centralized CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "${var.project}-logs-${var.logging_account_id}"
  tags   = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  rule {
    id     = "transition-and-expire"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    expiration {
      days = var.retention_days
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AWSCloudTrailAclCheck"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid       = "AWSCloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${var.organization_id}/*"
        Condition = {
          StringEquals = { "s3:x-amz-acl" = "bucket-owner-full-control" }
        }
      }
    ]
  })
}

# Organization Trail
resource "aws_cloudtrail" "org" {
  name                          = "${var.project}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_organization_trail         = true
  is_multi_region_trail         = true
  include_global_service_events = true
  enable_log_file_validation    = true

  tags = var.tags
}

# SCP to prevent CloudTrail tampering
resource "aws_organizations_policy" "protect_cloudtrail" {
  name        = "ProtectCloudTrail"
  description = "Prevent member accounts from stopping or deleting CloudTrail"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyCloudTrailTampering"
      Effect = "Deny"
      Action = [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "cloudtrail:UpdateTrail"
      ]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "aws:PrincipalOrgID" = var.organization_id
        }
      }
    }]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "trail_arn" {
  description = "ARN of the organizational CloudTrail trail"
  value       = aws_cloudtrail.org.arn
}

output "log_bucket" {
  description = "S3 bucket storing centralized CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail.bucket
}

output "scp_id" {
  description = "ID of the SCP protecting CloudTrail"
  value       = aws_organizations_policy.protect_cloudtrail.id
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="organization_id=o-xxxxxxxxxx" \
  -var="logging_account_id=123456789012"
```

## Important notes

- Run from the **management account** or a delegated CloudTrail admin.
- If using **AWS Control Tower**, the organizational trail and logging account are created automatically.
- Enable **log file validation** to detect tampering with delivered log files.
- Logs transition to Glacier after 180 days for cost optimization — adjust based on compliance needs.
- The SCP prevents member accounts from stopping or deleting the trail.
- Train the security team on **CloudTrail Lake** or **Athena** queries for incident investigation.
