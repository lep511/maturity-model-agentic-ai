# Available AWS Managed Domain Lists - Route 53 DNS Firewall

This solution enables Route 53 DNS Firewall with AWS-managed domain lists to block outbound DNS queries to known malicious domains across all VPCs.

## Recommended file structure

```
dns-firewall/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_ids" {
  description = "List of VPC IDs to associate with DNS Firewall rule group"
  type        = list(string)
}

variable "alert_only" {
  description = "Set to true to run in alert-only mode before blocking"
  type        = bool
  default     = false
}

variable "project" {
  default = "dns-firewall"
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

data "aws_region" "current" {}

# AWS Managed Domain Lists ARNs
locals {
  managed_lists = {
    malware     = "arn:aws:route53resolver:${data.aws_region.current.name}:aws:firewall-domain-list/AWSManagedDomainsMalwareDomainList"
    botnet      = "arn:aws:route53resolver:${data.aws_region.current.name}:aws:firewall-domain-list/AWSManagedDomainsBotnetCommandandControl"
    aggregate   = "arn:aws:route53resolver:${data.aws_region.current.name}:aws:firewall-domain-list/AWSManagedDomainsAggregateThreatList"
    guardduty   = "arn:aws:route53resolver:${data.aws_region.current.name}:aws:firewall-domain-list/AWSManagedDomainsAmazonGuardDutyThreatList"
  }

  action = var.alert_only ? "ALERT" : "BLOCK"
  block_response = var.alert_only ? null : "NODATA"
}

# DNS Firewall Rule Group
resource "aws_route53_resolver_firewall_rule_group" "main" {
  name = "${var.project}-rule-group"
  tags = var.tags
}

resource "aws_route53_resolver_firewall_rule" "malware" {
  name                    = "block-malware-domains"
  action                  = local.action
  block_response          = local.block_response
  firewall_domain_list_id = local.managed_lists.malware
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 100
}

resource "aws_route53_resolver_firewall_rule" "botnet" {
  name                    = "block-botnet-c2"
  action                  = local.action
  block_response          = local.block_response
  firewall_domain_list_id = local.managed_lists.botnet
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 200
}

resource "aws_route53_resolver_firewall_rule" "aggregate" {
  name                    = "block-aggregate-threats"
  action                  = local.action
  block_response          = local.block_response
  firewall_domain_list_id = local.managed_lists.aggregate
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 300
}

resource "aws_route53_resolver_firewall_rule" "guardduty" {
  name                    = "block-guardduty-domains"
  action                  = local.action
  block_response          = local.block_response
  firewall_domain_list_id = local.managed_lists.guardduty
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 400
}

# Associate rule group with VPCs
resource "aws_route53_resolver_firewall_rule_group_association" "main" {
  for_each = toset(var.vpc_ids)

  name                   = "${var.project}-assoc-${each.key}"
  firewall_rule_group_id = aws_route53_resolver_firewall_rule_group.main.id
  vpc_id                 = each.value
  priority               = 101
}

# CloudWatch metric for monitoring blocked queries
resource "aws_cloudwatch_metric_alarm" "dns_blocked" {
  alarm_name          = "${var.project}-blocked-queries"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedQueries"
  namespace           = "AWS/Route53Resolver"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "DNS Firewall blocked suspicious queries"
  tags                = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "rule_group_id" {
  description = "ID of the DNS Firewall rule group"
  value       = aws_route53_resolver_firewall_rule_group.main.id
}

output "rule_group_arn" {
  description = "ARN of the DNS Firewall rule group"
  value       = aws_route53_resolver_firewall_rule_group.main.arn
}

output "associated_vpcs" {
  description = "VPCs associated with the DNS Firewall rule group"
  value       = var.vpc_ids
}
```

---

## How to deploy

```bash
# Start in alert mode to detect false positives
terraform init
terraform apply -var='vpc_ids=["vpc-aaa","vpc-bbb"]' -var="alert_only=true"

# After validation, switch to blocking
terraform apply -var='vpc_ids=["vpc-aaa","vpc-bbb"]' -var="alert_only=false"
```

## Important notes

- **Test in Alert mode first** — use CloudWatch metrics and DNS Firewall logs to identify false positives before blocking.
- Handle false positives by adding an explicit **Allow rule with a lower priority number** (higher precedence) than the blocking rules.
- AWS-managed lists are updated continuously using **Recorded Future** intelligence and GuardDuty findings.
- The **Aggregate Threat List** provides the broadest coverage (ransomware, spyware, DNS tunneling).
- Deploy across **all VPCs** in all active regions for complete coverage.
- DNS Firewall is included at no extra cost beyond standard Route 53 Resolver pricing.
