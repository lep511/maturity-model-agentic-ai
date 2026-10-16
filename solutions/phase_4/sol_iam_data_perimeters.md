# IAM Data Perimeters - SCPs and RCPs

This solution implements data perimeters using SCPs and RCPs to enforce three invariants: trusted identities, trusted resources, and expected networks.

## Recommended file structure

```
data-perimeters/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "organization_id" {
  description = "AWS Organization ID (o-xxxxxxxxxx)"
  type        = string
}

variable "trusted_vpce_ids" {
  description = "VPC endpoint IDs considered trusted network origins"
  type        = list(string)
  default     = []
}

variable "trusted_org_paths" {
  description = "Organization paths for trusted identities"
  type        = list(string)
  default     = []
}

variable "project" {
  default = "data-perimeters"
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

# RCP: Only trusted identities can access your resources
resource "aws_organizations_policy" "trusted_identities" {
  name        = "DataPerimeter-TrustedIdentities"
  description = "Only identities from this organization can access resources"
  type        = "RESOURCE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "EnforceTrustedIdentities"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = "*"
      Condition = {
        StringNotEquals = {
          "aws:PrincipalOrgID" = var.organization_id
        }
        Bool = {
          "aws:PrincipalIsAWSService" = "false"
        }
      }
    }]
  })
}

# SCP: Only trusted resources are accessed (prevent exfiltration to external accounts)
resource "aws_organizations_policy" "trusted_resources" {
  name        = "DataPerimeter-TrustedResources"
  description = "Prevent data transfer to resources outside the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyExternalResourceAccess"
      Effect = "Deny"
      Action = [
        "s3:PutObject",
        "s3:GetObject"
      ]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "aws:ResourceOrgID" = var.organization_id
        }
        "ForAnyValue:StringNotLike" = {
          "aws:CalledVia" = ["cloudformation.amazonaws.com"]
        }
      }
    }]
  })
}

# SCP: Access only from expected networks
resource "aws_organizations_policy" "expected_networks" {
  count = length(var.trusted_vpce_ids) > 0 ? 1 : 0

  name        = "DataPerimeter-ExpectedNetworks"
  description = "Restrict S3 access to trusted VPC endpoints only"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyAccessFromUntrustedNetworks"
      Effect = "Deny"
      Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "aws:SourceVpce" = var.trusted_vpce_ids
        }
        Bool = {
          "aws:ViaAWSService" = "false"
        }
      }
    }]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "trusted_identities_policy_id" {
  description = "RCP for trusted identities"
  value       = aws_organizations_policy.trusted_identities.id
}

output "trusted_resources_policy_id" {
  description = "SCP for trusted resources"
  value       = aws_organizations_policy.trusted_resources.id
}

output "expected_networks_policy_id" {
  description = "SCP for expected networks (if deployed)"
  value       = length(var.trusted_vpce_ids) > 0 ? aws_organizations_policy.expected_networks[0].id : "Not deployed"
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="organization_id=o-xxxxxxxxxx"

# With network perimeter:
terraform apply \
  -var="organization_id=o-xxxxxxxxxx" \
  -var='trusted_vpce_ids=["vpce-aaa","vpce-bbb"]'
```

## Important notes

- Data perimeters enforce **three invariants**: only trusted identities access your resources, only trusted resources are accessed, and access only from expected networks.
- Implemented via **SCPs and RCPs** using IAM condition keys — both are free.
- Treat implementation as a **risk-based journey**: perform threat analysis, prioritize perimeter types by risk, and iterate.
- Key condition keys: `aws:PrincipalOrgID`, `aws:ResourceOrgID`, `aws:SourceVpce`, `aws:PrincipalIsAWSService`.
- Data perimeters **complement** fine-grained access controls — they provide always-on boundaries against credential-based exfiltration.
- Test in **sandbox accounts** before applying to production — overly restrictive perimeters can break AWS service integrations.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/data-perimeters/).
