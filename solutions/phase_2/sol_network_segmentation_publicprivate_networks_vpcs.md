# Network Segmentation - Public/Private Networks (VPCs)

This solution creates a well-segmented VPC with public, private, and isolated subnets across multiple AZs, with NAT Gateway for outbound access from private subnets.

## Recommended file structure

```
vpc-segmentation/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "AZs to deploy subnets in"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet outbound access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway (cost savings) vs one per AZ (high availability)"
  type        = bool
  default     = false
}

variable "project" {
  default = "vpc-segmentation"
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

locals {
  az_count = length(var.availability_zones)
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, { Name = "${var.project}-vpc" })
}

# Internet Gateway (for public subnets)
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(var.tags, { Name = "${var.project}-igw" })
}

# Public Subnets (ALBs, NAT Gateways, bastion hosts)
resource "aws_subnet" "public" {
  count = local.az_count

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, { Name = "${var.project}-public-${var.availability_zones[count.index]}" })
}

# Private Subnets (web servers, application tier)
resource "aws_subnet" "private" {
  count = local.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + local.az_count)
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, { Name = "${var.project}-private-${var.availability_zones[count.index]}" })
}

# Isolated Subnets (databases, no internet access)
resource "aws_subnet" "isolated" {
  count = local.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + (local.az_count * 2))
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, { Name = "${var.project}-isolated-${var.availability_zones[count.index]}" })
}

# NAT Gateway (allows private subnets outbound internet access)
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0
  domain = "vpc"
  tags   = merge(var.tags, { Name = "${var.project}-nat-eip-${count.index}" })
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, { Name = "${var.project}-nat-${count.index}" })
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.tags, { Name = "${var.project}-public-rt" })
}

resource "aws_route_table_association" "public" {
  count          = local.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 1
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[var.single_nat_gateway ? 0 : count.index].id
    }
  }

  tags = merge(var.tags, { Name = "${var.project}-private-rt-${count.index}" })
}

resource "aws_route_table_association" "private" {
  count          = local.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.single_nat_gateway ? 0 : count.index].id
}

# Isolated subnets have no route to internet
resource "aws_route_table" "isolated" {
  vpc_id = aws_vpc.main.id
  tags   = merge(var.tags, { Name = "${var.project}-isolated-rt" })
}

resource "aws_route_table_association" "isolated" {
  count          = local.az_count
  subnet_id      = aws_subnet.isolated[count.index].id
  route_table_id = aws_route_table.isolated.id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/${var.project}-flow-logs"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_iam_role" "flow_logs" {
  name = "${var.project}-flow-logs-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
    }]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "flow_logs" {
  role       = aws_iam_role.flow_logs.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}
```

---

## 3. `outputs.tf`

```bash
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (for ALBs)"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (for application tier)"
  value       = aws_subnet.private[*].id
}

output "isolated_subnet_ids" {
  description = "Isolated subnet IDs (for databases)"
  value       = aws_subnet.isolated[*].id
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="vpc_cidr=10.0.0.0/16"

# Cost-optimized (single NAT Gateway):
terraform apply -var="single_nat_gateway=true"
```

## Important notes

- Place **only internet-facing resources** (ALBs, NAT Gateways) in public subnets.
- **Databases and internal services** belong in isolated subnets with no internet route.
- NAT Gateway allows outbound access from private subnets without exposing them publicly.
- Use **one NAT Gateway per AZ** for production (high availability) or a single one for dev/sandbox (cost savings).
- **VPC Flow Logs** are essential for incident investigation — enable on all VPCs.
- Limit **VPC peering** to only what is necessary — use Transit Gateway for complex topologies.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/vpcs/).
