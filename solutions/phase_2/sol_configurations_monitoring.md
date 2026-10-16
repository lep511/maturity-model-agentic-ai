# Configurations Monitoring - AWS Config

This solution enables AWS Config across the organization with conformance packs, remediation rules, and centralized aggregation for asset inventory and change tracking.

## Recommended file structure

```
aws-config-org/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "aggregator_account_id" {
  description = "Account ID for the Config aggregator (security/audit account)"
  type        = string
}

variable "delivery_bucket_name" {
  description = "S3 bucket name for Config delivery channel"
  type        = string
}

variable "enable_remediation" {
  description = "Enable automatic remediation for non-compliant resources"
  type        = bool
  default     = false
}

variable "project" {
  default = "aws-config-org"
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

# Config Recorder
resource "aws_config_configuration_recorder" "main" {
  name     = "${var.project}-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  recording_mode {
    recording_frequency = "CONTINUOUS"
  }
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true
  depends_on = [aws_config_delivery_channel.main]
}

# Delivery Channel
resource "aws_config_delivery_channel" "main" {
  name           = "${var.project}-channel"
  s3_bucket_name = var.delivery_bucket_name

  snapshot_delivery_properties {
    delivery_frequency = "TwentyFour_Hours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# IAM Role for Config
resource "aws_iam_role" "config" {
  name = "${var.project}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "config.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# Organization-wide Config Aggregator
resource "aws_config_configuration_aggregator" "org" {
  name = "${var.project}-org-aggregator"

  organization_aggregation_source {
    all_regions = true
    role_arn    = aws_iam_role.aggregator.arn
  }

  tags = var.tags
}

resource "aws_iam_role" "aggregator" {
  name = "${var.project}-aggregator-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "config.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "aggregator" {
  role       = aws_iam_role.aggregator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRoleForOrganizations"
}

# Key Config Rules
resource "aws_config_config_rule" "ssh_restricted" {
  name = "restricted-ssh"
  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }
  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "rdp_restricted" {
  name = "restricted-rdp"
  source {
    owner             = "AWS"
    source_identifier = "RESTRICTED_INCOMING_TRAFFIC"
  }
  input_parameters = jsonencode({ blockedPort1 = "3389" })
  depends_on       = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"
  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }
  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "s3_bucket_public" {
  name = "s3-bucket-public-read-prohibited"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }
  depends_on = [aws_config_configuration_recorder.main]
}

# Remediation (optional) — auto-close open SSH ports
resource "aws_config_remediation_configuration" "ssh_restricted" {
  count = var.enable_remediation ? 1 : 0

  config_rule_name = aws_config_config_rule.ssh_restricted.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-DisablePublicAccessForSecurityGroup"

  automatic                  = true
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}
```

---

## 3. `outputs.tf`

```bash
output "recorder_id" {
  description = "Config recorder ID"
  value       = aws_config_configuration_recorder.main.id
}

output "aggregator_name" {
  description = "Organization-wide Config aggregator name"
  value       = aws_config_configuration_aggregator.org.name
}

output "config_rules" {
  description = "Deployed Config rules"
  value = [
    aws_config_config_rule.ssh_restricted.name,
    aws_config_config_rule.rdp_restricted.name,
    aws_config_config_rule.encrypted_volumes.name,
    aws_config_config_rule.s3_bucket_public.name
  ]
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="aggregator_account_id=123456789012" \
  -var="delivery_bucket_name=my-config-logs-bucket"

# With auto-remediation:
terraform apply \
  -var="aggregator_account_id=123456789012" \
  -var="delivery_bucket_name=my-config-logs-bucket" \
  -var="enable_remediation=true"
```

## Important notes

- **AWS Config is required by Security Hub and Firewall Manager** — enable it first.
- If using **AWS Control Tower**, Config is enabled automatically across all accounts.
- The organization **aggregator** provides centralized visibility from the security/audit account.
- Config enables **timeline-based investigation** — answer "what changed and when" during incidents.
- Use **conformance packs** for pre-built rule sets aligned with compliance frameworks (CIS, NIST, PCI).
- Start with alerting before enabling **auto-remediation** to avoid unintended disruptions.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/configurations-monitoring-config/).
