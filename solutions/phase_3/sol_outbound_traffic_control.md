# Outbound Traffic Control - Network Firewall + DNS Firewall

This solution implements deny-by-default outbound controls using Route 53 DNS Firewall and AWS Network Firewall for deep packet inspection.

## Recommended file structure

```
outbound-control/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_id" {
  description = "VPC ID to apply outbound controls"
  type        = string
}

variable "allowed_domains" {
  description = "Domains to allow outbound access to"
  type        = list(string)
  default     = [
    "*.amazonaws.com",
    "*.aws.amazon.com",
    "*.docker.io",
    "*.github.com"
  ]
}

variable "firewall_subnet_ids" {
  description = "Subnet IDs for Network Firewall endpoints"
  type        = list(string)
  default     = []
}

variable "enable_network_firewall" {
  description = "Deploy AWS Network Firewall for L3-L7 inspection"
  type        = bool
  default     = false
}

variable "project" {
  default = "outbound-control"
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

# === DNS Firewall (deny-by-default) ===

# Custom allow-list domain list
resource "aws_route53_resolver_firewall_domain_list" "allowed" {
  name    = "${var.project}-allowed-domains"
  domains = var.allowed_domains
  tags    = var.tags
}

# Rule Group
resource "aws_route53_resolver_firewall_rule_group" "main" {
  name = "${var.project}-rule-group"
  tags = var.tags
}

# Allow rule (higher priority = evaluated first)
resource "aws_route53_resolver_firewall_rule" "allow" {
  name                    = "allow-trusted-domains"
  action                  = "ALLOW"
  firewall_domain_list_id = aws_route53_resolver_firewall_domain_list.allowed.id
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 100
}

# Block everything else (deny-by-default)
resource "aws_route53_resolver_firewall_rule" "deny_all" {
  name                    = "deny-all-other"
  action                  = "BLOCK"
  block_response          = "NODATA"
  firewall_domain_list_id = aws_route53_resolver_firewall_domain_list.deny_all.id
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 9999
}

resource "aws_route53_resolver_firewall_domain_list" "deny_all" {
  name    = "${var.project}-deny-all"
  domains = ["*"]
  tags    = var.tags
}

# Associate with VPC
resource "aws_route53_resolver_firewall_rule_group_association" "main" {
  name                   = "${var.project}-vpc-assoc"
  firewall_rule_group_id = aws_route53_resolver_firewall_rule_group.main.id
  vpc_id                 = var.vpc_id
  priority               = 101
}

# === Network Firewall (optional, for L3-L7 deep inspection) ===

resource "aws_networkfirewall_firewall_policy" "outbound" {
  count = var.enable_network_firewall ? 1 : 0

  name = "${var.project}-outbound-policy"

  firewall_policy {
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:forward_to_sfe"]

    stateful_default_actions = ["aws:drop_strict"]

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.allow_outbound[0].arn
    }
  }

  tags = var.tags
}

resource "aws_networkfirewall_rule_group" "allow_outbound" {
  count = var.enable_network_firewall ? 1 : 0

  capacity = 100
  name     = "${var.project}-allow-outbound"
  type     = "STATEFUL"

  rule_group {
    rules_source {
      rules_string = <<-EOT
        pass tls any any -> any 443 (tls.sni; content:"amazonaws.com"; endswith; msg:"Allow AWS"; sid:1; rev:1;)
        pass tls any any -> any 443 (tls.sni; content:"github.com"; endswith; msg:"Allow GitHub"; sid:2; rev:1;)
        drop tls any any -> any any (msg:"Block all other TLS"; sid:999; rev:1;)
      EOT
    }

    stateful_rule_options {
      rule_order = "STRICT_ORDER"
    }
  }

  tags = var.tags
}

resource "aws_networkfirewall_firewall" "outbound" {
  count = var.enable_network_firewall ? 1 : 0

  name                = "${var.project}-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.outbound[0].arn
  vpc_id              = var.vpc_id

  dynamic "subnet_mapping" {
    for_each = var.firewall_subnet_ids
    content {
      subnet_id = subnet_mapping.value
    }
  }

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "dns_firewall_rule_group_id" {
  description = "DNS Firewall rule group ID"
  value       = aws_route53_resolver_firewall_rule_group.main.id
}

output "network_firewall_arn" {
  description = "Network Firewall ARN (if deployed)"
  value       = var.enable_network_firewall ? aws_networkfirewall_firewall.outbound[0].arn : "Not deployed"
}

output "allowed_domains" {
  description = "Domains allowed for outbound access"
  value       = var.allowed_domains
}
```

---

## How to deploy

```bash
terraform init

# DNS Firewall only (simpler, no infra cost):
terraform apply -var="vpc_id=vpc-xxx"

# With Network Firewall (deep packet inspection):
terraform apply \
  -var="vpc_id=vpc-xxx" \
  -var="enable_network_firewall=true" \
  -var='firewall_subnet_ids=["subnet-a","subnet-b"]'
```

## Important notes

- **Deny-by-default** is the strongest approach — allow only known-good destinations.
- **Route 53 DNS Firewall** is the easiest entry point: no infrastructure changes, managed via Firewall Manager.
- **AWS Network Firewall** provides L3-L7 inspection including east-west traffic and TLS SNI inspection.
- Forward firewall/proxy logs to your **SIEM for Shadow IT detection** (unexpected outbound destinations).
- Use **AWS PrivateLink** for private connectivity to partners — avoids internet traversal entirely.
- Start with Alert mode to identify legitimate outbound destinations before switching to Block.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/outbound-traffic-control/).
