# Zero Trust Access - AWS Verified Access

This solution deploys AWS Verified Access to provide VPN-less access to internal applications using identity + device trust signals evaluated via Cedar policies.

## Recommended file structure

```
zero-trust/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_id" {
  description = "VPC ID where internal applications reside"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for Verified Access endpoints"
  type        = list(string)
}

variable "idp_oidc_issuer" {
  description = "OIDC issuer URL from your Identity Provider (Okta, Azure AD)"
  type        = string
}

variable "idp_client_id" {
  description = "OIDC client ID for Verified Access"
  type        = string
}

variable "idp_client_secret" {
  description = "OIDC client secret"
  type        = string
  sensitive   = true
}

variable "application_domain" {
  description = "Domain name for the internal application"
  type        = string
}

variable "target_port" {
  description = "Port of the internal application"
  type        = number
  default     = 443
}

variable "alb_arn" {
  description = "Internal ALB ARN to front with Verified Access"
  type        = string
  default     = ""
}

variable "project" {
  default = "zero-trust"
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

# Verified Access Trust Provider (Identity)
resource "aws_verifiedaccess_trust_provider" "idp" {
  trust_provider_type = "user"
  user_trust_provider_type = "oidc"
  policy_reference_name    = "idp"

  oidc_options {
    issuer                 = var.idp_oidc_issuer
    client_id              = var.idp_client_id
    client_secret          = var.idp_client_secret
    authorization_endpoint = "${var.idp_oidc_issuer}/authorize"
    token_endpoint         = "${var.idp_oidc_issuer}/token"
    user_info_endpoint     = "${var.idp_oidc_issuer}/userinfo"
    scope                  = "openid profile email"
  }

  tags = var.tags
}

# Verified Access Trust Provider (Device — e.g., CrowdStrike)
resource "aws_verifiedaccess_trust_provider" "device" {
  trust_provider_type       = "device"
  device_trust_provider_type = "crowdstrike"
  policy_reference_name     = "device"

  device_options {
    tenant_id = "your-crowdstrike-tenant-id"
  }

  tags = var.tags
}

# Verified Access Instance
resource "aws_verifiedaccess_instance" "main" {
  tags = merge(var.tags, { Name = "${var.project}-instance" })
}

resource "aws_verifiedaccess_instance_trust_provider_attachment" "idp" {
  verifiedaccess_instance_id  = aws_verifiedaccess_instance.main.id
  verifiedaccess_trust_provider_id = aws_verifiedaccess_trust_provider.idp.id
}

resource "aws_verifiedaccess_instance_trust_provider_attachment" "device" {
  verifiedaccess_instance_id  = aws_verifiedaccess_instance.main.id
  verifiedaccess_trust_provider_id = aws_verifiedaccess_trust_provider.device.id
}

# Verified Access Group with Cedar policy
resource "aws_verifiedaccess_group" "main" {
  verifiedaccess_instance_id = aws_verifiedaccess_instance.main.id

  policy_document = <<-CEDAR
    permit(principal, action, resource)
    when {
      context.idp.email_verified == true &&
      context.idp.groups.contains("engineering") &&
      context.device.assessment.overall == "HEALTHY"
    };
  CEDAR

  tags = var.tags
}

# Verified Access Endpoint (application)
resource "aws_verifiedaccess_endpoint" "app" {
  verified_access_group_id   = aws_verifiedaccess_group.main.id
  endpoint_type              = "load-balancer"
  attachment_type            = "vpc"
  domain_certificate_arn     = aws_acm_certificate.app.arn
  application_domain         = var.application_domain
  endpoint_domain_prefix     = var.project

  load_balancer_options {
    load_balancer_arn = var.alb_arn
    port              = var.target_port
    protocol          = "https"
    subnet_ids        = var.subnet_ids
  }

  tags = var.tags
}

resource "aws_acm_certificate" "app" {
  domain_name       = var.application_domain
  validation_method = "DNS"
  tags              = var.tags
}
```

---

## 3. Cedar Policy Examples

```cedar
// Allow only healthy devices from engineering group
permit(principal, action, resource)
when {
  context.idp.email_verified == true &&
  context.idp.groups.contains("engineering") &&
  context.device.assessment.overall == "HEALTHY"
};

// Require MFA step-up for admin applications
permit(principal, action, resource)
when {
  context.idp.amr.contains("mfa") &&
  context.idp.groups.contains("admin")
};

// Block access from non-compliant OS versions
forbid(principal, action, resource)
when {
  context.device.os_version < "14.0"
};

// Allow from specific countries only
permit(principal, action, resource)
when {
  context.http_request.client_ip.is_in(ip("10.0.0.0/8")) ||
  context.idp.locale in ["US", "GB", "DE"]
};
```

---

## 4. `outputs.tf`

```bash
output "verified_access_instance_id" {
  description = "Verified Access instance ID"
  value       = aws_verifiedaccess_instance.main.id
}

output "endpoint_domain" {
  description = "Verified Access endpoint domain"
  value       = aws_verifiedaccess_endpoint.app.endpoint_domain
}

output "group_id" {
  description = "Verified Access group ID"
  value       = aws_verifiedaccess_group.main.id
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="vpc_id=vpc-xxx" \
  -var='subnet_ids=["subnet-a","subnet-b"]' \
  -var="idp_oidc_issuer=https://your-okta-domain.okta.com" \
  -var="idp_client_id=xxxxxx" \
  -var="idp_client_secret=yyyyyy" \
  -var="application_domain=internal-app.yourcompany.com"
```

## Important notes

- Zero Trust **replaces VPN-based perimeter access** with context-aware controls evaluating each request individually.
- Combines **identity verification** (via IdP) with **device trust signals** (EDR posture, OS compliance, JAMF).
- **Cedar policies** evaluate contextual signals dynamically — not just "is the user authenticated?"
- Eliminates **implicit VPN trust** and reduces lateral movement risk.
- Supports IdPs: Okta, Azure AD, Ping, and any OIDC-compatible provider.
- Supports device trust: CrowdStrike, JAMF, and custom device management.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/zero-trust/).
