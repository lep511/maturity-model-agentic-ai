# Advanced DDoS Mitigation (L7) - AWS Shield Advanced

This solution enables Shield Advanced with automatic L7 DDoS protection, DDoS Response Team access, and Firewall Manager integration for organization-wide coverage.

## Recommended file structure

```
shield-advanced/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "protected_resources" {
  description = "ARNs of resources to protect (ALBs, CloudFront, API Gateway, EIPs)"
  type        = list(string)
}

variable "emergency_contact_email" {
  description = "Email for DDoS Response Team engagement"
  type        = string
}

variable "emergency_contact_phone" {
  description = "Phone for DDoS Response Team engagement"
  type        = string
}

variable "enable_automatic_response" {
  description = "Enable automatic application-layer DDoS mitigation"
  type        = bool
  default     = true
}

variable "project" {
  default = "shield-advanced"
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

# Enable Shield Advanced subscription
resource "aws_shield_subscription" "this" {}

# Emergency contacts for DDoS Response Team
resource "aws_shield_drt_access_role_arn_association" "this" {
  role_arn = aws_iam_role.drt.arn
}

resource "aws_iam_role" "drt" {
  name = "${var.project}-drt-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "drt.shield.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "drt" {
  role       = aws_iam_role.drt.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSShieldDRTAccessPolicy"
}

# Protect resources
resource "aws_shield_protection" "resources" {
  for_each = toset(var.protected_resources)

  name         = "protect-${replace(each.value, "/[^a-zA-Z0-9]/", "-")}"
  resource_arn = each.value

  tags = var.tags
}

# Health checks for automatic mitigation
resource "aws_route53_health_check" "main" {
  for_each = toset(var.protected_resources)

  type              = "CLOUDWATCH_METRIC"
  insufficient_data_health_status = "Healthy"

  cloudwatch_alarm_region = "us-east-1"
  cloudwatch_alarm_name   = "${var.project}-health-${index(var.protected_resources, each.value)}"

  tags = var.tags
}

# Protection Group — group related resources for consolidated monitoring
resource "aws_shield_protection_group" "all" {
  protection_group_id = "${var.project}-all-resources"
  aggregation         = "MAX"
  pattern             = "ALL"

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "subscription_state" {
  description = "Shield Advanced subscription state"
  value       = "ACTIVE"
}

output "protected_resource_count" {
  description = "Number of protected resources"
  value       = length(var.protected_resources)
}

output "drt_role_arn" {
  description = "DRT access role ARN"
  value       = aws_iam_role.drt.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var='protected_resources=["arn:aws:elasticloadbalancing:us-east-1:123:loadbalancer/app/my-alb/xxx"]' \
  -var="emergency_contact_email=security@yourcompany.com" \
  -var="emergency_contact_phone=+1-555-0100"
```

## Important notes

- Shield Advanced costs **$3,000/month** (commitment) plus data transfer fees — evaluate cost-benefit for your workloads.
- Includes **24x7 DDoS Response Team (DRT)** access for expert assistance during attacks.
- **Cost protection** credits back charges caused by DDoS-related scaling during an attack.
- **Automatic L7 mitigation** creates WAF rules in real-time based on attack patterns — associate health checks for faster detection.
- Shield Standard (free, default) covers L3/L4 only — it does NOT protect against HTTP floods or application-layer attacks.
- Use **Firewall Manager** to automatically protect all new ALBs and API Gateways across the organization.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/shield-advanced/).
