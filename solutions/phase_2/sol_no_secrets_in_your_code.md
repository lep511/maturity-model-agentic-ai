# No Secrets in Your Code - AWS Secrets Manager

This solution configures AWS Secrets Manager for runtime secret retrieval, deploys git-secrets for pre-commit scanning, and sets up pipeline gates to block code containing secrets.

## Recommended file structure

```
secrets-management/
├── main.tf
├── setup-git-secrets.sh
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "secrets" {
  description = "Map of secret names to create"
  type = map(object({
    description = string
    secret_value = optional(string, "")
  }))
  default = {
    "app/database-password" = {
      description = "Application database password"
    }
    "app/api-key" = {
      description = "Third-party API key"
    }
  }
}

variable "rotation_days" {
  description = "Automatic rotation interval in days (0 to disable)"
  type        = number
  default     = 30
}

variable "allowed_roles" {
  description = "IAM role ARNs allowed to retrieve secrets"
  type        = list(string)
}

variable "project" {
  default = "secrets-management"
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

# Secrets Manager secrets
resource "aws_secretsmanager_secret" "this" {
  for_each = var.secrets

  name        = each.key
  description = each.value.description

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowAccess"
      Effect = "Allow"
      Principal = { AWS = var.allowed_roles }
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ]
      Resource = "*"
    }]
  })

  tags = var.tags
}

# KMS key for secret encryption
resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RootAccess"
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowSecretsManager"
        Effect = "Allow"
        Principal = { Service = "secretsmanager.amazonaws.com" }
        Action = ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"]
        Resource = "*"
      }
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project}-key"
  target_key_id = aws_kms_key.secrets.key_id
}
```

---

## 3. `setup-git-secrets.sh` (Developer machine setup)

```bash
#!/bin/bash
# Install git-secrets and configure for AWS patterns

# Install
brew install git-secrets  # macOS
# or: git clone https://github.com/awslabs/git-secrets.git && cd git-secrets && make install

# Register AWS patterns globally
git secrets --register-aws --global

# Install hooks in current repo
git secrets --install

# Add custom patterns (optional)
git secrets --add '[A-Z0-9]{20}'  # Potential access key IDs
git secrets --add 'password\s*=\s*.+'  # Hardcoded passwords

echo "git-secrets configured. Commits with secrets will be blocked."
```

---

## 4. Pipeline Integration (CodeBuild buildspec)

```yaml
version: 0.2

phases:
  install:
    commands:
      - git clone https://github.com/awslabs/git-secrets.git
      - cd git-secrets && make install && cd ..

  pre_build:
    commands:
      - git secrets --register-aws
      # Scan all files for secrets
      - git secrets --scan
      # Additional scanning with trufflehog
      - pip install trufflehog
      - trufflehog --regex --entropy=False .

  build:
    commands:
      - echo "No secrets detected. Proceeding with build."
```

---

## 5. Application Code Example (Python)

```python
import boto3
import json

def get_secret(secret_name, region="us-east-1"):
    """Retrieve secret from Secrets Manager at runtime"""
    client = boto3.client('secretsmanager', region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage — no credentials in code
db_creds = get_secret("app/database-password")
connection = connect(
    host=db_creds['host'],
    user=db_creds['username'],
    password=db_creds['password']
)
```

---

## 6. `outputs.tf`

```bash
output "secret_arns" {
  description = "ARNs of created secrets"
  value       = { for k, v in aws_secretsmanager_secret.this : k => v.arn }
}

output "kms_key_arn" {
  description = "KMS key ARN for secret encryption"
  value       = aws_kms_key.secrets.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var='allowed_roles=["arn:aws:iam::123:role/AppRole"]'

# Set up developer machines:
bash setup-git-secrets.sh
```

## Important notes

- **Never hardcode secrets** in code or config files — anyone with read access can extract them.
- Use **IAM Instance Profiles** (EC2), **execution roles** (Lambda), or **task roles** (ECS) to retrieve secrets at runtime without embedded credentials.
- **git-secrets** prevents accidentally committed secrets at the pre-commit stage.
- Configure pipelines to **block execution** when secrets are detected — fail fast.
- **Rotate secrets regularly** — Secrets Manager supports automatic rotation with Lambda.
- Hardcoded secrets are **difficult to rotate during an incident** — this is a critical operational risk.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/dont-store-secrets-in-code/).
