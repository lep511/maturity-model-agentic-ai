# IAM Policy Generation Pipeline

This solution implements an automated IAM-as-code pipeline that validates policies against least-privilege rules, blocks wildcards, and integrates Access Analyzer validation before deployment.

## Recommended file structure

```
iam-pipeline/
├── main.tf
├── lambda/
│   └── validate_policy.py
├── buildspec.yml
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "project" {
  description = "Project name prefix for resources"
  type        = string
  default     = "iam-pipeline"
}

variable "tags" {
  default = {}
}
```

---

## 2. `lambda/validate_policy.py`

```python
import json
import boto3

analyzer = boto3.client('accessanalyzer')

def lambda_handler(event, context):
    """Validate IAM policy against least-privilege rules"""
    policy_document = event['policy_document']
    policy_name = event.get('policy_name', 'unknown')
    violations = []

    # Check for wildcard actions
    for statement in policy_document.get('Statement', []):
        actions = statement.get('Action', [])
        if isinstance(actions, str):
            actions = [actions]
        resources = statement.get('Resource', [])
        if isinstance(resources, str):
            resources = [resources]

        for action in actions:
            if '*' in action and action != 'sts:AssumeRole':
                violations.append(f"Wildcard action '{action}' in policy '{policy_name}'")

        for resource in resources:
            if resource == '*' and statement.get('Effect') == 'Allow':
                violations.append(f"Wildcard resource '*' with Allow in policy '{policy_name}'")

    # Validate with IAM Access Analyzer
    validation = analyzer.validate_policy(
        policyDocument=json.dumps(policy_document),
        policyType='IDENTITY_POLICY'
    )

    for finding in validation.get('findings', []):
        if finding['findingType'] in ['ERROR', 'SECURITY_WARNING']:
            violations.append(f"Access Analyzer: {finding['findingType']} - {finding['issueCode']}")

    return {
        'policy_name': policy_name,
        'valid': len(violations) == 0,
        'violations': violations
    }
```

---

## 3. `buildspec.yml`

```yaml
version: 0.2

phases:
  install:
    commands:
      - pip install cfn-lint boto3

  pre_build:
    commands:
      # Validate all IAM policy templates
      - |
        FAILED=0
        for template in iam-policies/*.json; do
          echo "Validating $template..."
          RESULT=$(aws lambda invoke --function-name iam-policy-validator \
            --payload "{\"policy_document\": $(cat $template), \"policy_name\": \"$template\"}" \
            /tmp/result.json && cat /tmp/result.json)

          VALID=$(echo $RESULT | python3 -c "import json,sys; print(json.load(sys.stdin)['valid'])")
          if [ "$VALID" = "False" ]; then
            echo "FAILED: $template"
            echo $RESULT | python3 -c "import json,sys; [print(f'  - {v}') for v in json.load(sys.stdin)['violations']]"
            FAILED=1
          fi
        done
        if [ $FAILED -eq 1 ]; then exit 1; fi

  build:
    commands:
      - echo "All policies validated. Deploying..."
      - aws cloudformation deploy --template-file iam-stack.yaml --stack-name iam-policies --capabilities CAPABILITY_NAMED_IAM
```

---

## 4. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# Lambda validator function
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "validator" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "iam-policy-validator"
  role            = aws_iam_role.validator.arn
  handler         = "validate_policy.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30

  tags = var.project != "" ? { Project = var.project } : {}
}

resource "aws_iam_role" "validator" {
  name = "${var.project}-validator-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "validator" {
  role = aws_iam_role.validator.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["access-analyzer:ValidatePolicy"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "validator_basic" {
  role       = aws_iam_role.validator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

---

## 5. `outputs.tf`

```bash
output "validator_function" {
  description = "IAM policy validation Lambda function"
  value       = aws_lambda_function.validator.function_name
}

output "validator_arn" {
  description = "Validator Lambda ARN (for pipeline integration)"
  value       = aws_lambda_function.validator.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply
```

## Important notes

- Treat IAM as code: teams define policies in **version-controlled templates**, not the console.
- The pipeline **automatically rejects wildcards** in Action or Resource fields before deployment.
- **IAM Access Analyzer** validates policies for security warnings, errors, and overly permissive patterns.
- Approvals can be **manual or automatic** depending on environment and risk level (auto for sandbox, manual for prod).
- At scale, IAM governance requires an **automated pipeline** rather than ad-hoc policy creation.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/iam-pipelines/).
