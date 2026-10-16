# WAF with Custom Rules - AWS WAF

This solution deploys custom WAF rules for rate limiting, virtual patching, geo-based controls, and Account Takeover Prevention (ATP).

## Recommended file structure

```
waf-custom-rules/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "web_acl_name" {
  description = "Existing WebACL name to add custom rules to"
  type        = string
}

variable "rate_limit_per_ip" {
  description = "Maximum requests per IP in 5-minute window"
  type        = number
  default     = 2000
}

variable "login_endpoint" {
  description = "Path for login endpoint (for ATP)"
  type        = string
  default     = "/api/login"
}

variable "registration_endpoint" {
  description = "Path for registration endpoint (for ACP)"
  type        = string
  default     = "/api/register"
}

variable "blocked_countries" {
  description = "Country codes to block (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = []
}

variable "scope" {
  description = "WAF scope: REGIONAL or CLOUDFRONT"
  type        = string
  default     = "REGIONAL"
}

variable "project" {
  default = "waf-custom-rules"
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

resource "aws_wafv2_web_acl" "custom" {
  name  = var.web_acl_name
  scope = var.scope

  default_action {
    allow {}
  }

  # Rate limiting per IP
  rule {
    name     = "rate-limit-per-ip"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_per_ip
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitPerIP"
      sampled_requests_enabled  = true
    }
  }

  # Stricter rate limit on login endpoint (credential stuffing)
  rule {
    name     = "login-rate-limit"
    priority = 20

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = var.login_endpoint
            positional_constraint = "STARTS_WITH"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "LoginRateLimit"
      sampled_requests_enabled  = true
    }
  }

  # Geo-blocking (if configured)
  dynamic "rule" {
    for_each = length(var.blocked_countries) > 0 ? [1] : []
    content {
      name     = "geo-block"
      priority = 30

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name               = "GeoBlock"
        sampled_requests_enabled  = true
      }
    }
  }

  # Virtual patching example — block specific CVE exploit pattern
  rule {
    name     = "virtual-patch-log4j"
    priority = 5

    action {
      block {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            search_string         = "$${jndi:"
            positional_constraint = "CONTAINS"
            field_to_match {
              all_query_arguments {}
            }
            text_transformation {
              priority = 0
              type     = "URL_DECODE"
            }
            text_transformation {
              priority = 1
              type     = "LOWERCASE"
            }
          }
        }
        statement {
          byte_match_statement {
            search_string         = "$${jndi:"
            positional_constraint = "CONTAINS"
            field_to_match {
              body {}
            }
            text_transformation {
              priority = 0
              type     = "URL_DECODE"
            }
            text_transformation {
              priority = 1
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "VirtualPatchLog4j"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed - Account Takeover Prevention (ATP)
  rule {
    name     = "aws-atp"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesATPRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          login_path = var.login_endpoint
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "ATP"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project}-webacl"
    sampled_requests_enabled  = true
  }

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "web_acl_arn" {
  description = "WebACL ARN with custom rules"
  value       = aws_wafv2_web_acl.custom.arn
}

output "web_acl_id" {
  description = "WebACL ID"
  value       = aws_wafv2_web_acl.custom.id
}

output "rules_deployed" {
  description = "Custom rules deployed"
  value       = ["rate-limit-per-ip", "login-rate-limit", "virtual-patch-log4j", "aws-atp"]
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="web_acl_name=my-app-waf" \
  -var="rate_limit_per_ip=3000" \
  -var="login_endpoint=/api/v2/auth/login"

# With geo-blocking:
terraform apply \
  -var="web_acl_name=my-app-waf" \
  -var='blocked_countries=["CN","RU","KP"]'
```

## Important notes

- **Virtual patching** blocks exploit patterns while a code fix is pending — deploy WAF rules as compensating controls for unfixable third-party vulnerabilities.
- **Baseline rate limits in Count mode** first, then switch to Block — avoid blocking legitimate traffic.
- **ATP** (Account Takeover Prevention) detects credential stuffing by analyzing login patterns, stolen credential databases, and bot behavior.
- **ACP** (Account Creation Protection) blocks bot registrations on signup endpoints.
- **Export WAF rules to version control** for auditability and peer review.
- Review WAF logs regularly for **blocked requests and emerging attack patterns**.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/waf-custom-rules/).
