# Encryption in Transit - AWS Certificate Manager

This solution configures TLS certificates via ACM for ALBs and CloudFront, plus ACM Private CA for internal service-to-service encryption.

## Recommended file structure

```
encryption-transit/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "domain_name" {
  description = "Primary domain name for the TLS certificate"
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional domain names for the certificate"
  type        = list(string)
  default     = []
}

variable "alb_arn" {
  description = "ALB ARN to attach the certificate to"
  type        = string
  default     = ""
}

variable "target_group_arn" {
  description = "Target group ARN for HTTPS listener"
  type        = string
  default     = ""
}

variable "enable_private_ca" {
  description = "Enable ACM Private CA for internal certificates"
  type        = bool
  default     = false
}

variable "project" {
  default = "encryption-transit"
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

# Public ACM Certificate (free, auto-renewal)
resource "aws_acm_certificate" "public" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# DNS validation records (if using Route 53)
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.public.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60

  allow_overwrite = true
}

data "aws_route53_zone" "main" {
  name = var.domain_name
}

resource "aws_acm_certificate_validation" "public" {
  certificate_arn         = aws_acm_certificate.public.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

# HTTPS Listener on ALB
resource "aws_lb_listener" "https" {
  count = var.alb_arn != "" ? 1 : 0

  load_balancer_arn = var.alb_arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.public.certificate_arn

  default_action {
    type = "forward"
    target_group_arn = var.target_group_arn
  }
}

# HTTP to HTTPS redirect
resource "aws_lb_listener" "http_redirect" {
  count = var.alb_arn != "" ? 1 : 0

  load_balancer_arn = var.alb_arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ACM Private CA (for internal service-to-service TLS)
resource "aws_acmpca_certificate_authority" "internal" {
  count = var.enable_private_ca ? 1 : 0

  type = "ROOT"

  certificate_authority_configuration {
    key_algorithm     = "RSA_2048"
    signing_algorithm = "SHA256WITHRSA"

    subject {
      common_name  = "Internal CA"
      organization = "MyOrg"
    }
  }

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "certificate_arn" {
  description = "Public ACM certificate ARN"
  value       = aws_acm_certificate.public.arn
}

output "certificate_domain" {
  description = "Domain name on the certificate"
  value       = aws_acm_certificate.public.domain_name
}

output "private_ca_arn" {
  description = "ACM Private CA ARN (if enabled)"
  value       = var.enable_private_ca ? aws_acmpca_certificate_authority.internal[0].arn : "Not enabled"
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="domain_name=example.com" \
  -var='subject_alternative_names=["*.example.com","api.example.com"]' \
  -var="alb_arn=arn:aws:elasticloadbalancing:us-east-1:123:loadbalancer/app/my-alb/xxx"
```

## Important notes

- **Public ACM certificates are free** and auto-renew — eliminates expired certificate risk entirely.
- Use `ELBSecurityPolicy-TLS13-1-2-2021-06` for TLS 1.3 with TLS 1.2 fallback — do NOT use older policies.
- **Always redirect HTTP to HTTPS** — never serve unencrypted traffic to end users.
- For internal service-to-service communication, deploy **ACM Private CA** for automated internal certificate rotation.
- ACM Private CA costs $400/month per CA — evaluate whether mutual TLS is required for your internal services.
- Encrypt all data in transit as a **blanket practice**, not just for sensitive endpoints.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/acm/).
