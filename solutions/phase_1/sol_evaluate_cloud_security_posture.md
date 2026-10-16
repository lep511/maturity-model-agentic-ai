# Evaluate Cloud Security Posture - AWS Security Hub

This solution enables AWS Security Hub across the organization with security standards enabled, centralized configuration, and automated alerting on critical findings.

## Recommended file structure

```
security-hub-org/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "delegated_admin_account_id" {
  description = "Account ID for Security Hub delegated administrator"
  type        = string
}

variable "enable_cis_standard" {
  description = "Enable CIS AWS Foundations Benchmark standard"
  type        = bool
  default     = true
}

variable "enable_aws_best_practices" {
  description = "Enable AWS Foundational Security Best Practices standard"
  type        = bool
  default     = true
}

variable "enable_nist_standard" {
  description = "Enable NIST 800-53 standard"
  type        = bool
  default     = false
}

variable "project" {
  default = "security-hub-org"
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

# Enable Security Hub
resource "aws_securityhub_account" "this" {
  enable_default_standards = false
  auto_enable_controls     = true
}

# Designate delegated administrator
resource "aws_securityhub_organization_admin_account" "this" {
  admin_account_id = var.delegated_admin_account_id
  depends_on       = [aws_securityhub_account.this]
}

# Organization configuration — auto-enable for all members
resource "aws_securityhub_organization_configuration" "this" {
  auto_enable          = true
  auto_enable_standards = "DEFAULT"
  depends_on           = [aws_securityhub_organization_admin_account.this]
}

# Enable Security Standards
resource "aws_securityhub_standards_subscription" "cis" {
  count         = var.enable_cis_standard ? 1 : 0
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.this]
}

resource "aws_securityhub_standards_subscription" "aws_best_practices" {
  count         = var.enable_aws_best_practices ? 1 : 0
  standards_arn = "arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.this]
}

resource "aws_securityhub_standards_subscription" "nist" {
  count         = var.enable_nist_standard ? 1 : 0
  standards_arn = "arn:aws:securityhub:us-east-1::standards/nist-800-53/v/5.0.0"
  depends_on    = [aws_securityhub_account.this]
}

# Finding aggregator — aggregate findings from all regions
resource "aws_securityhub_finding_aggregator" "all_regions" {
  linking_mode = "ALL_REGIONS"
  depends_on   = [aws_securityhub_account.this]
}
```

---

## 3. `outputs.tf`

```bash
output "securityhub_account_arn" {
  description = "Security Hub account ARN"
  value       = aws_securityhub_account.this.arn
}

output "delegated_admin" {
  description = "Security Hub delegated administrator account"
  value       = var.delegated_admin_account_id
}

output "enabled_standards" {
  description = "List of enabled security standards"
  value = compact([
    var.enable_cis_standard ? "CIS AWS Foundations" : "",
    var.enable_aws_best_practices ? "AWS Foundational Best Practices" : "",
    var.enable_nist_standard ? "NIST 800-53" : ""
  ])
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="delegated_admin_account_id=123456789012"

# With NIST standard:
terraform apply \
  -var="delegated_admin_account_id=123456789012" \
  -var="enable_nist_standard=true"
```

## Important notes

- Security Hub costs **$0.001 per check** with a 30-day free trial.
- Enable across **all accounts** with central configuration via the delegated administrator.
- **AWS Config must be enabled** for Security Hub to evaluate controls — if using Control Tower, this is automatic.
- The **finding aggregator** centralizes findings from all regions into a single pane.
- Assign someone to **actively remediate** critical and high findings — detective controls without action provide no value.
- Track the **security score as a KPI** — it should trend positively over time.
- Start with CIS and AWS Best Practices standards, add NIST 800-53 if regulatory compliance requires it.
