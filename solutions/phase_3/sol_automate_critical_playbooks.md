# Automate Critical Playbooks - Security Automation

This solution implements automated security response using EventBridge, Step Functions, and Lambda for common incident scenarios, plus the AWS Automated Security Response solution.

## Recommended file structure

```
automated-response/
├── main.tf
├── lambda/
│   ├── isolate_instance.py
│   ├── disable_access_key.py
│   └── block_ip_waf.py
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "forensics_sg_id" {
  description = "Security Group ID for instance isolation (deny all)"
  type        = string
}

variable "notification_email" {
  description = "Email for automated response notifications"
  type        = string
}

variable "waf_web_acl_arn" {
  description = "WAF WebACL ARN for IP blocking"
  type        = string
  default     = ""
}

variable "project" {
  default = "automated-response"
}

variable "tags" {
  default = {}
}
```

---

## 2. `lambda/isolate_instance.py`

```python
import json
import boto3

ec2 = boto3.client('ec2')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """Isolate a compromised EC2 instance by replacing its Security Groups"""
    detail = event['detail']
    instance_id = detail['resource']['instanceDetails']['instanceId']
    forensics_sg = event.get('forensics_sg_id', '')

    # Replace all SGs with forensics-only SG
    ec2.modify_instance_attribute(
        InstanceId=instance_id,
        Groups=[forensics_sg]
    )

    # Create EBS snapshots for forensics
    response = ec2.describe_instances(InstanceIds=[instance_id])
    for res in response['Reservations']:
        for inst in res['Instances']:
            for vol in inst.get('BlockDeviceMappings', []):
                ec2.create_snapshot(
                    VolumeId=vol['Ebs']['VolumeId'],
                    Description=f"Forensic - {instance_id}",
                    TagSpecifications=[{
                        'ResourceType': 'snapshot',
                        'Tags': [
                            {'Key': 'incident', 'Value': 'true'},
                            {'Key': 'source-instance', 'Value': instance_id}
                        ]
                    }]
                )

    # Tag instance
    ec2.create_tags(
        Resources=[instance_id],
        Tags=[{'Key': 'incident-isolated', 'Value': 'true'}]
    )

    return {'statusCode': 200, 'instance': instance_id, 'action': 'isolated'}
```

---

## 3. `lambda/disable_access_key.py`

```python
import json
import boto3

iam = boto3.client('iam')

def lambda_handler(event, context):
    """Disable a compromised IAM access key"""
    detail = event['detail']
    access_key_id = detail['resource']['accessKeyDetails']['accessKeyId']
    user_name = detail['resource']['accessKeyDetails']['userName']

    # Disable the access key
    iam.update_access_key(
        UserName=user_name,
        AccessKeyId=access_key_id,
        Status='Inactive'
    )

    # Attach deny-all policy to revoke active sessions
    iam.put_user_policy(
        UserName=user_name,
        PolicyName='IncidentDenyAll',
        PolicyDocument=json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Deny",
                "Action": "*",
                "Resource": "*"
            }]
        })
    )

    return {'statusCode': 200, 'user': user_name, 'action': 'key_disabled_sessions_revoked'}
```

---

## 4. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# Lambda Role
resource "aws_iam_role" "response_lambda" {
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

resource "aws_iam_role_policy" "response_permissions" {
  role = aws_iam_role.response_lambda.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:ModifyInstanceAttribute",
          "ec2:DescribeInstances",
          "ec2:CreateSnapshot",
          "ec2:CreateTags",
          "iam:UpdateAccessKey",
          "iam:PutUserPolicy",
          "sns:Publish"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.response_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda Functions
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "isolate_instance" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project}-isolate-instance"
  role            = aws_iam_role.response_lambda.arn
  handler         = "isolate_instance.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 60

  environment {
    variables = {
      FORENSICS_SG_ID = var.forensics_sg_id
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "disable_key" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project}-disable-key"
  role            = aws_iam_role.response_lambda.arn
  handler         = "disable_access_key.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30

  tags = var.tags
}

# EventBridge: Auto-isolate on CryptoCurrency/C2 findings
resource "aws_cloudwatch_event_rule" "crypto_c2" {
  name        = "${var.project}-crypto-c2"
  description = "Auto-isolate instances with crypto/C2 activity"

  event_pattern = jsonencode({
    "source"      = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
    "detail" = {
      "type" = [
        { "prefix" = "CryptoCurrency:" },
        { "prefix" = "Backdoor:EC2/C&CActivity" }
      ]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "isolate" {
  rule      = aws_cloudwatch_event_rule.crypto_c2.name
  target_id = "IsolateInstance"
  arn       = aws_lambda_function.isolate_instance.arn
}

resource "aws_lambda_permission" "allow_crypto_rule" {
  statement_id  = "AllowCryptoRule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.isolate_instance.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.crypto_c2.arn
}
```

---

## 5. `outputs.tf`

```bash
output "isolate_function" {
  description = "Lambda function for instance isolation"
  value       = aws_lambda_function.isolate_instance.function_name
}

output "disable_key_function" {
  description = "Lambda function for access key disabling"
  value       = aws_lambda_function.disable_key.function_name
}

output "crypto_c2_rule" {
  description = "EventBridge rule for crypto/C2 auto-response"
  value       = aws_cloudwatch_event_rule.crypto_c2.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="forensics_sg_id=sg-xxxxxxxxx" \
  -var="notification_email=security@yourcompany.com"
```

## Important notes

- **Automate steps requiring no human judgment** — isolation, snapshot creation, key disabling.
- Start with the **most frequent and critical** playbooks (cryptocurrency mining, C2 connections, exposed keys).
- Even **manually-triggered Lambda functions** improve response time and consistency.
- The **AWS Automated Security Response** solution provides pre-built remediations for CIS non-compliances.
- Use **Security Hub Automations** to trigger actions based on finding type or severity.
- Always preserve evidence (EBS snapshots) **before** taking containment actions.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/automate-critical-playbooks/).
