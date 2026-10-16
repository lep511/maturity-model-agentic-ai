# Alert on Root Account Logins - EventBridge + Lambda + SNS

This solution uses Lambda to:

- Extract key information from the event (IP, time, MFA used, User Agent, etc.)
- Build a clear, well-formatted message
- Send the enriched message via SNS (email)

## Recommended file structure

```
root-login-alert/
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
  description = "Email address to receive alerts"
  type        = string
}

variable "project" {
  default = "root-login-alert"
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
from datetime import datetime

sns = boto3.client('sns')
SNS_TOPIC_ARN = os.environ['SNS_TOPIC_ARN']

def lambda_handler(event, context):
    try:
        detail = event['detail']
        user_identity = detail.get('userIdentity', {})
        response = detail.get('responseElements', {})
        additional = detail.get('additionalEventData', {})

        account_id = user_identity.get('accountId', 'N/A')
        source_ip = detail.get('sourceIPAddress', 'N/A')
        user_agent = detail.get('userAgent', 'N/A')
        event_time = detail.get('eventTime', 'N/A')
        mfa_used = additional.get('MFAUsed', 'Unknown')
        login_result = response.get('ConsoleLogin', 'Unknown')

        message = f"""
CRITICAL ALERT: Root User Login Detected

Time: {event_time}
Account: {account_id}
IP: {source_ip}
MFA: {mfa_used}
Result: {login_result}
User Agent: {user_agent}

Root logins should be EXTREMELY rare.
Investigate immediately if you did not initiate this session.
        """

        subject = f"ROOT LOGIN - Account {account_id} - IP {source_ip}"

        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=message.strip()
        )

        print("Alert sent successfully")
        return {'statusCode': 200}

    except Exception as e:
        print(f"Error: {str(e)}")
        return {'statusCode': 500}
```

---

## 3. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"   # Required — Root login events always appear in this region
}

# SNS Topic
resource "aws_sns_topic" "root_alert" {
  name = "${var.project}-topic"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.root_alert.arn
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
      Resource = aws_sns_topic.root_alert.arn
    }]
  })
}

# Lambda Function
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "root_alert" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project}-lambda"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.root_alert.arn
    }
  }

  tags = var.tags
}

# EventBridge Rule
resource "aws_cloudwatch_event_rule" "root_login" {
  name        = "${var.project}-rule"
  description = "Alert when the Root user signs in"

  event_pattern = jsonencode({
    "detail-type" = ["AWS Console Sign In via CloudTrail"]
    "detail" = {
      "userIdentity" = {
        "type" = ["Root"]
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.root_login.name
  target_id = "SendToLambda"
  arn       = aws_lambda_function.root_alert.arn
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.root_alert.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.root_login.arn
}

```

---

## 4. `outputs.tf`

```bash
output "sns_topic_arn" {
  description = "ARN of the SNS topic for root login alerts"
  value       = aws_sns_topic.root_alert.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function processing root login events"
  value       = aws_lambda_function.root_alert.function_name
}

output "eventbridge_rule_arn" {
  description = "ARN of the EventBridge rule monitoring root logins"
  value       = aws_cloudwatch_event_rule.root_login.arn
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="notification_email=your-email@example.com"
```

## Important notes

- Deploy in **`us-east-1`** — Root login events always appear in this region regardless of where the user connects.
- Confirm the SNS email subscription after deployment.
- Test by signing in with the Root user (preferably in a test account).
- The enriched message is far more actionable than the raw EventBridge event.
