# Customer IAM: Security of Your Customers - Amazon Cognito

This solution deploys Amazon Cognito for customer-facing authentication with MFA, social federation, and WAF Account Takeover Prevention (ATP).

## Recommended file structure

```
cognito-ciam/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "app_name" {
  description = "Application name for the user pool"
  type        = string
}

variable "callback_urls" {
  description = "OAuth callback URLs"
  type        = list(string)
}

variable "logout_urls" {
  description = "OAuth logout URLs"
  type        = list(string)
}

variable "enable_mfa" {
  description = "MFA enforcement (OFF, OPTIONAL, ON)"
  type        = string
  default     = "OPTIONAL"
}

variable "waf_web_acl_arn" {
  description = "WAF WebACL ARN for ATP protection (optional)"
  type        = string
  default     = ""
}

variable "project" {
  default = "cognito-ciam"
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

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-users"

  # Password policy
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # MFA configuration
  mfa_configuration = var.enable_mfa

  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email verification
  auto_verified_attributes = ["email"]

  # Advanced security (adaptive authentication)
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Schema
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  tags = var.tags
}

# App Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.app_name}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls
  supported_identity_providers         = ["COGNITO"]

  prevent_user_existence_errors = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# Hosted UI domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.app_name
  user_pool_id = aws_cognito_user_pool.main.id
}

# WAF ATP protection on login endpoint (if WAF provided)
resource "aws_wafv2_web_acl_association" "cognito" {
  count = var.waf_web_acl_arn != "" ? 1 : 0

  resource_arn = aws_cognito_user_pool.main.arn
  web_acl_arn  = var.waf_web_acl_arn
}
```

---

## 3. `outputs.tf`

```bash
output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "domain" {
  description = "Cognito Hosted UI domain"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.us-east-1.amazoncognito.com"
}

output "user_pool_arn" {
  description = "User Pool ARN (for WAF association)"
  value       = aws_cognito_user_pool.main.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="app_name=my-app" \
  -var='callback_urls=["https://myapp.com/callback"]' \
  -var='logout_urls=["https://myapp.com/logout"]'
```

## Important notes

- **Avoid custom authentication** stored in relational tables — introduces SQL injection and broken authentication risks.
- Amazon Cognito is **free up to 50,000 MAU** and supports MFA, SSO, SAML, OIDC, OAuth 2.0, and social federation.
- Enable **Advanced Security Mode** for adaptive authentication (risk-based MFA prompts, compromised credential detection).
- Enable **WAF Account Takeover Prevention (ATP)** on login endpoints to block credential stuffing.
- Partner alternatives (Okta/Auth0) are available on **AWS Marketplace** if Cognito doesn't meet requirements.
- Use **Account Creation Fraud Prevention (ACP)** to block bot registrations.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/ciam/).
