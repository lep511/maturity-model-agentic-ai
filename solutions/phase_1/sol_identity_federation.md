# Identity Federation - IAM Identity Center

This solution configures AWS IAM Identity Center as the centralized identity provider with temporary credentials, replacing IAM users and long-lived access keys.

## Recommended file structure

```
identity-center/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "session_duration" {
  description = "Maximum session duration (e.g., PT8H for 8 hours)"
  type        = string
  default     = "PT8H"
}

variable "permission_sets" {
  description = "Map of permission sets to create"
  type = map(object({
    description      = string
    session_duration = optional(string, "PT4H")
    managed_policies = list(string)
  }))
  default = {
    admin = {
      description      = "Full administrator access"
      session_duration = "PT1H"
      managed_policies = ["arn:aws:iam::aws:policy/AdministratorAccess"]
    }
    readonly = {
      description      = "Read-only access across all services"
      session_duration = "PT8H"
      managed_policies = ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
    }
    security_audit = {
      description      = "Security audit and investigation access"
      session_duration = "PT4H"
      managed_policies = ["arn:aws:iam::aws:policy/SecurityAudit"]
    }
  }
}

variable "project" {
  default = "identity-center"
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

# Get Identity Center instance
data "aws_ssoadmin_instances" "this" {}

locals {
  instance_arn = tolist(data.aws_ssoadmin_instances.this.arns)[0]
  identity_store_id = tolist(data.aws_ssoadmin_instances.this.identity_store_ids)[0]
}

# Permission Sets
resource "aws_ssoadmin_permission_set" "this" {
  for_each = var.permission_sets

  name             = each.key
  description      = each.value.description
  instance_arn     = local.instance_arn
  session_duration = each.value.session_duration

  tags = var.tags
}

# Attach managed policies to permission sets
resource "aws_ssoadmin_managed_policy_attachment" "this" {
  for_each = { for item in flatten([
    for ps_key, ps in var.permission_sets : [
      for policy in ps.managed_policies : {
        key    = "${ps_key}-${policy}"
        ps_key = ps_key
        policy = policy
      }
    ]
  ]) : item.key => item }

  instance_arn       = local.instance_arn
  managed_policy_arn = each.value.policy
  permission_set_arn = aws_ssoadmin_permission_set.this[each.value.ps_key].arn
}

# Security Group for Identity Center (example)
resource "aws_identitystore_group" "security" {
  identity_store_id = local.identity_store_id
  display_name      = "SecurityTeam"
  description       = "Security team members"
}

resource "aws_identitystore_group" "developers" {
  identity_store_id = local.identity_store_id
  display_name      = "Developers"
  description       = "Development team members"
}
```

---

## 3. `outputs.tf`

```bash
output "instance_arn" {
  description = "IAM Identity Center instance ARN"
  value       = local.instance_arn
}

output "identity_store_id" {
  description = "Identity Store ID"
  value       = local.identity_store_id
}

output "permission_set_arns" {
  description = "ARNs of created permission sets"
  value       = { for k, v in aws_ssoadmin_permission_set.this : k => v.arn }
}
```

---

## How to deploy

```bash
terraform init
terraform apply
```

## External IdP integration

To connect an external identity provider (Okta, Azure AD, Google Workspace):

1. In the IAM Identity Center console, go to **Settings > Identity source > Change identity source**
2. Select **External identity provider**
3. Upload the IdP SAML metadata or configure SCIM for automatic user/group synchronization
4. Map IdP groups to AWS permission sets and accounts

## Important notes

- **IAM Identity Center replaces IAM users** — employees authenticate via a centralized IdP and receive temporary credentials.
- The **built-in directory** is sufficient if no external IdP exists — you can migrate to an external IdP later.
- Integrate the identity repository with **HR systems** to automatically revoke access when employees leave.
- Use **short session durations** for privileged access (1 hour for admin, 4-8 hours for read-only).
- IAM Identity Center is **free** — no additional cost beyond standard AWS usage.
- Delete existing **IAM users and access keys** as you migrate teams to Identity Center.
- Enable **MFA enforcement** within Identity Center settings.
