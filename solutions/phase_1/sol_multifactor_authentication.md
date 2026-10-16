# Multi-Factor Authentication - IAM and Identity Center

This solution enforces MFA across the organization using IAM policies, Identity Center configuration, and SCPs to deny actions without MFA.

## Recommended file structure

```
enforce-mfa/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "enforce_mfa_scp" {
  description = "Deploy SCP that denies actions without MFA"
  type        = bool
  default     = true
}

variable "grace_period_hours" {
  description = "Hours after account creation before MFA is enforced"
  type        = number
  default     = 24
}

variable "project" {
  default = "enforce-mfa"
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

# IAM Policy — deny all actions except MFA self-management without MFA
resource "aws_iam_policy" "require_mfa" {
  name        = "${var.project}-require-mfa"
  description = "Deny all actions except MFA setup when MFA is not present"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowViewAccountInfo"
        Effect = "Allow"
        Action = [
          "iam:GetAccountPasswordPolicy",
          "iam:ListVirtualMFADevices"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowManageOwnMFA"
        Effect = "Allow"
        Action = [
          "iam:CreateVirtualMFADevice",
          "iam:DeleteVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:ListMFADevices",
          "iam:ResyncMFADevice"
        ]
        Resource = [
          "arn:aws:iam::*:mfa/$${aws:username}",
          "arn:aws:iam::*:user/$${aws:username}"
        ]
      },
      {
        Sid    = "DenyAllExceptMFAManagementWithoutMFA"
        Effect = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ListVirtualMFADevices",
          "iam:ResyncMFADevice",
          "sts:GetSessionToken"
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = { "aws:MultiFactorAuthPresent" = "false" }
        }
      }
    ]
  })

  tags = var.tags
}

# SCP — require MFA for sensitive actions across the organization
resource "aws_organizations_policy" "require_mfa" {
  count = var.enforce_mfa_scp ? 1 : 0

  name        = "RequireMFAForSensitiveActions"
  description = "Deny sensitive actions without MFA across the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenySensitiveActionsWithoutMFA"
      Effect = "Deny"
      Action = [
        "iam:DeactivateMFADevice",
        "iam:DeleteUser",
        "iam:CreateUser",
        "organizations:LeaveOrganization",
        "organizations:DeleteOrganization",
        "ec2:StopInstances",
        "ec2:TerminateInstances",
        "rds:DeleteDBInstance",
        "rds:DeleteDBCluster"
      ]
      Resource = "*"
      Condition = {
        BoolIfExists = { "aws:MultiFactorAuthPresent" = "false" }
      }
    }]
  })
}

# IAM Identity Center MFA configuration
resource "aws_ssoadmin_instance_access_control_attributes" "mfa" {
  instance_arn = tolist(data.aws_ssoadmin_instances.this.arns)[0]

  attribute {
    key = "MFA"
    value {
      source = ["$${path:isMFAAuthenticated}"]
    }
  }
}

data "aws_ssoadmin_instances" "this" {}
```

---

## 3. `outputs.tf`

```bash
output "mfa_policy_arn" {
  description = "ARN of the IAM policy requiring MFA"
  value       = aws_iam_policy.require_mfa.arn
}

output "scp_id" {
  description = "ID of the MFA enforcement SCP"
  value       = var.enforce_mfa_scp ? aws_organizations_policy.require_mfa[0].id : "Not deployed"
}
```

---

## How to deploy

```bash
terraform init
terraform apply
```

## Important notes

- Prioritize MFA on **root accounts** and **privileged users** first.
- **Free virtual MFA** apps (Authy, Google Authenticator, Microsoft Authenticator) are sufficient for most use cases.
- For high-security accounts, use **hardware security keys** (FIDO2/WebAuthn).
- **IAM Identity Center** can enforce MFA natively in its settings — enable "Require MFA" for all users.
- Consider **adaptive authentication** that only prompts MFA on anomalous behavior (new device, unexpected location) for low-adoption scenarios.
- Verify compliance with **Security Hub controls IAM.4** (root MFA) and **IAM.5** (user MFA).
- For customer-facing apps, enforce MFA via **Amazon Cognito** on critical actions (password change, payment).
