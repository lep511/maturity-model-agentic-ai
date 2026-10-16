# Data Encryption at Rest - AWS KMS

This solution configures customer-managed KMS keys with automatic rotation and uses them as defaults for EBS, RDS, S3, and other services.

## Recommended file structure

```
kms-encryption/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "key_administrators" {
  description = "IAM ARNs allowed to administer (but not use) the key"
  type        = list(string)
}

variable "key_users" {
  description = "IAM ARNs allowed to use the key for encryption/decryption"
  type        = list(string)
}

variable "enable_rotation" {
  description = "Enable automatic key rotation"
  type        = bool
  default     = true
}

variable "rotation_period_days" {
  description = "Rotation period in days (90-2560)"
  type        = number
  default     = 365
}

variable "enable_ebs_default" {
  description = "Set KMS key as the default for EBS encryption"
  type        = bool
  default     = true
}

variable "project" {
  default = "kms-encryption"
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

# Customer-managed KMS key
resource "aws_kms_key" "main" {
  description             = "Customer-managed key for data encryption at rest"
  deletion_window_in_days = 30
  enable_key_rotation     = var.enable_rotation
  rotation_period_in_days = var.rotation_period_days
  multi_region            = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = { AWS = var.key_administrators }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowKeyUsage"
        Effect = "Allow"
        Principal = { AWS = var.key_users }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowAWSServices"
        Effect = "Allow"
        Principal = { AWS = var.key_users }
        Action = [
          "kms:CreateGrant",
          "kms:ListGrants",
          "kms:RevokeGrant"
        ]
        Resource = "*"
        Condition = {
          Bool = { "kms:GrantIsForAWSResource" = "true" }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project}"
  target_key_id = aws_kms_key.main.key_id
}

# Enable EBS encryption by default with this key
resource "aws_ebs_encryption_by_default" "this" {
  count   = var.enable_ebs_default ? 1 : 0
  enabled = true
}

resource "aws_ebs_default_kms_key" "this" {
  count   = var.enable_ebs_default ? 1 : 0
  key_arn = aws_kms_key.main.arn
}
```

---

## 3. `outputs.tf`

```bash
output "key_arn" {
  description = "ARN of the customer-managed KMS key"
  value       = aws_kms_key.main.arn
}

output "key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.main.key_id
}

output "key_alias" {
  description = "Alias of the KMS key"
  value       = aws_kms_alias.main.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var='key_administrators=["arn:aws:iam::123456789012:role/SecurityAdmin"]' \
  -var='key_users=["arn:aws:iam::123456789012:role/AppRole","arn:aws:iam::123456789012:role/IRTeam"]'
```

## Important notes

- Use **customer-managed keys** (not AWS-managed) for: key disable capability, cross-account sharing (IR team access), and custom rotation intervals.
- Detect unencrypted resources with **Security Hub controls** EC2.3, RDS.3, DynamoDB.1, EFS.1, OpenSearch.1.
- **Avoid importing external key material** or using external key stores unless strictly required — they introduce durability and security risks.
- Use **KMS over CloudHSM** unless a dedicated HSM is specifically required by compliance.
- Share keys cross-account (e.g., with IR team) by adding their role ARN to the key policy.
- Enable EBS encryption by default to ensure **all new volumes** are automatically encrypted.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/kms/).
