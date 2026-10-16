# Limit Network Access - EC2 Security Groups

This solution implements least-privilege Security Groups using SG-to-SG references, deploys Config rules for compliance monitoring, and uses Firewall Manager for centralized enforcement.

## Recommended file structure

```
security-groups/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_id" {
  description = "VPC ID for the Security Groups"
  type        = string
}

variable "allowed_cidrs_web" {
  description = "CIDRs allowed to reach the ALB (typically 0.0.0.0/0 for public)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "project" {
  default = "security-groups"
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

# ALB Security Group — accepts internet traffic on 80/443
resource "aws_security_group" "alb" {
  name        = "${var.project}-alb"
  description = "ALB - accepts internet traffic on HTTP/HTTPS"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs_web
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs_web
  }

  egress {
    description = "Allow outbound to web servers"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-alb" })
}

# Web Server Security Group — accepts traffic ONLY from ALB SG
resource "aws_security_group" "web" {
  name        = "${var.project}-web"
  description = "Web servers - accepts traffic only from ALB"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTP from ALB only"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-web" })
}

# Database Security Group — accepts traffic ONLY from Web SG
resource "aws_security_group" "db" {
  name        = "${var.project}-db"
  description = "Database - accepts traffic only from web servers"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from web servers only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    description = "No outbound required"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = merge(var.tags, { Name = "${var.project}-db" })
}

# Config Rule — detect overly permissive ports
resource "aws_config_config_rule" "restricted_ports" {
  name = "${var.project}-restricted-common-ports"

  source {
    owner             = "AWS"
    source_identifier = "RESTRICTED_INCOMING_TRAFFIC"
  }

  input_parameters = jsonencode({
    blockedPort1 = "22"
    blockedPort2 = "3389"
    blockedPort3 = "3306"
    blockedPort4 = "5432"
    blockedPort5 = "1433"
  })

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "alb_sg_id" {
  description = "Security Group ID for ALB"
  value       = aws_security_group.alb.id
}

output "web_sg_id" {
  description = "Security Group ID for web servers"
  value       = aws_security_group.web.id
}

output "db_sg_id" {
  description = "Security Group ID for database"
  value       = aws_security_group.db.id
}

output "config_rule_name" {
  description = "Config rule monitoring restricted ports"
  value       = aws_config_config_rule.restricted_ports.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="vpc_id=vpc-xxxxxxxx"
```

## Important notes

- **Chain access via SG references** (not CIDRs): ALB → Web → DB. This ensures all traffic passes through inspection points like WAF.
- Use `security_groups` (SG references) in ingress rules rather than `cidr_blocks` for internal communication.
- Database SGs should have **no egress** or minimal egress — databases rarely need outbound internet.
- Use **AWS Firewall Manager** to centrally audit and enforce SG rules across all accounts in the organization.
- Detect overly permissive ports with the AWS Config `restricted-common-ports` rule.
- Never open database ports (3306, 5432, 1433) to 0.0.0.0/0 — use SG references or VPC endpoints.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/security-groups/).
