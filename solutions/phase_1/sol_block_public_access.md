# Block Public Access - S3 and EC2

This solution enables S3 Block Public Access at the account level across the organization using SCPs to prevent removal, and enables Block Public Access for EC2 AMIs and EBS Snapshots.

## Recommended file structure

```
block-public-access/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "organization_id" {
  description = "AWS Organization ID"
  type        = string
}

variable "exempt_account_ids" {
  description = "Account IDs exempt from BPA SCP (accounts that need public buckets)"
  type        = list(string)
  default     = []
}

variable "project" {
  default = "block-public-access"
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

# S3 Block Public Access at account level
resource "aws_s3_account_public_access_block" "this" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# EC2 AMI Block Public Access
resource "aws_ec2_image_block_public_access" "this" {
  state = "block-new-sharing"
}

# EBS Snapshot Block Public Access
resource "aws_ebs_snapshot_block_public_access" "this" {
  state = "block-all-sharing"
}

# SCP to prevent S3 BPA removal
resource "aws_organizations_policy" "prevent_bpa_removal" {
  name        = "PreventS3BPARemoval"
  description = "Prevent removal of S3 Block Public Access settings"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyS3BPARemoval"
        Effect = "Deny"
        Action = [
          "s3:PutBucketPublicAccessBlock",
          "s3:PutAccountPublicAccessBlock"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:PrincipalAccount" = var.exempt_account_ids
          }
        }
      },
      {
        Sid    = "DenyEC2PublicSharing"
        Effect = "Deny"
        Action = [
          "ec2:EnableImageBlockPublicAccess",
          "ec2:DisableImageBlockPublicAccess",
          "ec2:EnableSnapshotBlockPublicAccess",
          "ec2:DisableSnapshotBlockPublicAccess"
        ]
        Resource = "*"
      }
    ]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "s3_bpa_enabled" {
  description = "S3 Block Public Access is enabled at account level"
  value       = true
}

output "ec2_ami_bpa_state" {
  description = "EC2 AMI Block Public Access state"
  value       = aws_ec2_image_block_public_access.this.state
}

output "ebs_snapshot_bpa_state" {
  description = "EBS Snapshot Block Public Access state"
  value       = aws_ebs_snapshot_block_public_access.this.state
}

output "scp_id" {
  description = "ID of the SCP preventing BPA removal"
  value       = aws_organizations_policy.prevent_bpa_removal.id
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="organization_id=o-xxxxxxxxxx"

# If certain accounts need public buckets:
terraform apply \
  -var="organization_id=o-xxxxxxxxxx" \
  -var='exempt_account_ids=["111111111111"]'
```

## Important notes

- Enable BPA at the **account level** for maximum protection — bucket-level settings can be overridden.
- Accounts that legitimately need public S3 buckets should apply BPA at the **bucket level** for all non-public buckets.
- Verify coverage with **Security Hub controls S3.1, S3.2, S3.8, and EC2.1**.
- The SCP prevents any user (including admins) from removing BPA in non-exempt accounts.
- For existing accounts, audit current public resources before enabling — use Macie or S3 Access Analyzer to identify publicly accessible data.
