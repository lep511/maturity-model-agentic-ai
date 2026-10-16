# Secure EC2 Instances Management - AWS Systems Manager

This solution configures AWS Systems Manager Fleet Manager and Session Manager as a secure alternative to SSH/RDP, with full audit logging and no open inbound ports.

## Recommended file structure

```
ssm-management/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_id" {
  description = "VPC ID (for VPC endpoints if no NAT Gateway)"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for VPC endpoints"
  type        = list(string)
  default     = []
}

variable "use_vpc_endpoints" {
  description = "Use VPC endpoints instead of NAT Gateway for SSM connectivity"
  type        = bool
  default     = false
}

variable "session_log_bucket" {
  description = "S3 bucket for session logs"
  type        = string
  default     = ""
}

variable "project" {
  default = "ssm-management"
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

# IAM Instance Profile for SSM
resource "aws_iam_role" "ssm_instance" {
  name = "${var.project}-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ssm_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm" {
  name = "${var.project}-profile"
  role = aws_iam_role.ssm_instance.name
}

# VPC Endpoints for SSM (if no NAT Gateway available)
resource "aws_security_group" "vpce" {
  count = var.use_vpc_endpoints ? 1 : 0

  name        = "${var.project}-vpce-sg"
  description = "Security group for SSM VPC endpoints"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  tags = var.tags
}

resource "aws_vpc_endpoint" "ssm" {
  count = var.use_vpc_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.us-east-1.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpce[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, { Name = "${var.project}-ssm-endpoint" })
}

resource "aws_vpc_endpoint" "ssmmessages" {
  count = var.use_vpc_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.us-east-1.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpce[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, { Name = "${var.project}-ssmmessages-endpoint" })
}

resource "aws_vpc_endpoint" "ec2messages" {
  count = var.use_vpc_endpoints ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.us-east-1.ec2messages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpce[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, { Name = "${var.project}-ec2messages-endpoint" })
}

# Session Manager logging configuration
resource "aws_ssm_document" "session_prefs" {
  name            = "SSM-SessionManagerRunShell"
  document_type   = "Session"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "1.0"
    description   = "Session Manager preferences"
    sessionType   = "Standard_Stream"
    inputs = {
      cloudWatchLogGroupName      = aws_cloudwatch_log_group.sessions.name
      cloudWatchEncryptionEnabled = true
      s3BucketName                = var.session_log_bucket
      s3EncryptionEnabled         = true
      idleSessionTimeout          = "20"
      shellProfile = {
        linux   = "exec /bin/bash"
        windows = ""
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "sessions" {
  name              = "/aws/ssm/${var.project}-sessions"
  retention_in_days = 90
  tags              = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "instance_profile_name" {
  description = "Instance profile to attach to EC2 instances"
  value       = aws_iam_instance_profile.ssm.name
}

output "instance_profile_arn" {
  description = "Instance profile ARN"
  value       = aws_iam_instance_profile.ssm.arn
}

output "session_log_group" {
  description = "CloudWatch Log Group for session logs"
  value       = aws_cloudwatch_log_group.sessions.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="vpc_id=vpc-xxx"

# With VPC endpoints (no NAT Gateway needed):
terraform apply \
  -var="vpc_id=vpc-xxx" \
  -var="use_vpc_endpoints=true" \
  -var='private_subnet_ids=["subnet-a","subnet-b"]'
```

## Connecting to instances

```bash
# Start a session (replaces SSH)
aws ssm start-session --target i-xxxxxxxxx

# Port forwarding (replaces SSH tunneling)
aws ssm start-session --target i-xxxxxxxxx \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["5432"]}'

# Fleet Manager (console) — RDP equivalent for Windows with IAM Identity Center
```

## Important notes

- **No open inbound ports required** — eliminates SSH/RDP attack surface entirely.
- Requires only: SSM Agent (pre-installed on AL2023, AL2, Ubuntu) + IAM Instance Profile + network access to SSM endpoint.
- Network access options: **NAT Gateway** (simplest) or **VPC Endpoints** (for fully private subnets).
- **Full session logging** — every command is recorded in CloudWatch Logs and optionally S3.
- **Fleet Manager** supports RDP-equivalent access to Windows instances via IAM Identity Center (one-click login).
- Both Fleet Manager and Session Manager are **free** — no additional cost.
- Remove ports 22/3389 from Security Groups after migrating to SSM.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/fleet-manager/).
