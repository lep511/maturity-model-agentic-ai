# Use Infrastructure as Code - CloudFormation / Terraform

This solution establishes IaC practices with CloudFormation Guard for compliance validation in CI/CD and enforces IaC-only deployments via SCPs.

## Recommended file structure

```
iac-governance/
├── main.tf
├── guard-rules/
│   ├── encryption.guard
│   └── public-access.guard
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "deny_console_changes" {
  description = "Deploy SCP to deny manual console changes to critical services"
  type        = bool
  default     = false
}

variable "pipeline_role_name" {
  description = "IAM role name used by CI/CD pipeline (exempt from SCP)"
  type        = string
  default     = "cicd-pipeline-role"
}

variable "project" {
  default = "iac-governance"
}

variable "tags" {
  default = {}
}
```

---

## 2. `guard-rules/encryption.guard`

```
# CloudFormation Guard rule: all EBS volumes must be encrypted
let ebs_volumes = Resources.*[ Type == 'AWS::EC2::Volume' ]

rule ebs_encryption_required when %ebs_volumes !empty {
  %ebs_volumes.Properties.Encrypted == true
  <<
    VIOLATION: EBS volumes must be encrypted.
    FIX: Set 'Encrypted: true' on all AWS::EC2::Volume resources.
  >>
}

# All RDS instances must be encrypted
let rds_instances = Resources.*[ Type == 'AWS::RDS::DBInstance' ]

rule rds_encryption_required when %rds_instances !empty {
  %rds_instances.Properties.StorageEncrypted == true
  <<
    VIOLATION: RDS instances must have StorageEncrypted enabled.
  >>
}
```

---

## 3. `guard-rules/public-access.guard`

```
# S3 buckets must not have public access
let s3_buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]

rule s3_no_public_access when %s3_buckets !empty {
  %s3_buckets.Properties.PublicAccessBlockConfiguration exists
  %s3_buckets.Properties.PublicAccessBlockConfiguration.BlockPublicAcls == true
  %s3_buckets.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy == true
  <<
    VIOLATION: S3 buckets must have PublicAccessBlockConfiguration enabled.
  >>
}

# Security Groups must not allow 0.0.0.0/0 on SSH
let security_groups = Resources.*[ Type == 'AWS::EC2::SecurityGroup' ]

rule no_open_ssh when %security_groups !empty {
  %security_groups.Properties.SecurityGroupIngress[*] {
    when FromPort == 22 OR ToPort == 22 {
      CidrIp != '0.0.0.0/0'
      <<
        VIOLATION: SSH (port 22) must not be open to 0.0.0.0/0.
      >>
    }
  }
}
```

---

## 4. Pipeline Integration (buildspec)

```yaml
version: 0.2

phases:
  install:
    commands:
      - curl -L https://github.com/aws-cloudformation/cloudformation-guard/releases/latest/download/cfn-guard-v3-x86_64-unknown-linux-gnu.tar.gz | tar xz
      - mv cfn-guard /usr/local/bin/

  pre_build:
    commands:
      # Validate CloudFormation templates
      - |
        for template in templates/*.yaml; do
          echo "Validating $template..."
          cfn-guard validate \
            --data "$template" \
            --rules guard-rules/ \
            --show-summary fail
          if [ $? -ne 0 ]; then
            echo "COMPLIANCE FAILURE: $template"
            exit 1
          fi
        done

      # Validate Terraform plans
      - terraform init && terraform plan -out=plan.out
      - terraform show -json plan.out > plan.json
      - cfn-guard validate --data plan.json --rules guard-rules/ --show-summary fail

  build:
    commands:
      - echo "All compliance checks passed. Deploying..."
      - terraform apply -auto-approve plan.out
```

---

## 5. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# SCP to deny manual console changes (optional, aggressive)
resource "aws_organizations_policy" "deny_console" {
  count = var.deny_console_changes ? 1 : 0

  name        = "DenyManualChanges"
  description = "Deny resource modifications unless via CI/CD pipeline role"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyUnlessPipeline"
      Effect = "Deny"
      Action = [
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance",
        "s3:CreateBucket",
        "s3:DeleteBucket"
      ]
      Resource = "*"
      Condition = {
        StringNotLike = {
          "aws:PrincipalArn" = "arn:aws:iam::*:role/${var.pipeline_role_name}"
        }
      }
    }]
  })
}
```

---

## 6. `outputs.tf`

```bash
output "scp_id" {
  description = "SCP denying manual console changes (if deployed)"
  value       = var.deny_console_changes ? aws_organizations_policy.deny_console[0].id : "Not deployed"
}

output "guard_rules_path" {
  description = "Path to CloudFormation Guard rules"
  value       = "${path.module}/guard-rules/"
}
```

---

## How to deploy

```bash
terraform init
terraform apply

# With console lockdown:
terraform apply -var="deny_console_changes=true" -var="pipeline_role_name=my-cicd-role"
```

## Important notes

- IaC enables **versioned, repeatable, auditable** infrastructure — critical for governance and rapid recovery.
- Integrate **CloudFormation Guard** into CI/CD to block non-compliant deployments **before** they reach AWS.
- Use **Terraform, CloudFormation, or CDK** for all infrastructure — zero manual console changes in production.
- Adopt IaC early — **retrofitting templates onto existing infrastructure** is significantly harder.
- A compromised environment can be **fully rebuilt from code** if IaC coverage is complete.
- The SCP enforcing IaC-only changes is aggressive — start with alerting before blocking.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/infrastructure-as-code/).
