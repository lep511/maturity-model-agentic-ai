# Act on Critical Security Findings - Security Hub + EventBridge + Lambda + SNS + Slack

This solution uses Security Hub as the centralized findings aggregator, EventBridge to filter critical/high severity findings, and Lambda to send enriched notifications via SNS (email) and Slack.

## Recommended file structure

```
critical-findings-alert/
├── main.tf
├── lambda/
│   └── index.py
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "notification_email" {
  description = "Email address to receive critical finding alerts"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack Incoming Webhook URL for notifications"
  type        = string
  default     = ""
}

variable "project" {
  default = "critical-findings-alert"
}

variable "tags" {
  default = {}
}
```

---

## 2. `lambda/index.py`

```python
import json
import os
import boto3
from urllib.request import Request, urlopen
from urllib.error import URLError

sns = boto3.client('sns')
SNS_TOPIC_ARN = os.environ['SNS_TOPIC_ARN']
SLACK_WEBHOOK_URL = os.environ.get('SLACK_WEBHOOK_URL', '')

def lambda_handler(event, context):
    try:
        detail = event['detail']
        findings = detail.get('findings', [detail])

        for finding in findings:
            title = finding.get('Title', 'N/A')
            description = finding.get('Description', 'N/A')
            severity = finding.get('Severity', {}).get('Label', 'N/A')
            account_id = finding.get('AwsAccountId', 'N/A')
            region = finding.get('Region', 'N/A')
            resource_type = 'N/A'
            resource_id = 'N/A'
            product = finding.get('ProductName', finding.get('ProductArn', 'N/A'))
            created_at = finding.get('CreatedAt', 'N/A')
            remediation = finding.get('Remediation', {}).get('Recommendation', {}).get('Text', 'No remediation guidance available')
            remediation_url = finding.get('Remediation', {}).get('Recommendation', {}).get('Url', '')

            resources = finding.get('Resources', [])
            if resources:
                resource_type = resources[0].get('Type', 'N/A')
                resource_id = resources[0].get('Id', 'N/A')

            message = f"""
CRITICAL SECURITY FINDING

Severity: {severity}
Title: {title}
Description: {description}

Account: {account_id}
Region: {region}
Source: {product}
Time: {created_at}

Affected Resource:
  Type: {resource_type}
  ID: {resource_id}

Remediation: {remediation}
{f'Reference: {remediation_url}' if remediation_url else ''}

ACTION REQUIRED: Review this finding immediately.
If this indicates active compromise, open an AWS Support ticket to engage AWS CIRT.
            """

            subject = f"{severity} FINDING - {title[:80]} - Account {account_id}"

            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=subject[:100],
                Message=message.strip()
            )

            if SLACK_WEBHOOK_URL:
                slack_message = {
                    "blocks": [
                        {
                            "type": "header",
                            "text": {"type": "plain_text", "text": f"Security Finding: {severity}"}
                        },
                        {
                            "type": "section",
                            "fields": [
                                {"type": "mrkdwn", "text": f"*Title:*\n{title}"},
                                {"type": "mrkdwn", "text": f"*Account:*\n{account_id}"},
                                {"type": "mrkdwn", "text": f"*Region:*\n{region}"},
                                {"type": "mrkdwn", "text": f"*Resource:*\n{resource_id}"},
                                {"type": "mrkdwn", "text": f"*Source:*\n{product}"},
                                {"type": "mrkdwn", "text": f"*Time:*\n{created_at}"}
                            ]
                        },
                        {
                            "type": "section",
                            "text": {"type": "mrkdwn", "text": f"*Remediation:*\n{remediation}"}
                        }
                    ]
                }

                req = Request(
                    SLACK_WEBHOOK_URL,
                    data=json.dumps(slack_message).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                urlopen(req)

        print("Alerts sent successfully")
        return {'statusCode': 200}

    except Exception as e:
        print(f"Error: {str(e)}")
        return {'statusCode': 500}
```

---

## 3. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# Enable Security Hub (if not already enabled)
resource "aws_securityhub_account" "this" {}

# SNS Topic
resource "aws_sns_topic" "critical_findings" {
  name = "${var.project}-topic"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.critical_findings.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# Lambda Role
resource "aws_iam_role" "lambda_role" {
  name = "${var.project}-lambda-role"

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
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "sns_publish" {
  role = aws_iam_role.lambda_role.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sns:Publish"
      Resource = aws_sns_topic.critical_findings.arn
    }]
  })
}

# Lambda Function
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "critical_findings" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project}-lambda"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"

  environment {
    variables = {
      SNS_TOPIC_ARN     = aws_sns_topic.critical_findings.arn
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }

  tags = var.tags
}

# EventBridge Rule — Critical and High findings from Security Hub
resource "aws_cloudwatch_event_rule" "critical_findings" {
  name        = "${var.project}-rule"
  description = "Alert on CRITICAL and HIGH severity Security Hub findings"

  event_pattern = jsonencode({
    "source"      = ["aws.securityhub"]
    "detail-type" = ["Security Hub Findings - Imported"]
    "detail" = {
      "findings" = {
        "Severity" = {
          "Label" = ["CRITICAL", "HIGH"]
        }
        "Workflow" = {
          "Status" = ["NEW"]
        }
        "RecordState" = ["ACTIVE"]
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.critical_findings.name
  target_id = "SendToLambda"
  arn       = aws_lambda_function.critical_findings.arn
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.critical_findings.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.critical_findings.arn
}

```

---

## 4. `outputs.tf`

```bash
output "sns_topic_arn" {
  description = "ARN of the SNS topic for critical finding alerts"
  value       = aws_sns_topic.critical_findings.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function processing findings"
  value       = aws_lambda_function.critical_findings.function_name
}

output "eventbridge_rule_arn" {
  description = "ARN of the EventBridge rule filtering critical findings"
  value       = aws_cloudwatch_event_rule.critical_findings.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="notification_email=your-email@example.com" -var="slack_webhook_url=https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

## Important notes

- **Security Hub must be enabled** across all accounts and regions in your organization. Use a delegated administrator account for centralized visibility.
- The EventBridge rule filters for **CRITICAL and HIGH** severity with **NEW** workflow status to avoid duplicate alerts on already-triaged findings.
- Confirm the SNS email subscription after deployment.
- The Slack webhook is optional — leave it empty to use email-only notifications.
- Key finding types that require immediate action:
  - **AWS Abuse notifications** (potential account misuse)
  - **Exposed IAM Access Keys** (credential compromise)
  - **GuardDuty findings**: C2 connections, TOR client activity, cryptocurrency mining
- If you suspect active compromise, open an AWS Support ticket to engage the **AWS Customer Incident Response Team (CIRT)** — free assistance during active incidents.
- Ensure alerts reach **more than one person** to avoid single points of failure in incident response.
