# DevSecOps: Security in the Pipeline

This solution integrates security scanning at every CI/CD stage using CodePipeline, Inspector, Image Builder, and pipeline gates that block deployments on critical findings.

## Recommended file structure

```
devsecops-pipeline/
├── main.tf
├── buildspec-sast.yml
├── buildspec-image.yml
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "repository_name" {
  description = "CodeCommit or GitHub repository name"
  type        = string
}

variable "ecr_repository" {
  description = "ECR repository for container images"
  type        = string
}

variable "block_on_critical" {
  description = "Block deployment if critical vulnerabilities found"
  type        = bool
  default     = true
}

variable "project" {
  default = "devsecops-pipeline"
}

variable "tags" {
  default = {}
}
```

---

## 2. `buildspec-sast.yml` (Security scanning stage)

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.12
    commands:
      - pip install bandit safety semgrep
      - npm install -g @cyclonedx/cdxgen

  pre_build:
    commands:
      # SAST - static analysis
      - echo "Running SAST..."
      - semgrep --config auto --json -o semgrep-results.json src/ || true
      - bandit -r src/ -f json -o bandit-results.json || true

      # SCA - dependency scanning
      - echo "Running SCA..."
      - safety check --json > safety-results.json || true
      - cdxgen -o sbom.json

      # Secrets scanning
      - echo "Scanning for secrets..."
      - git secrets --scan || { echo "SECRETS FOUND - BLOCKING"; exit 1; }

  build:
    commands:
      # Evaluate results
      - |
        CRITICAL=$(python3 -c "
        import json
        findings = json.load(open('semgrep-results.json', 'r')).get('results', [])
        critical = [f for f in findings if f.get('extra', {}).get('severity', '') == 'ERROR']
        print(len(critical))
        ")
        echo "Critical findings: $CRITICAL"
        if [ "$CRITICAL" -gt "0" ] && [ "${BLOCK_ON_CRITICAL}" = "true" ]; then
          echo "CRITICAL vulnerabilities found. Blocking deployment."
          exit 1
        fi

artifacts:
  files:
    - semgrep-results.json
    - bandit-results.json
    - safety-results.json
    - sbom.json

environment:
  variables:
    BLOCK_ON_CRITICAL: "true"
```

---

## 3. `buildspec-image.yml` (Container image building and scanning)

```yaml
version: 0.2

phases:
  pre_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI

  build:
    commands:
      - docker build -t $IMAGE_NAME:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      - docker tag $IMAGE_NAME:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_URI/$IMAGE_NAME:latest
      - docker push $ECR_URI/$IMAGE_NAME:$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker push $ECR_URI/$IMAGE_NAME:latest

  post_build:
    commands:
      # Wait for Inspector scan to complete
      - echo "Waiting for Inspector scan..."
      - sleep 30
      - |
        FINDINGS=$(aws inspector2 list-findings \
          --filter-criteria '{"resourceId":[{"comparison":"EQUALS","value":"'$ECR_URI/$IMAGE_NAME:$CODEBUILD_RESOLVED_SOURCE_VERSION'"}],"severity":[{"comparison":"EQUALS","value":"CRITICAL"}]}' \
          --query 'findings | length(@)')
        if [ "$FINDINGS" -gt "0" ]; then
          echo "Critical vulnerabilities in container image. Blocking."
          exit 1
        fi
```

---

## 4. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# ECR repository with scan-on-push
resource "aws_ecr_repository" "app" {
  name                 = var.ecr_repository
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

# EC2 Image Builder — golden AMI pipeline
resource "aws_imagebuilder_image_pipeline" "golden" {
  name                             = "${var.project}-golden-ami"
  image_recipe_arn                 = aws_imagebuilder_image_recipe.golden.arn
  infrastructure_configuration_arn = aws_imagebuilder_infrastructure_configuration.main.arn

  schedule {
    schedule_expression = "cron(0 0 ? * SUN *)"
    pipeline_execution_start_condition = "EXPRESSION_MATCH_ONLY"
  }

  tags = var.tags
}

resource "aws_imagebuilder_image_recipe" "golden" {
  name         = "${var.project}-recipe"
  parent_image = "arn:aws:imagebuilder:us-east-1:aws:image/amazon-linux-2023-x86/x.x.x"
  version      = "1.0.0"

  component {
    component_arn = "arn:aws:imagebuilder:us-east-1:aws:component/update-linux/x.x.x"
  }

  component {
    component_arn = "arn:aws:imagebuilder:us-east-1:aws:component/amazon-cloudwatch-agent-linux/x.x.x"
  }

  tags = var.tags
}

resource "aws_imagebuilder_infrastructure_configuration" "main" {
  name                  = "${var.project}-infra"
  instance_profile_name = aws_iam_instance_profile.imagebuilder.name

  tags = var.tags
}

resource "aws_iam_role" "imagebuilder" {
  name = "${var.project}-imagebuilder"
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

resource "aws_iam_role_policy_attachment" "imagebuilder" {
  role       = aws_iam_role.imagebuilder.name
  policy_arn = "arn:aws:iam::aws:policy/EC2InstanceProfileForImageBuilder"
}

resource "aws_iam_role_policy_attachment" "imagebuilder_ssm" {
  role       = aws_iam_role.imagebuilder.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "imagebuilder" {
  name = "${var.project}-imagebuilder-profile"
  role = aws_iam_role.imagebuilder.name
}

# Config rule to enforce approved AMIs
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

## 5. `outputs.tf`

```bash
output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "image_pipeline_arn" {
  description = "Image Builder pipeline ARN"
  value       = aws_imagebuilder_image_pipeline.golden.arn
}

output "approved_amis_rule" {
  description = "Config rule enforcing approved AMIs"
  value       = aws_config_config_rule.approved_amis.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="repository_name=my-app" \
  -var="ecr_repository=my-app-images"
```

## Important notes

- Security must be a **mandatory pipeline stage**, not optional — block production on critical/high findings.
- Key scanning stages: **SAST** (code logic), **SCA** (dependencies/CVEs), **secrets** (pre-commit), **container** (image scan), **IaC** (cfn-guard).
- Build **golden AMIs** periodically with EC2 Image Builder — CIS hardened, patched, with required agents.
- Enforce approved AMIs via **Config rules** to prevent teams from launching arbitrary images.
- For unfixable third-party vulnerabilities, deploy **custom WAF rules** as a temporary compensating control.
- Generate **SBOMs** (Software Bill of Materials) for supply chain visibility.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/devsecops/).
