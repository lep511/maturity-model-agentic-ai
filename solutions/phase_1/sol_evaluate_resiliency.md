# Evaluate Resiliency - AWS Resilience Hub

This solution configures AWS Resilience Hub to assess critical workloads against defined RTO/RPO targets and identify gaps in resilience posture.

## Recommended file structure

```
resilience-hub/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "app_name" {
  description = "Name of the application to assess"
  type        = string
}

variable "app_arn" {
  description = "ARN of the application (CloudFormation stack, Resource Group, or AppRegistry)"
  type        = string
}

variable "rto_seconds" {
  description = "Recovery Time Objective in seconds"
  type        = number
  default     = 3600
}

variable "rpo_seconds" {
  description = "Recovery Point Objective in seconds"
  type        = number
  default     = 3600
}

variable "project" {
  default = "resilience-hub"
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

# Resilience Hub application
resource "aws_resiliencehub_app" "this" {
  name = var.app_name

  app_template_body = jsonencode({
    resources = []
    appComponents = []
  })

  permission_model {
    type = "LegacyIAMUser"
  }

  tags = var.tags
}

# Resiliency policy defining RTO/RPO targets
resource "aws_resiliencehub_resiliency_policy" "this" {
  name        = "${var.project}-policy"
  description = "Resiliency targets for ${var.app_name}"
  tier        = "MissionCritical"

  policy {
    az {
      rpo = var.rpo_seconds
      rto = var.rto_seconds
    }
    hardware {
      rpo = var.rpo_seconds
      rto = var.rto_seconds
    }
    software {
      rpo = var.rpo_seconds
      rto = var.rto_seconds
    }
    region {
      rpo = var.rpo_seconds * 4
      rto = var.rto_seconds * 4
    }
  }

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "app_arn" {
  description = "ARN of the Resilience Hub application"
  value       = aws_resiliencehub_app.this.arn
}

output "policy_arn" {
  description = "ARN of the resiliency policy"
  value       = aws_resiliencehub_resiliency_policy.this.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="app_name=my-critical-app" \
  -var="app_arn=arn:aws:cloudformation:us-east-1:123456789012:stack/my-app/xxx" \
  -var="rto_seconds=1800" \
  -var="rpo_seconds=900"
```

## Post-deployment steps

After deploying the Terraform resources:

1. **Import resources** — In the Resilience Hub console, import the application's resources from CloudFormation, Terraform state, Resource Groups, or EKS clusters.
2. **Run assessment** — Trigger a resiliency assessment to identify gaps between current architecture and RTO/RPO targets.
3. **Review recommendations** — Resilience Hub provides specific architectural improvements (Multi-AZ, additional replicas, cross-region backups) with cost estimates.
4. **Schedule recurring assessments** — Run assessments after each infrastructure change to catch regressions.

## Important notes

- Define **clear RTO/RPO requirements from the business** before assessment — without targets, you cannot measure gaps.
- Resilience Hub estimates the **cost of improvements** (Multi-AZ, Multi-Region, additional replicas) so business stakeholders can make informed investment decisions.
- CISOs are often held accountable for resilience failures — address gaps **proactively** before an outage.
- Integrate assessments into your **CI/CD pipeline** to catch resilience regressions on infrastructure changes.
- Supports applications defined in CloudFormation, Terraform, Resource Groups, AppRegistry, or EKS.
