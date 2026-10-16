# Redundancy Using Multiple Availability Zones

This solution deploys a multi-AZ architecture with Auto Scaling, RDS Multi-AZ, and health checks to eliminate single points of failure.

## Recommended file structure

```
multi-az/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs across multiple AZs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "min_instances" {
  description = "Minimum instances in Auto Scaling group"
  type        = number
  default     = 2
}

variable "max_instances" {
  description = "Maximum instances in Auto Scaling group"
  type        = number
  default     = 6
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "project" {
  default = "multi-az"
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

# Application Load Balancer (spans multiple AZs)
resource "aws_lb" "main" {
  name               = "${var.project}-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true

  tags = var.tags
}

resource "aws_lb_target_group" "main" {
  name     = "${var.project}-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }

  tags = var.tags
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

# Auto Scaling Group (spans multiple AZs)
resource "aws_launch_template" "main" {
  name_prefix   = "${var.project}-"
  instance_type = var.instance_type
  image_id      = data.aws_ami.al2023.id

  metadata_options {
    http_tokens = "required"
  }

  tag_specifications {
    resource_type = "instance"
    tags          = merge(var.tags, { Name = "${var.project}-instance" })
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_autoscaling_group" "main" {
  name                = "${var.project}-asg"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.main.arn]
  min_size            = var.min_instances
  max_size            = var.max_instances
  desired_capacity    = var.min_instances

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "${var.project}-asg-instance"
    propagate_at_launch = true
  }
}

# RDS Multi-AZ
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet"
  subnet_ids = var.private_subnet_ids
  tags       = var.tags
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_encrypted     = true

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  backup_retention_period = 7
  deletion_protection    = true

  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project}-final-snapshot"

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "asg_name" {
  description = "Auto Scaling Group name"
  value       = aws_autoscaling_group.main.name
}

output "db_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
}

output "availability_zones" {
  description = "AZs used for deployment"
  value       = aws_autoscaling_group.main.availability_zones
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="vpc_id=vpc-xxx" \
  -var='private_subnet_ids=["subnet-a","subnet-b","subnet-c"]' \
  -var='public_subnet_ids=["subnet-d","subnet-e","subnet-f"]'
```

## Important notes

- AWS Availability Zones are **physically separated by up to 100km** — a disaster in one rarely affects others.
- Use **minimum 2 AZs** for production (3 AZs recommended for critical workloads).
- **ALB** distributes traffic across AZs and performs health checks to route away from unhealthy instances.
- **RDS Multi-AZ** provides automatic failover — the standby promotes within 1-2 minutes.
- **Auto Scaling** replaces failed instances automatically — no manual intervention needed.
- For stateless applications, ensure **session data** is stored externally (ElastiCache, DynamoDB) rather than on-instance.
- Distance between AZs is small enough to avoid **significant latency impact** (< 2ms typically).
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/multi-az/).
