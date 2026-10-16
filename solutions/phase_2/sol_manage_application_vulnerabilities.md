# Manage Application Vulnerabilities - Amazon Inspector

This solution configures Amazon Inspector for application scanning across the pipeline, integrates with ECR for container image scanning, and sets up alerting for critical findings.

## Recommended file structure

```
app-vuln-scanning/
├── main.tf
├── buildspec-security.yml
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "notification_email" {
  description = "Email for critical vulnerability alerts"
  type        = string
}

variable "ecr_repositories" {
  description = "List of ECR repository names to scan"
  type        = list(string)
  default     = []
}

variable "enable_lambda_scanning" {
  description = "Enable Lambda function code scanning"
  type        = bool
  default     = true
}

variable "project" {
  default = "app-vuln-scanning"
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

# Enable Amazon Inspector v2
resource "aws_inspector2_enabler" "this" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = compact([
    "ECR",
    var.enable_lambda_scanning ? "LAMBDA" : "",
    var.enable_lambda_scanning ? "LAMBDA_CODE" : ""
  ])
}

data "aws_caller_identity" "current" {}

# ECR repositories with scan-on-push
resource "aws_ecr_repository" "scanned" {
  for_each = toset(var.ecr_repositories)

  name                 = each.value
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

# SNS for critical findings
resource "aws_sns_topic" "vuln_alerts" {
  name = "${var.project}-alerts"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.vuln_alerts.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# EventBridge rule for critical Inspector findings
resource "aws_cloudwatch_event_rule" "critical_vulns" {
  name        = "${var.project}-critical"
  description = "Alert on critical vulnerability findings"

  event_pattern = jsonencode({
    "source"      = ["aws.inspector2"]
    "detail-type" = ["Inspector2 Finding"]
    "detail" = {
      "severity" = ["CRITICAL"]
      "status"   = ["ACTIVE"]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.critical_vulns.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.vuln_alerts.arn
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.vuln_alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.vuln_alerts.arn
    }]
  })
}
```

---

## 3. `buildspec-security.yml` (CodeBuild SAST/SCA integration)

```yaml
version: 0.2

phases:
  install:
    commands:
      - pip install bandit safety
      - npm install -g snyk

  pre_build:
    commands:
      # SAST — Python static analysis
      - bandit -r src/ -f json -o bandit-report.json || true
      # SCA — check dependencies for known CVEs
      - safety check --json > safety-report.json || true
      # Container scanning via Inspector
      - aws inspector2 list-findings --filter-criteria '{"severity":[{"comparison":"EQUALS","value":"CRITICAL"}]}' > inspector-findings.json

  build:
    commands:
      # Fail build if critical vulnerabilities found
      - |
        CRITICAL_COUNT=$(cat inspector-findings.json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('findings',[])))")
        if [ "$CRITICAL_COUNT" -gt "0" ]; then
          echo "CRITICAL vulnerabilities found. Blocking deployment."
          exit 1
        fi

artifacts:
  files:
    - bandit-report.json
    - safety-report.json
    - inspector-findings.json
```

---

## 4. `outputs.tf`

```bash
output "inspector_status" {
  description = "Inspector enablement status"
  value       = "Enabled for ECR${var.enable_lambda_scanning ? ", Lambda, Lambda Code" : ""}"
}

output "alerts_topic_arn" {
  description = "SNS topic for critical vulnerability alerts"
  value       = aws_sns_topic.vuln_alerts.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="notification_email=security@yourcompany.com" \
  -var='ecr_repositories=["my-app","my-api"]'
```

## Important notes

- Scan at **multiple stages**: IDE (Amazon Q Developer), pipeline (Inspector SAST/SCA), image repository (ECR), and runtime (Lambda).
- **A WAF alone is insufficient** — application scanning is still required to find logic flaws and dependency vulnerabilities.
- The open-source **Automated Security Helper (ASH)** supports Git, Python, JavaScript, CloudFormation, and Terraform scanning.
- **Critical vulnerabilities should block production promotion** — configure pipeline gates.
- Use **immutable image tags** in ECR to ensure scanned images are not overwritten.
- Perform **penetration testing** on critical applications (allowed by AWS without prior approval for most services).
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/application-security-testing/).
