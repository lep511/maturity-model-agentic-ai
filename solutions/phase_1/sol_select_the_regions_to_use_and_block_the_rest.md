# Select Regions and Block the Rest - AWS Organizations and Control Tower

This solution restricts AWS usage to approved regions using Service Control Policies (SCPs), reducing attack surface and ensuring compliance with data residency requirements.

## Recommended file structure

```
region-restriction/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "allowed_regions" {
  description = "List of AWS regions where resources can be created"
  type        = list(string)
  default     = ["us-east-1", "us-west-2"]
}

variable "global_services_exceptions" {
  description = "Actions for global services that must be allowed regardless of region"
  type        = list(string)
  default = [
    "iam:*",
    "organizations:*",
    "route53:*",
    "budgets:*",
    "waf:*",
    "cloudfront:*",
    "globalaccelerator:*",
    "importexport:*",
    "support:*",
    "sts:*",
    "health:*"
  ]
}

variable "target_ou_id" {
  description = "Organizational Unit ID to attach the SCP (leave empty for root)"
  type        = string
  default     = ""
}

variable "project" {
  default = "region-restriction"
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

data "aws_organizations_organization" "this" {}

# SCP to deny actions in non-approved regions
resource "aws_organizations_policy" "region_restriction" {
  name        = "RestrictToApprovedRegions"
  description = "Deny resource creation in non-approved regions"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonApprovedRegions"
        Effect    = "Deny"
        NotAction = var.global_services_exceptions
        Resource  = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      }
    ]
  })
}

# Attach SCP to target OU or organization root
resource "aws_organizations_policy_attachment" "region_restriction" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = var.target_ou_id != "" ? var.target_ou_id : data.aws_organizations_organization.this.roots[0].id
}
```

---

## 3. `outputs.tf`

```bash
output "scp_id" {
  description = "ID of the region restriction SCP"
  value       = aws_organizations_policy.region_restriction.id
}

output "allowed_regions" {
  description = "Regions where resource creation is allowed"
  value       = var.allowed_regions
}

output "target_id" {
  description = "OU or root where the SCP is attached"
  value       = aws_organizations_policy_attachment.region_restriction.target_id
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var='allowed_regions=["us-east-1","eu-west-1"]'

# Attach to a specific OU instead of root:
terraform apply \
  -var='allowed_regions=["us-east-1","eu-west-1"]' \
  -var="target_ou_id=ou-xxxx-yyyyyyyy"
```

## Important notes

- **Global services** (IAM, Route 53, CloudFront, Organizations) operate in us-east-1 regardless — they must be excluded from region restrictions.
- If using **AWS Control Tower**, region restriction is configured directly in the Landing Zone settings without custom SCPs.
- Limiting regions **reduces attack surface** — adversaries often launch resources in unused regions to avoid detection.
- Ensure your **allowed regions list** includes regions used by global services (us-east-1 is typically required).
- Review existing resources in all regions **before applying** the SCP to avoid disrupting running workloads.
- Test by applying the SCP to a **sandbox OU first** before organization-wide deployment.
- Some services (S3 replication, DynamoDB global tables) may need cross-region access — add exceptions as needed.
