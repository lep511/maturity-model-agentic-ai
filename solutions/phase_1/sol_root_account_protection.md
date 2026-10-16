# Root Account Protection - IAM and Organizations

This solution hardens root accounts across the organization by removing access keys, enforcing MFA, and blocking root actions in member accounts via SCPs.

## Recommended file structure

```
root-protection/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "block_root_in_members" {
  description = "Deploy SCP to block root actions in member accounts"
  type        = bool
  default     = true
}

variable "allow_root_for_tasks" {
  description = "Root-only tasks to allow (empty = block all)"
  type        = list(string)
  default     = []
}

variable "project" {
  default = "root-protection"
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

# SCP to deny all root actions in member accounts
resource "aws_organizations_policy" "deny_root" {
  count = var.block_root_in_members ? 1 : 0

  name        = "DenyRootUserActions"
  description = "Prevent root user usage in all member accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyRootUser"
      Effect    = "Deny"
      Action    = "*"
      Resource  = "*"
      Condition = {
        StringLike = {
          "aws:PrincipalArn" = "arn:aws:iam::*:root"
        }
      }
    }]
  })
}

# Attach SCP to the organization root (applies to all member accounts)
resource "aws_organizations_policy_attachment" "deny_root" {
  count = var.block_root_in_members ? 1 : 0

  policy_id = aws_organizations_policy.deny_root[0].id
  target_id = data.aws_organizations_organization.this.roots[0].id
}

data "aws_organizations_organization" "this" {}

# AWS Config rule to detect root access keys
resource "aws_config_config_rule" "no_root_access_keys" {
  name = "${var.project}-no-root-keys"

  source {
    owner             = "AWS"
    source_identifier = "IAM_ROOT_ACCESS_KEY_CHECK"
  }

  tags = var.tags
}

# AWS Config rule to verify root MFA
resource "aws_config_config_rule" "root_mfa" {
  name = "${var.project}-root-mfa"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }

  tags = var.tags
}

# AWS Config rule for hardware MFA on root
resource "aws_config_config_rule" "root_hardware_mfa" {
  name = "${var.project}-root-hardware-mfa"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_HARDWARE_MFA_ENABLED"
  }

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "scp_id" {
  description = "ID of the SCP blocking root actions in members"
  value       = var.block_root_in_members ? aws_organizations_policy.deny_root[0].id : "Not deployed"
}

output "config_rules" {
  description = "AWS Config rules monitoring root account security"
  value = [
    aws_config_config_rule.no_root_access_keys.name,
    aws_config_config_rule.root_mfa.name,
    aws_config_config_rule.root_hardware_mfa.name
  ]
}
```

---

## How to deploy

```bash
terraform init
terraform apply
```

## Manual steps (cannot be automated via Terraform)

1. **Remove root access keys** — In IAM console > Security credentials > Delete any active access keys
2. **Enable MFA on root** — Use a hardware key or virtual MFA app
3. **Implement two-person control** — One person holds the root password, another holds the MFA device
4. **Store credentials in a vault** — Use a physical safe or secrets manager with audit logging

## Important notes

- Root should be used **1-2 times in the lifetime** of an account (initial setup only).
- Root **bypasses all IAM policies and SCPs** — whoever has root credentials controls everything.
- In multi-account environments, **centralize or disable root** in member accounts using AWS Control Tower or this SCP.
- Verify with **Security Hub controls IAM.4** (root MFA), **IAM.9** (root access keys), and **IAM.6** (hardware MFA).
- Use **IAM Identity Center** with temporary credentials for all day-to-day access.
- Consider AWS Organizations **centralized root access** feature to eliminate the need for individual member account root credentials.
