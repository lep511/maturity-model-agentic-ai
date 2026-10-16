# GuardRails: Organizational Policies with SCPs/RCPs - AWS Organizations

This solution deploys a set of baseline Service Control Policies (SCPs) and Resource Control Policies (RCPs) to enforce security invariants across the organization.

## Recommended file structure

```
org-guardrails/
├── main.tf
├── scps.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "allowed_regions" {
  description = "Regions where resource creation is allowed"
  type        = list(string)
  default     = ["us-east-1", "us-west-2"]
}

variable "target_ou_ids" {
  description = "OU IDs to attach SCPs (workload OUs)"
  type        = list(string)
}

variable "denied_instance_types" {
  description = "EC2 instance types to block (e.g., expensive GPU instances)"
  type        = list(string)
  default     = ["p4d.24xlarge", "p3.16xlarge", "p3dn.24xlarge"]
}

variable "project" {
  default = "org-guardrails"
}

variable "tags" {
  default = {}
}
```

---

## 2. `scps.tf`

```bash
# SCP: Prevent member accounts from leaving the organization
resource "aws_organizations_policy" "deny_leave_org" {
  name        = "DenyLeaveOrganization"
  description = "Prevent accounts from leaving the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyLeaveOrg"
      Effect   = "Deny"
      Action   = "organizations:LeaveOrganization"
      Resource = "*"
    }]
  })
}

# SCP: Deny root user actions in member accounts
resource "aws_organizations_policy" "deny_root" {
  name        = "DenyRootActions"
  description = "Block root user from performing actions in member accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyRootUser"
      Effect    = "Deny"
      Action    = "*"
      Resource  = "*"
      Condition = {
        StringLike = { "aws:PrincipalArn" = "arn:aws:iam::*:root" }
      }
    }]
  })
}

# SCP: Deny unauthorized instance types
resource "aws_organizations_policy" "deny_instance_types" {
  name        = "DenyUnauthorizedInstances"
  description = "Block expensive or unauthorized EC2 instance types"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyExpensiveInstances"
      Effect    = "Deny"
      Action    = "ec2:RunInstances"
      Resource  = "arn:aws:ec2:*:*:instance/*"
      Condition = {
        StringEquals = { "ec2:InstanceType" = var.denied_instance_types }
      }
    }]
  })
}

# SCP: Protect CloudTrail and Config from tampering
resource "aws_organizations_policy" "protect_security_services" {
  name        = "ProtectSecurityServices"
  description = "Prevent disabling or deleting security service configurations"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ProtectSecurityBaseline"
      Effect = "Deny"
      Action = [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "config:StopConfigurationRecorder",
        "config:DeleteConfigurationRecorder",
        "guardduty:DeleteDetector",
        "guardduty:DisableOrganizationAdminAccount",
        "securityhub:DisableSecurityHub",
        "access-analyzer:DeleteAnalyzer"
      ]
      Resource = "*"
    }]
  })
}

# SCP: Deny non-approved regions
resource "aws_organizations_policy" "region_restriction" {
  name        = "RestrictRegions"
  description = "Restrict resource creation to approved regions"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyNonApprovedRegions"
      Effect = "Deny"
      NotAction = [
        "iam:*",
        "organizations:*",
        "route53:*",
        "budgets:*",
        "waf:*",
        "cloudfront:*",
        "globalaccelerator:*",
        "support:*",
        "sts:*",
        "health:*"
      ]
      Resource = "*"
      Condition = {
        StringNotEquals = { "aws:RequestedRegion" = var.allowed_regions }
      }
    }]
  })
}
```

---

## 3. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# Attach all SCPs to target OUs
locals {
  scp_ids = [
    aws_organizations_policy.deny_leave_org.id,
    aws_organizations_policy.deny_root.id,
    aws_organizations_policy.deny_instance_types.id,
    aws_organizations_policy.protect_security_services.id,
    aws_organizations_policy.region_restriction.id,
  ]

  attachments = flatten([
    for ou_id in var.target_ou_ids : [
      for scp_id in local.scp_ids : {
        ou_id  = ou_id
        scp_id = scp_id
      }
    ]
  ])
}

resource "aws_organizations_policy_attachment" "scps" {
  for_each = { for idx, att in local.attachments : "${att.ou_id}-${att.scp_id}" => att }

  policy_id = each.value.scp_id
  target_id = each.value.ou_id
}
```

---

## 4. `outputs.tf`

```bash
output "scp_ids" {
  description = "IDs of deployed SCPs"
  value = {
    deny_leave_org           = aws_organizations_policy.deny_leave_org.id
    deny_root                = aws_organizations_policy.deny_root.id
    deny_instance_types      = aws_organizations_policy.deny_instance_types.id
    protect_security_services = aws_organizations_policy.protect_security_services.id
    region_restriction       = aws_organizations_policy.region_restriction.id
  }
}

output "attached_ous" {
  description = "OUs where SCPs are attached"
  value       = var.target_ou_ids
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var='target_ou_ids=["ou-xxxx-workloads","ou-yyyy-sandbox"]'
```

## Important notes

- SCPs **do not grant permissions** — they only restrict the maximum permissions IAM can grant.
- SCPs apply to **all identities in the account, including root** (except the management account).
- **RCPs** are resource-centric (control which identities can access your resources) — use for cross-account scenarios.
- The management account is **never affected by SCPs** — keep it clean and use delegated administration.
- Test SCPs in a **sandbox OU first** before applying to production accounts.
- Review the [AWS SCP examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html) for additional patterns.
- Both services are **free** — no additional cost.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/guardrails/).
