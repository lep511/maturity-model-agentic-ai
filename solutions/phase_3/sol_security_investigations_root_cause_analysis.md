# Security Investigations - Root Cause Analysis - Amazon Detective

This solution enables Amazon Detective for accelerated security investigations with behavioral baselines, graph correlation, and integration with GuardDuty and Security Hub.

## Recommended file structure

```
detective/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "member_accounts" {
  description = "Account IDs to invite as Detective members"
  type        = list(string)
  default     = []
}

variable "project" {
  default = "detective"
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

# Enable Detective
resource "aws_detective_graph" "main" {
  tags = var.tags
}

# Invite member accounts
resource "aws_detective_member" "members" {
  for_each = toset(var.member_accounts)

  account_id    = each.value
  graph_arn     = aws_detective_graph.main.graph_arn
  email_address = "security@yourcompany.com"
  message       = "Invitation to join Detective behavior graph"
}

# Organization configuration (auto-enable for all accounts)
resource "aws_detective_organization_admin_account" "this" {
  account_id = data.aws_caller_identity.current.account_id
}

resource "aws_detective_organization_configuration" "this" {
  auto_enable = true
  graph_arn   = aws_detective_graph.main.graph_arn
}

data "aws_caller_identity" "current" {}
```

---

## 3. Investigation Workflow

```markdown
## Standard Investigation Process with Detective

### 1. Triage (GuardDuty/Security Hub finding)
- Open the finding in Security Hub or GuardDuty
- Click "Investigate in Detective" for automatic context

### 2. Scope Assessment
Detective automatically answers:
- What other resources did this entity interact with?
- Is this behavior normal or anomalous? (behavioral baseline)
- What is the geographic origin of the activity?
- What API calls were made in the time window?

### 3. Root Cause Analysis
Use Detective's graph model to:
- Trace the attack path (initial access → lateral movement → impact)
- Identify the compromised credential or entry point
- Determine which resources were accessed
- Distinguish attacker activity from normal operations

### 4. Documentation
After investigation:
- [ ] Document timeline of events
- [ ] Record root cause and entry vector
- [ ] List all affected resources
- [ ] Identify detection gaps
- [ ] Update playbooks/detection rules based on findings
```

---

## 4. Key Detective Features

| Feature | Use Case |
|---------|----------|
| **Entity profiles** | Behavioral baselines for IAM users, roles, EC2 instances |
| **Finding groups** | Related findings automatically clustered |
| **Geolocation** | Map API activity to geographic locations |
| **Time-series graphs** | Visualize activity volume anomalies |
| **VPC Flow integration** | Network communication patterns |
| **CloudTrail integration** | All API calls correlated with entities |

---

## 5. `outputs.tf`

```bash
output "graph_arn" {
  description = "Detective behavior graph ARN"
  value       = aws_detective_graph.main.graph_arn
}

output "member_count" {
  description = "Number of member accounts"
  value       = length(var.member_accounts)
}
```

---

## How to deploy

```bash
terraform init
terraform apply

# With member accounts:
terraform apply -var='member_accounts=["111111111111","222222222222"]'
```

## Important notes

- Detective **ingests two weeks of historical data** immediately upon activation — no waiting period.
- It automatically correlates **GuardDuty findings, Security Hub alerts, VPC Flow Logs, and CloudTrail** into a unified graph model.
- Use Detective as the **standard investigation tool** rather than manually querying CloudTrail and VPC Flow Logs.
- **Behavioral baselines** help distinguish normal activity from anomalous behavior (false positives vs. real threats).
- A **30-day free trial** is available — evaluate before committing.
- Investigations should be documented and used to **improve detection rules** and playbooks.
- Enable in **all active regions** for complete coverage.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/detective/).
