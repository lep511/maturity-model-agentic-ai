# Active Threat Defense Managed Rule Groups - AWS Network Firewall

This solution deploys AWS Network Firewall with the AttackInfrastructure managed rule group to block traffic to known malicious infrastructure (malware staging, botnet C2, crypto-mining pools).

## Recommended file structure

```
network-firewall-atd/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_id" {
  description = "VPC ID where Network Firewall will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for firewall endpoints"
  type        = list(string)
}

variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  default = "network-firewall-atd"
}

variable "tags" {
  default = {}
}
```

---

## 2. `main.tf`

```bash
provider "aws" {
  region = var.region
}

# Firewall Policy with Active Threat Defense managed rule groups
resource "aws_networkfirewall_firewall_policy" "main" {
  name = "${var.project}-policy"

  firewall_policy {
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:forward_to_sfe"]

    stateful_rule_group_reference {
      resource_arn = "arn:aws:network-firewall:${var.region}:aws-managed:stateful-rulegroup/AbusedLegitMalwareDomainsActionOrder"
    }

    stateful_rule_group_reference {
      resource_arn = "arn:aws:network-firewall:${var.region}:aws-managed:stateful-rulegroup/MalwareDomainsActionOrder"
    }

    stateful_rule_group_reference {
      resource_arn = "arn:aws:network-firewall:${var.region}:aws-managed:stateful-rulegroup/AbusedLegitBotNetCommandAndControlDomainsActionOrder"
    }

    stateful_rule_group_reference {
      resource_arn = "arn:aws:network-firewall:${var.region}:aws-managed:stateful-rulegroup/BotNetCommandAndControlDomainsActionOrder"
    }

    stateful_rule_group_reference {
      resource_arn = "arn:aws:network-firewall:${var.region}:aws-managed:stateful-rulegroup/ThreatSignaturesBotnetActionOrder"
    }
  }

  tags = var.tags
}

# Network Firewall
resource "aws_networkfirewall_firewall" "main" {
  name                = "${var.project}-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.main.arn
  vpc_id              = var.vpc_id

  dynamic "subnet_mapping" {
    for_each = var.subnet_ids
    content {
      subnet_id = subnet_mapping.value
    }
  }

  tags = var.tags
}

# CloudWatch Log Group for firewall activity
resource "aws_cloudwatch_log_group" "firewall" {
  name              = "/aws/network-firewall/${var.project}"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_networkfirewall_logging_configuration" "main" {
  firewall_arn = aws_networkfirewall_firewall.main.arn

  logging_configuration {
    log_destination_config {
      log_destination = {
        logGroup = aws_cloudwatch_log_group.firewall.name
      }
      log_destination_type = "CloudWatchLogs"
      log_type             = "ALERT"
    }
  }
}
```

---

## 3. `outputs.tf`

```bash
output "firewall_arn" {
  description = "ARN of the Network Firewall"
  value       = aws_networkfirewall_firewall.main.arn
}

output "firewall_policy_arn" {
  description = "ARN of the firewall policy with ATD rule groups"
  value       = aws_networkfirewall_firewall_policy.main.arn
}

output "log_group_name" {
  description = "CloudWatch Log Group for firewall alerts"
  value       = aws_cloudwatch_log_group.firewall.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="vpc_id=vpc-xxxxx" -var='subnet_ids=["subnet-aaa","subnet-bbb"]'
```

## Important notes

- AWS-managed rule groups are powered by **MadPot** (AWS internal threat intelligence) and update automatically.
- Deploy firewall endpoints in **dedicated subnets** (one per AZ) — do not share with workload subnets.
- Start with rule evaluation in **Alert mode** to identify false positives before switching to Drop.
- Monitor blocked traffic via CloudWatch Logs to validate rule effectiveness.
- Update VPC route tables to route traffic through the firewall endpoints.
