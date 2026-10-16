# Image Generation Pipeline - EC2 Image Builder

This solution creates a golden AMI pipeline that produces hardened, patched base images on a schedule and enforces their use via Config rules.

## Recommended file structure

```
golden-ami-pipeline/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "base_image" {
  description = "Base image ARN (Amazon Linux 2023, Ubuntu, etc.)"
  type        = string
  default     = "arn:aws:imagebuilder:us-east-1:aws:image/amazon-linux-2023-x86/x.x.x"
}

variable "schedule" {
  description = "Pipeline schedule (cron expression)"
  type        = string
  default     = "cron(0 0 ? * SUN *)"
}

variable "vpc_id" {
  description = "VPC ID for the build instance"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for the build instance"
  type        = string
}

variable "project" {
  default = "golden-ami"
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

# Image Recipe — defines what goes into the AMI
resource "aws_imagebuilder_image_recipe" "golden" {
  name         = "${var.project}-recipe"
  parent_image = var.base_image
  version      = "1.0.0"

  # OS updates
  component {
    component_arn = "arn:aws:imagebuilder:us-east-1:aws:component/update-linux/x.x.x"
  }

  # SSM Agent (for Fleet Manager)
  component {
    component_arn = "arn:aws:imagebuilder:us-east-1:aws:component/amazon-cloudwatch-agent-linux/x.x.x"
  }

  # CIS Benchmark hardening
  component {
    component_arn = "arn:aws:imagebuilder:us-east-1:aws:component/stig-build-linux-medium/x.x.x"
  }

  block_device_mapping {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  tags = var.tags
}

# Infrastructure Configuration
resource "aws_imagebuilder_infrastructure_configuration" "main" {
  name                  = "${var.project}-infra"
  instance_profile_name = aws_iam_instance_profile.builder.name
  instance_types        = ["t3.medium"]
  subnet_id             = var.subnet_id
  security_group_ids    = [aws_security_group.builder.id]
  terminate_instance_on_failure = true

  tags = var.tags
}

# Security Group for build instances (no inbound, outbound for updates)
resource "aws_security_group" "builder" {
  name        = "${var.project}-builder-sg"
  description = "Image Builder instance - no inbound"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

# Distribution Configuration — share and tag the AMI
resource "aws_imagebuilder_distribution_configuration" "main" {
  name = "${var.project}-distribution"

  distribution {
    region = "us-east-1"

    ami_distribution_configuration {
      name        = "${var.project}-{{imagebuilder:buildDate}}"
      description = "Golden AMI built on {{imagebuilder:buildDate}}"

      ami_tags = {
        approved   = "true"
        built-by   = "image-builder"
        build-date = "{{imagebuilder:buildDate}}"
      }
    }
  }

  tags = var.tags
}

# Image Pipeline — runs on schedule
resource "aws_imagebuilder_image_pipeline" "golden" {
  name                             = "${var.project}-pipeline"
  image_recipe_arn                 = aws_imagebuilder_image_recipe.golden.arn
  infrastructure_configuration_arn = aws_imagebuilder_infrastructure_configuration.main.arn
  distribution_configuration_arn   = aws_imagebuilder_distribution_configuration.main.arn

  schedule {
    schedule_expression                = var.schedule
    pipeline_execution_start_condition = "EXPRESSION_MATCH_ONLY"
  }

  image_tests_configuration {
    image_tests_enabled = true
    timeout_minutes     = 60
  }

  tags = var.tags
}

# IAM for Image Builder
resource "aws_iam_role" "builder" {
  name = "${var.project}-builder-role"
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

resource "aws_iam_role_policy_attachment" "builder_imagebuilder" {
  role       = aws_iam_role.builder.name
  policy_arn = "arn:aws:iam::aws:policy/EC2InstanceProfileForImageBuilder"
}

resource "aws_iam_role_policy_attachment" "builder_ssm" {
  role       = aws_iam_role.builder.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "builder" {
  name = "${var.project}-builder-profile"
  role = aws_iam_role.builder.name
}

# Config Rule — enforce approved AMIs
resource "aws_config_config_rule" "approved_amis" {
  name = "${var.project}-approved-amis"

  source {
    owner             = "AWS"
    source_identifier = "APPROVED_AMIS_BY_TAG"
  }

  input_parameters = jsonencode({
    amisByTagKeyAndValue = "approved:true"
  })

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "pipeline_arn" {
  description = "Image Builder pipeline ARN"
  value       = aws_imagebuilder_image_pipeline.golden.arn
}

output "recipe_arn" {
  description = "Image recipe ARN"
  value       = aws_imagebuilder_image_recipe.golden.arn
}

output "config_rule" {
  description = "Config rule enforcing approved AMIs"
  value       = aws_config_config_rule.approved_amis.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="vpc_id=vpc-xxx" \
  -var="subnet_id=subnet-xxx"
```

## Important notes

- Every golden AMI should: start from the **latest patched OS**, apply **CIS benchmark hardening**, and pre-install required agents (SSM, CloudWatch, anti-malware).
- **EC2 Image Builder is free** — you only pay for the EC2 instance during the build.
- Enforce approved AMI usage via **AWS Config rules** (approved-amis-by-tag or approved-amis-by-id) to prevent teams from launching arbitrary images.
- Run the pipeline **weekly** to ensure AMIs include the latest patches.
- Tag produced AMIs with `approved=true` and use the Config rule to detect non-compliant instances.
- Adopt the pipeline early — retrofitting hardened images later is significantly harder.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/ec2-image-builder/).
