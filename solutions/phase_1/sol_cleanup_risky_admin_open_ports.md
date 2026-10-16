# Cleanup Risky Admin Open Ports - EC2 Security Groups + Systems Manager

This solution identifies and remediates Security Groups with ports 22 (SSH) and 3389 (RDP) open to 0.0.0.0/0, and configures AWS Systems Manager Fleet Manager as the secure alternative.

## Recommended file structure

```
cleanup-open-ports/
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
  description = "Email for notifications about open port findings"
  type        = string
}

variable "auto_remediate" {
  description = "Automatically revoke open SSH/RDP rules (use with caution)"
  type        = bool
  default     = false
}

variable "project" {
  default = "cleanup-open-ports"
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

ec2 = boto3.client('ec2')
sns = boto3.client('sns')
SNS_TOPIC_ARN = os.environ['SNS_TOPIC_ARN']
AUTO_REMEDIATE = os.environ.get('AUTO_REMEDIATE', 'false') == 'true'

RISKY_PORTS = [22, 3389]
OPEN_CIDRS = ['0.0.0.0/0', '::/0']

def lambda_handler(event, context):
    try:
        sgs = ec2.describe_security_groups()['SecurityGroups']
        findings = []

        for sg in sgs:
            for rule in sg.get('IpPermissions', []):
                from_port = rule.get('FromPort', 0)
                to_port = rule.get('ToPort', 0)

                for port in RISKY_PORTS:
                    if from_port <= port <= to_port:
                        for ip_range in rule.get('IpRanges', []):
                            if ip_range.get('CidrIp') in OPEN_CIDRS:
                                findings.append({
                                    'sg_id': sg['GroupId'],
                                    'sg_name': sg['GroupName'],
                                    'vpc_id': sg.get('VpcId', 'N/A'),
                                    'port': port,
                                    'cidr': ip_range['CidrIp']
                                })

                                if AUTO_REMEDIATE:
                                    ec2.revoke_security_group_ingress(
                                        GroupId=sg['GroupId'],
                                        IpPermissions=[{
                                            'IpProtocol': 'tcp',
                                            'FromPort': port,
                                            'ToPort': port,
                                            'IpRanges': [{'CidrIp': ip_range['CidrIp']}]
                                        }]
                                    )

        if findings:
            action = "REMEDIATED" if AUTO_REMEDIATE else "DETECTED"
            message = f"Open Admin Ports {action}\n\n"
            for f in findings:
                message += f"Security Group: {f['sg_id']} ({f['sg_name']})\n"
                message += f"  VPC: {f['vpc_id']}\n"
                message += f"  Port: {f['port']} open to {f['cidr']}\n\n"

            message += "Use AWS Systems Manager Fleet Manager instead of direct SSH/RDP.\n"

            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"Open Admin Ports {action} - {len(findings)} finding(s)",
                Message=message.strip()
            )

        return {'statusCode': 200, 'findings': len(findings)}

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

# SNS Topic
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-topic"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
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

resource "aws_iam_role_policy" "lambda_permissions" {
  role = aws_iam_role.lambda_role.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ec2:DescribeSecurityGroups", "ec2:RevokeSecurityGroupIngress"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts.arn
      }
    ]
  })
}

# Lambda Function
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "scanner" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project}-scanner"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 60

  environment {
    variables = {
      SNS_TOPIC_ARN  = aws_sns_topic.alerts.arn
      AUTO_REMEDIATE = tostring(var.auto_remediate)
    }
  }

  tags = var.tags
}

# Scheduled scan every 6 hours
resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "${var.project}-schedule"
  description         = "Scan for open admin ports every 6 hours"
  schedule_expression = "rate(6 hours)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.schedule.name
  target_id = "ScanOpenPorts"
  arn       = aws_lambda_function.scanner.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scanner.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}

# SSM Instance Profile for Fleet Manager (alternative to SSH/RDP)
resource "aws_iam_role" "ssm_instance" {
  name = "${var.project}-ssm-instance-role"

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

resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.ssm_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedEC2InstanceDefaultPolicy"
}

resource "aws_iam_instance_profile" "ssm" {
  name = "${var.project}-ssm-profile"
  role = aws_iam_role.ssm_instance.name
}
```

---

## 4. `outputs.tf`

```bash
output "lambda_function_name" {
  description = "Name of the scanner Lambda function"
  value       = aws_lambda_function.scanner.function_name
}

output "sns_topic_arn" {
  description = "ARN of the notification topic"
  value       = aws_sns_topic.alerts.arn
}

output "ssm_instance_profile_name" {
  description = "Instance profile for SSM Fleet Manager access"
  value       = aws_iam_instance_profile.ssm.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="notification_email=security@yourcompany.com"

# Enable auto-remediation (removes open rules automatically):
terraform apply -var="notification_email=security@yourcompany.com" -var="auto_remediate=true"
```

## Important notes

- Verify with **Security Hub controls EC2.13 and EC2.14**.
- The preferred alternative is **AWS Systems Manager Fleet Manager** — requires no open inbound ports, only SSM Agent and an instance profile.
- If Fleet Manager is not feasible, use **EC2 Instance Connect** or restrict access to known IP ranges.
- Start with `auto_remediate=false` to audit before remediating.
- The scanner runs every 6 hours — adjust the schedule as needed.
- Attach the SSM instance profile to EC2 instances to enable secure access without SSH/RDP.
