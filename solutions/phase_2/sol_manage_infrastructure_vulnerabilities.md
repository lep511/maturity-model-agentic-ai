# Manage Infrastructure Vulnerabilities - Amazon Inspector

This solution enables Amazon Inspector for continuous EC2 vulnerability scanning (agent-based and agentless), integrates with Systems Manager Patch Manager for remediation, and tracks vulnerability trends.

## Recommended file structure

```
infra-vuln-management/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "notification_email" {
  description = "Email for critical infrastructure vulnerability alerts"
  type        = string
}

variable "patch_schedule" {
  description = "Cron for patch maintenance window"
  type        = string
  default     = "cron(0 4 ? * SUN *)"
}

variable "patch_approval_days" {
  description = "Days to wait after patch release before auto-approval"
  type        = number
  default     = 7
}

variable "project" {
  default = "infra-vuln-mgmt"
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

data "aws_caller_identity" "current" {}

# Enable Inspector for EC2
resource "aws_inspector2_enabler" "ec2" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["EC2"]
}

# SSM Patch Baseline — auto-approve critical/important patches after N days
resource "aws_ssm_patch_baseline" "main" {
  name             = "${var.project}-baseline"
  operating_system = "AMAZON_LINUX_2023"

  approval_rule {
    approve_after_days = var.patch_approval_days

    patch_filter {
      key    = "CLASSIFICATION"
      values = ["Security", "Bugfix"]
    }

    patch_filter {
      key    = "SEVERITY"
      values = ["Critical", "Important"]
    }
  }

  tags = var.tags
}

# Maintenance Window for patching
resource "aws_ssm_maintenance_window" "patching" {
  name              = "${var.project}-patch-window"
  schedule          = var.patch_schedule
  duration          = 3
  cutoff            = 1
  allow_unassociated_targets = false

  tags = var.tags
}

resource "aws_ssm_maintenance_window_target" "all_instances" {
  window_id     = aws_ssm_maintenance_window.patching.id
  name          = "all-managed-instances"
  resource_type = "INSTANCE"

  targets {
    key    = "tag:PatchGroup"
    values = ["production"]
  }
}

resource "aws_ssm_maintenance_window_task" "patch" {
  window_id        = aws_ssm_maintenance_window.patching.id
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  priority         = 1
  max_concurrency  = "25%"
  max_errors       = "25%"

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.all_instances.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Install"]
      }
    }
  }
}

# SNS alerts for critical findings
resource "aws_sns_topic" "vuln_alerts" {
  name = "${var.project}-alerts"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.vuln_alerts.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# EventBridge for critical EC2 findings
resource "aws_cloudwatch_event_rule" "critical" {
  name        = "${var.project}-critical"
  description = "Critical EC2 vulnerability findings"

  event_pattern = jsonencode({
    "source"      = ["aws.inspector2"]
    "detail-type" = ["Inspector2 Finding"]
    "detail" = {
      "severity"     = ["CRITICAL"]
      "status"       = ["ACTIVE"]
      "resourceType" = ["AWS_EC2_INSTANCE"]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.critical.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.vuln_alerts.arn
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.vuln_alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.vuln_alerts.arn
    }]
  })
}
```

---

## 3. `outputs.tf`

```bash
output "patch_baseline_id" {
  description = "SSM Patch Baseline ID"
  value       = aws_ssm_patch_baseline.main.id
}

output "maintenance_window_id" {
  description = "SSM Maintenance Window ID"
  value       = aws_ssm_maintenance_window.patching.id
}

output "alerts_topic_arn" {
  description = "SNS topic for vulnerability alerts"
  value       = aws_sns_topic.vuln_alerts.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="notification_email=security@yourcompany.com"
```

## Important notes

- **Agent-based scanning is preferred** over network sweeps — cloud resources are short-lived and ephemeral.
- Inspector uses the **SSM Agent** (installed by default on Amazon Linux 2023, AL2, Ubuntu) for agent-based scanning.
- For instances where the SSM Agent cannot be installed, Inspector supports **agentless EBS volume scans**.
- Use **Systems Manager Patch Manager** (free) to remediate findings — schedule patches during maintenance windows.
- Tag instances with `PatchGroup=production` to include them in the maintenance window.
- Track that **open vulnerabilities are trending down** over time — this is the key metric.
- Perform **penetration testing** on critical infrastructure by internal or external teams.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/vulnerability-analysis-and-pentesting/).
