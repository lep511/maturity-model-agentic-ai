# Instance Metadata Service (IMDS) v2 - Amazon EC2

This solution enforces IMDSv2 across all EC2 instances using account-level defaults, Config rules for compliance monitoring, and SCPs to prevent IMDSv1 launches.

## Recommended file structure

```
imdsv2-enforcement/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "enforce_via_scp" {
  description = "Deploy SCP to deny EC2 launches with IMDSv1"
  type        = bool
  default     = true
}

variable "hop_limit" {
  description = "Metadata token hop limit (1 for instances, 2 for containers)"
  type        = number
  default     = 2
}

variable "project" {
  default = "imdsv2-enforcement"
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

# Set IMDSv2 as the account-level default for all new instances
resource "aws_ec2_instance_metadata_defaults" "this" {
  http_tokens                 = "required"
  http_put_response_hop_limit = var.hop_limit
  http_endpoint               = "enabled"
}

# Config Rule to detect non-compliant instances
resource "aws_config_config_rule" "imdsv2" {
  name = "${var.project}-check"

  source {
    owner             = "AWS"
    source_identifier = "EC2_IMDSV2_CHECK"
  }

  tags = var.tags
}

# SCP to prevent launching instances with IMDSv1
resource "aws_organizations_policy" "enforce_imdsv2" {
  count = var.enforce_via_scp ? 1 : 0

  name        = "EnforceIMDSv2"
  description = "Deny EC2 RunInstances unless IMDSv2 is required"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyIMDSv1Launches"
      Effect   = "Deny"
      Action   = "ec2:RunInstances"
      Resource = "arn:aws:ec2:*:*:instance/*"
      Condition = {
        StringNotEquals = {
          "ec2:MetadataHttpTokens" = "required"
        }
      }
    },
    {
      Sid      = "DenyModifyToIMDSv1"
      Effect   = "Deny"
      Action   = "ec2:ModifyInstanceMetadataOptions"
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "ec2:MetadataHttpTokens" = "required"
        }
      }
    }]
  })
}

# SSM Automation to remediate existing IMDSv1 instances
resource "aws_ssm_document" "enforce_imdsv2" {
  name            = "${var.project}-remediate"
  document_type   = "Automation"
  document_format = "YAML"

  content = yamlencode({
    schemaVersion = "0.3"
    description   = "Enforce IMDSv2 on existing EC2 instances"
    parameters = {
      InstanceId = {
        type        = "String"
        description = "EC2 Instance ID to remediate"
      }
    }
    mainSteps = [{
      name   = "enforceIMDSv2"
      action = "aws:executeAwsApi"
      inputs = {
        Service = "ec2"
        Api     = "ModifyInstanceMetadataOptions"
        InstanceId = "{{ InstanceId }}"
        HttpTokens = "required"
        HttpPutResponseHopLimit = var.hop_limit
      }
    }]
  })

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "config_rule_name" {
  description = "Config rule monitoring IMDSv2 compliance"
  value       = aws_config_config_rule.imdsv2.name
}

output "scp_id" {
  description = "SCP enforcing IMDSv2 (if deployed)"
  value       = var.enforce_via_scp ? aws_organizations_policy.enforce_imdsv2[0].id : "Not deployed"
}

output "remediation_document" {
  description = "SSM document for remediating existing instances"
  value       = aws_ssm_document.enforce_imdsv2.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply

# For container workloads (need hop limit 2):
terraform apply -var="hop_limit=2"
```

## Migrating existing instances

To find and remediate instances still using IMDSv1:

```bash
# Find instances using IMDSv1
aws ec2 describe-instances \
  --filters "Name=metadata-options.http-tokens,Values=optional" \
  --query "Reservations[].Instances[].InstanceId" --output text

# Migrate a specific instance to IMDSv2
aws ec2 modify-instance-metadata-options \
  --instance-id i-xxxxx \
  --http-tokens required \
  --http-put-response-hop-limit 2
```

## Important notes

- **IMDSv2 prevents SSRF-based credential theft** — the primary risk with IMDSv1.
- AWS made IMDSv2 the default for new launches from mid-2024, but **older instances may still use IMDSv1**.
- Set hop limit to **2 for containerized workloads** (Docker, ECS) — containers need the extra hop to reach IMDS.
- Verify compliance with **Security Hub control EC2.8** or Config rule `ec2-imdsv2-check`.
- The SCP prevents anyone from launching or reverting instances to IMDSv1.
- Use the SSM Automation document to remediate existing non-compliant instances at scale.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/imdsv2/).
