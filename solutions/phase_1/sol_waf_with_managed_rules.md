# WAF with Managed Rules - AWS WAF and Firewall Manager

This solution deploys AWS WAF with AWS-managed rule groups for OWASP Top 10 protection and uses Firewall Manager to enforce a default WebACL across the organization.

## Recommended file structure

```
waf-managed-rules/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "resource_arns" {
  description = "ARNs of resources to associate with the WebACL (ALB, CloudFront, API Gateway)"
  type        = list(string)
  default     = []
}

variable "scope" {
  description = "WAF scope: REGIONAL (ALB, API Gateway) or CLOUDFRONT"
  type        = string
  default     = "REGIONAL"
}

variable "enable_ip_reputation" {
  description = "Enable IP reputation rule group"
  type        = bool
  default     = true
}

variable "enable_common_rules" {
  description = "Enable core rule set (OWASP Top 10)"
  type        = bool
  default     = true
}

variable "enable_sqli_rules" {
  description = "Enable SQL injection protection"
  type        = bool
  default     = true
}

variable "enable_known_bad_inputs" {
  description = "Enable known bad inputs rule group"
  type        = bool
  default     = true
}

variable "project" {
  default = "waf-managed-rules"
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

# WebACL with AWS-managed rule groups
resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project}-webacl"
  description = "WebACL with AWS-managed rules for OWASP Top 10 protection"
  scope       = var.scope

  default_action {
    allow {}
  }

  # AWS Managed Rules - Core Rule Set (OWASP Top 10)
  dynamic "rule" {
    for_each = var.enable_common_rules ? [1] : []
    content {
      name     = "AWS-AWSManagedRulesCommonRuleSet"
      priority = 1

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesCommonRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name               = "AWSCommonRules"
        sampled_requests_enabled  = true
      }
    }
  }

  # AWS Managed Rules - IP Reputation
  dynamic "rule" {
    for_each = var.enable_ip_reputation ? [1] : []
    content {
      name     = "AWS-AWSManagedRulesAmazonIpReputationList"
      priority = 2

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesAmazonIpReputationList"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name               = "AWSIPReputation"
        sampled_requests_enabled  = true
      }
    }
  }

  # AWS Managed Rules - SQL Injection
  dynamic "rule" {
    for_each = var.enable_sqli_rules ? [1] : []
    content {
      name     = "AWS-AWSManagedRulesSQLiRuleSet"
      priority = 3

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesSQLiRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name               = "AWSSQLiRules"
        sampled_requests_enabled  = true
      }
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  dynamic "rule" {
    for_each = var.enable_known_bad_inputs ? [1] : []
    content {
      name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
      priority = 4

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesKnownBadInputsRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name               = "AWSKnownBadInputs"
        sampled_requests_enabled  = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project}-webacl"
    sampled_requests_enabled  = true
  }

  tags = var.tags
}

# Associate WebACL with resources
resource "aws_wafv2_web_acl_association" "main" {
  for_each = toset(var.resource_arns)

  resource_arn = each.value
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# WAF Logging to CloudWatch
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${var.project}"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn           = aws_wafv2_web_acl.main.arn
}
```

---

## 3. `outputs.tf`

```bash
output "web_acl_arn" {
  description = "ARN of the WebACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "web_acl_id" {
  description = "ID of the WebACL"
  value       = aws_wafv2_web_acl.main.id
}

output "log_group_name" {
  description = "CloudWatch Log Group for WAF logs"
  value       = aws_cloudwatch_log_group.waf.name
}
```

---

## How to deploy

```bash
terraform init

# For ALB/API Gateway (regional):
terraform apply -var='resource_arns=["arn:aws:elasticloadbalancing:us-east-1:123:loadbalancer/app/my-alb/xxx"]'

# For CloudFront:
terraform apply -var="scope=CLOUDFRONT" -var='resource_arns=["arn:aws:cloudfront::123:distribution/EXXX"]'
```

## Firewall Manager (organization-wide enforcement)

For enforcing WAF across all accounts, use AWS Firewall Manager (requires AWS Organizations and Security Hub):

```bash
resource "aws_fms_policy" "waf" {
  name                  = "enforce-waf-org"
  exclude_resource_tags = false
  remediation_enabled   = true

  security_service_policy_data {
    type = "WAFV2"
    managed_service_data = jsonencode({
      type = "WAFV2"
      defaultAction = { type = "ALLOW" }
      preProcessRuleGroups = [
        {
          managedRuleGroupIdentifier = {
            vendorName           = "AWS"
            managedRuleGroupName = "AWSManagedRulesCommonRuleSet"
          }
          overrideAction = { type = "NONE" }
          ruleGroupType  = "ManagedRuleGroup"
          priority       = 1
        }
      ]
      postProcessRuleGroups = []
    })
  }

  resource_type = "AWS::ElasticLoadBalancingV2::LoadBalancer"
}
```

## Important notes

- Set rules to **Block mode** (not just Count) for actual protection.
- Start with **AWSManagedRulesCommonRuleSet** (OWASP Top 10) and **IP Reputation** as baseline.
- Use **AWS Firewall Manager** to enforce a default WebACL organization-wide across all ALBs, CloudFront distributions, and API Gateways.
- Enable **WAF logging** to CloudWatch or S3 for visibility into blocked and allowed requests.
- Supplement with **third-party rules** from AWS Marketplace (F5, Fortinet, Imperva) for specialized protection.
- Monitor **false positives** in Count mode before switching rules to Block.
