# Forming a Chaos Engineering Team - AWS Fault Injection Service

This solution configures AWS FIS experiment templates to validate resilience by injecting controlled failures into AZ outages, instance termination, and network degradation.

## Recommended file structure

```
chaos-engineering/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "target_role_arn" {
  description = "IAM role ARN for FIS to assume when running experiments"
  type        = string
}

variable "target_asg_name" {
  description = "Auto Scaling Group name to target"
  type        = string
}

variable "stop_conditions_alarm" {
  description = "CloudWatch alarm ARN that stops experiments if triggered"
  type        = string
}

variable "project" {
  default = "chaos-engineering"
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

# FIS Experiment: Terminate random instances in ASG
resource "aws_fis_experiment_template" "terminate_instances" {
  description = "Terminate random EC2 instances to validate auto-recovery"
  role_arn    = var.target_role_arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_conditions_alarm
  }

  action {
    name      = "terminate-instances"
    action_id = "aws:ec2:terminate-instances"

    target {
      key   = "Instances"
      value = "asg-instances"
    }
  }

  target {
    name           = "asg-instances"
    resource_type  = "aws:ec2:instance"
    selection_mode = "COUNT(1)"

    resource_tag {
      key   = "aws:autoscaling:groupName"
      value = var.target_asg_name
    }
  }

  tags = var.tags
}

# FIS Experiment: Simulate AZ outage (network disruption)
resource "aws_fis_experiment_template" "az_outage" {
  description = "Simulate AZ network outage"
  role_arn    = var.target_role_arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_conditions_alarm
  }

  action {
    name      = "disrupt-network"
    action_id = "aws:network:disrupt-connectivity"

    parameter {
      key   = "duration"
      value = "PT5M"
    }
    parameter {
      key   = "scope"
      value = "availability-zone"
    }

    target {
      key   = "Subnets"
      value = "target-subnets"
    }
  }

  target {
    name           = "target-subnets"
    resource_type  = "aws:ec2:subnet"
    selection_mode = "COUNT(1)"

    resource_tag {
      key   = "chaos-target"
      value = "true"
    }
  }

  tags = var.tags
}

# FIS Experiment: CPU stress on instances
resource "aws_fis_experiment_template" "cpu_stress" {
  description = "Inject CPU stress to validate auto-scaling"
  role_arn    = var.target_role_arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = var.stop_conditions_alarm
  }

  action {
    name      = "cpu-stress"
    action_id = "aws:ssm:send-command"

    parameter {
      key   = "documentArn"
      value = "arn:aws:ssm:us-east-1::document/AWSFIS-Run-CPU-Stress"
    }
    parameter {
      key   = "documentParameters"
      value = jsonencode({ DurationSeconds = "300", InstallDependencies = "True" })
    }
    parameter {
      key   = "duration"
      value = "PT6M"
    }

    target {
      key   = "Instances"
      value = "asg-instances"
    }
  }

  target {
    name           = "asg-instances"
    resource_type  = "aws:ec2:instance"
    selection_mode = "COUNT(2)"

    resource_tag {
      key   = "aws:autoscaling:groupName"
      value = var.target_asg_name
    }
  }

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "terminate_experiment_id" {
  description = "FIS experiment template for instance termination"
  value       = aws_fis_experiment_template.terminate_instances.id
}

output "az_outage_experiment_id" {
  description = "FIS experiment template for AZ outage simulation"
  value       = aws_fis_experiment_template.az_outage.id
}

output "cpu_stress_experiment_id" {
  description = "FIS experiment template for CPU stress"
  value       = aws_fis_experiment_template.cpu_stress.id
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="target_role_arn=arn:aws:iam::123:role/FISRole" \
  -var="target_asg_name=my-app-asg" \
  -var="stop_conditions_alarm=arn:aws:cloudwatch:us-east-1:123:alarm:production-health"
```

## Important notes

- **Always start in test environments** before production — mistakes can cause real outages.
- Use **stop conditions** (CloudWatch alarms) to automatically halt experiments if they cause unexpected impact.
- This is an **advanced practice** recommended only for organizations with high availability requirements.
- Common experiments: instance termination, AZ outage, network latency injection, CPU/memory stress, DNS failure.
- Document results and use them to **drive architectural improvements** (redundancy, auto-scaling, failover).
- Requires a **skilled team** — chaos engineering without expertise creates chaos, not resilience.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/chaos-engineering/).
