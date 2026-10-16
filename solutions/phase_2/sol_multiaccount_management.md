# Multi-Account Management - AWS Control Tower

This solution deploys AWS Control Tower for a multi-account landing zone with centralized logging, audit, and security delegation.

## Recommended file structure

```
control-tower/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "governed_regions" {
  description = "Regions governed by Control Tower"
  type        = list(string)
  default     = ["us-east-1", "us-west-2"]
}

variable "logging_retention_days" {
  description = "CloudTrail log retention in days"
  type        = number
  default     = 365
}

variable "security_ou_name" {
  description = "Name of the Security OU"
  type        = string
  default     = "Security"
}

variable "workloads_ou_name" {
  description = "Name of the Workloads OU"
  type        = string
  default     = "Workloads"
}

variable "project" {
  default = "control-tower"
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

# Note: Control Tower itself is typically set up via the console.
# This Terraform manages the OU structure and delegated admin configuration.

# Organization structure
resource "aws_organizations_organizational_unit" "security" {
  name      = var.security_ou_name
  parent_id = data.aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = var.workloads_ou_name
  parent_id = data.aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = data.aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = data.aws_organizations_organization.this.roots[0].id
}

data "aws_organizations_organization" "this" {}

# Delegated administrators for security services
resource "aws_organizations_delegated_administrator" "securityhub" {
  account_id        = var.security_account_id
  service_principal = "securityhub.amazonaws.com"
}

resource "aws_organizations_delegated_administrator" "guardduty" {
  account_id        = var.security_account_id
  service_principal = "guardduty.amazonaws.com"
}

resource "aws_organizations_delegated_administrator" "inspector" {
  account_id        = var.security_account_id
  service_principal = "inspector2.amazonaws.com"
}

resource "aws_organizations_delegated_administrator" "macie" {
  account_id        = var.security_account_id
  service_principal = "macie.amazonaws.com"
}

resource "aws_organizations_delegated_administrator" "config" {
  account_id        = var.security_account_id
  service_principal = "config-multiaccountsetup.amazonaws.com"
}

variable "security_account_id" {
  description = "Account ID of the security/audit account"
  type        = string
}
```

---

## 3. Recommended Account Structure

```
Organization Root
├── Security OU
│   ├── Log Archive (centralized CloudTrail, Config, VPC Flow Logs)
│   ├── Audit/Security (delegated admin for GuardDuty, Security Hub, Inspector)
│   └── Backup (isolated backup vault)
│
├── Infrastructure OU
│   ├── Network (Transit Gateway, VPN, Direct Connect)
│   └── Shared Services (CI/CD, artifact repositories)
│
├── Workloads OU
│   ├── Production
│   ├── Staging
│   └── Development
│
└── Sandbox OU
    └── Individual developer/experiment accounts
```

---

## 4. `outputs.tf`

```bash
output "security_ou_id" {
  description = "Security OU ID"
  value       = aws_organizations_organizational_unit.security.id
}

output "workloads_ou_id" {
  description = "Workloads OU ID"
  value       = aws_organizations_organizational_unit.workloads.id
}

output "delegated_admins" {
  description = "Services with delegated administration"
  value       = ["securityhub", "guardduty", "inspector", "macie", "config"]
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="security_account_id=123456789012"
```

## Important notes

- **AWS Control Tower** automates landing zone setup (CloudTrail, Config, SCPs, core accounts) — use the console for initial setup, then manage with Terraform.
- **Isolate workloads across accounts** — one account per environment/workload reduces blast radius.
- **Core accounts** (logging, audit, backup, networking) must be separate from workload accounts.
- Use **delegated administration** so the security team gets org-wide visibility without needing management account access.
- **Landing Zone Accelerator** (LZA) is an alternative if Control Tower is too restrictive or you need customization.
- Key services supporting delegated admin: GuardDuty, Security Hub, Inspector, Macie, Config, Firewall Manager.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/multi-account-management/).
