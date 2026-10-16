# Use Temporary Credentials - IAM Roles

This solution migrates workloads from IAM users and long-term access keys to IAM roles with temporary credentials across EC2, Lambda, ECS, and CI/CD pipelines.

## Recommended file structure

```
temporary-credentials/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "app_name" {
  description = "Application name for role naming"
  type        = string
  default     = "my-app"
}

variable "allowed_services" {
  description = "AWS services the application needs access to"
  type        = list(string)
  default     = ["s3", "dynamodb", "sqs"]
}

variable "s3_bucket_arns" {
  description = "S3 bucket ARNs the application needs access to"
  type        = list(string)
  default     = []
}

variable "project" {
  default = "temporary-credentials"
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

# EC2 Instance Role (replaces access keys on instances)
resource "aws_iam_role" "ec2_app" {
  name = "${var.app_name}-ec2-role"

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

resource "aws_iam_instance_profile" "ec2_app" {
  name = "${var.app_name}-ec2-profile"
  role = aws_iam_role.ec2_app.name
}

# Lambda Execution Role (replaces access keys in Lambda)
resource "aws_iam_role" "lambda_app" {
  name = "${var.app_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_app.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ECS Task Role (replaces access keys in containers)
resource "aws_iam_role" "ecs_task" {
  name = "${var.app_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = var.tags
}

# Least-privilege application policy (shared across roles)
resource "aws_iam_policy" "app_permissions" {
  name        = "${var.app_name}-permissions"
  description = "Application-specific permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = flatten([
          for arn in var.s3_bucket_arns : [arn, "${arn}/*"]
        ])
      },
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/${var.app_name}-*"
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ]
        Resource = "arn:aws:sqs:*:*:${var.app_name}-*"
      }
    ]
  })

  tags = var.tags
}

# Attach policy to all roles
resource "aws_iam_role_policy_attachment" "ec2_app" {
  role       = aws_iam_role.ec2_app.name
  policy_arn = aws_iam_policy.app_permissions.arn
}

resource "aws_iam_role_policy_attachment" "lambda_app" {
  role       = aws_iam_role.lambda_app.name
  policy_arn = aws_iam_policy.app_permissions.arn
}

resource "aws_iam_role_policy_attachment" "ecs_task" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.app_permissions.arn
}

# GitHub Actions OIDC (replaces access keys in CI/CD)
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = var.tags
}

resource "aws_iam_role" "github_actions" {
  name = "${var.app_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:your-org/${var.app_name}:*"
        }
      }
    }]
  })

  tags = var.tags
}
```

---

## 3. `outputs.tf`

```bash
output "ec2_instance_profile" {
  description = "EC2 instance profile name (attach to instances)"
  value       = aws_iam_instance_profile.ec2_app.name
}

output "lambda_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_app.arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "github_actions_role_arn" {
  description = "GitHub Actions OIDC role ARN"
  value       = aws_iam_role.github_actions.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="app_name=my-service" \
  -var='s3_bucket_arns=["arn:aws:s3:::my-data-bucket"]'
```

## Migration steps (from access keys to roles)

```markdown
1. Identify all IAM users with access keys:
   aws iam generate-credential-report && aws iam get-credential-report

2. For each access key:
   a. Determine what service uses it (EC2, Lambda, CI/CD, local development)
   b. Create the appropriate IAM role (instance profile, execution role, OIDC)
   c. Update application code to use the SDK default credential chain
   d. Test with the new role
   e. Disable the access key (do not delete — wait 30 days)
   f. After 30 days with no errors, delete the key

3. For secrets that cannot be replaced by roles (database passwords):
   - Migrate to AWS Secrets Manager
   - Application retrieves at runtime using its IAM role
```

---

## Important notes

- IAM roles provide **auto-rotating, time-bound credentials** with no embedded secrets.
- Access keys are **not auto-rotated**, may be retained by ex-employees, and are hard to rotate in an emergency.
- The AWS SDK **automatically retrieves role credentials** — no code changes needed beyond removing hardcoded keys.
- Use **OIDC federation** for CI/CD (GitHub Actions, GitLab) instead of storing access keys in pipeline secrets.
- For secrets that cannot be replaced by roles (database passwords), use **AWS Secrets Manager**.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/temporary-credentials/).
