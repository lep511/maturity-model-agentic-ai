# Advanced Security Automations - Forensics & Isolation

This solution implements automated forensics evidence gathering and instance isolation using Step Functions, Lambda, and EventBridge with human-in-the-loop approval.

## Recommended file structure

```
security-automations/
├── main.tf
├── lambda/
│   ├── gather_evidence.py
│   └── isolate_resource.py
├── step-function.json
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "forensics_bucket" {
  description = "S3 bucket for forensics evidence storage"
  type        = string
}

variable "forensics_sg_id" {
  description = "Forensics-only Security Group (deny all, allow forensics team)"
  type        = string
}

variable "approval_email" {
  description = "Email for human approval requests"
  type        = string
}

variable "auto_isolate_findings" {
  description = "GuardDuty finding types that trigger automatic isolation"
  type        = list(string)
  default     = ["CryptoCurrency:EC2/BitcoinTool.B!DNS", "Backdoor:EC2/C&CActivity.B"]
}

variable "project" {
  default = "security-automations"
}

variable "tags" {
  default = {}
}
```

---

## 2. `lambda/gather_evidence.py`

```python
import json
import boto3
from datetime import datetime

ec2 = boto3.client('ec2')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    """Gather forensics evidence from a compromised EC2 instance"""
    instance_id = event['instance_id']
    bucket = event['forensics_bucket']
    timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
    prefix = f"incidents/{timestamp}/{instance_id}"

    evidence = {'instance_id': instance_id, 'timestamp': timestamp, 'artifacts': []}

    # 1. Capture instance metadata
    desc = ec2.describe_instances(InstanceIds=[instance_id])
    s3.put_object(
        Bucket=bucket,
        Key=f"{prefix}/instance-metadata.json",
        Body=json.dumps(desc, default=str)
    )
    evidence['artifacts'].append('instance-metadata.json')

    # 2. Create EBS snapshots
    for res in desc['Reservations']:
        for inst in res['Instances']:
            for vol in inst.get('BlockDeviceMappings', []):
                vol_id = vol['Ebs']['VolumeId']
                snap = ec2.create_snapshot(
                    VolumeId=vol_id,
                    Description=f"Forensic evidence - {instance_id} - {timestamp}",
                    TagSpecifications=[{
                        'ResourceType': 'snapshot',
                        'Tags': [
                            {'Key': 'incident', 'Value': 'true'},
                            {'Key': 'source-instance', 'Value': instance_id},
                            {'Key': 'capture-time', 'Value': timestamp}
                        ]
                    }]
                )
                evidence['artifacts'].append(f"snapshot:{snap['SnapshotId']}")

    # 3. Capture Security Group rules (before isolation)
    for sg in inst.get('SecurityGroups', []):
        sg_detail = ec2.describe_security_groups(GroupIds=[sg['GroupId']])
        s3.put_object(
            Bucket=bucket,
            Key=f"{prefix}/sg-{sg['GroupId']}.json",
            Body=json.dumps(sg_detail, default=str)
        )

    # 4. Tag instance as evidence-captured
    ec2.create_tags(
        Resources=[instance_id],
        Tags=[
            {'Key': 'forensics-captured', 'Value': timestamp},
            {'Key': 'incident', 'Value': 'true'}
        ]
    )

    return evidence
```

---

## 3. `lambda/isolate_resource.py`

```python
import json
import boto3

ec2 = boto3.client('ec2')
iam = boto3.client('iam')

def lambda_handler(event, context):
    """Isolate a compromised resource"""
    resource_type = event.get('resource_type', 'ec2')
    resource_id = event['resource_id']
    forensics_sg = event['forensics_sg_id']

    actions_taken = []

    if resource_type == 'ec2':
        # Replace Security Groups
        ec2.modify_instance_attribute(
            InstanceId=resource_id,
            Groups=[forensics_sg]
        )
        actions_taken.append(f"Replaced SGs with forensics SG on {resource_id}")

        # Disable instance termination protection to allow future cleanup
        ec2.modify_instance_attribute(
            InstanceId=resource_id,
            DisableApiTermination={'Value': False}
        )

    elif resource_type == 'iam_role':
        # Revoke active sessions by attaching deny-all inline policy
        iam.put_role_policy(
            RoleName=resource_id,
            PolicyName='IncidentResponse-DenyAll',
            PolicyDocument=json.dumps({
                "Version": "2012-10-17",
                "Statement": [{"Effect": "Deny", "Action": "*", "Resource": "*"}]
            })
        )
        actions_taken.append(f"Attached deny-all to role {resource_id}")

    elif resource_type == 'iam_user':
        # Disable all access keys
        keys = iam.list_access_keys(UserName=resource_id)
        for key in keys['AccessKeyMetadata']:
            iam.update_access_key(
                UserName=resource_id,
                AccessKeyId=key['AccessKeyId'],
                Status='Inactive'
            )
            actions_taken.append(f"Disabled key {key['AccessKeyId']}")

    return {'resource': resource_id, 'actions': actions_taken}
```

---

## 4. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# Step Functions for orchestrated IR workflow
resource "aws_sfn_state_machine" "ir_workflow" {
  name     = "${var.project}-ir-workflow"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    StartAt = "GatherEvidence"
    States = {
      GatherEvidence = {
        Type     = "Task"
        Resource = aws_lambda_function.gather_evidence.arn
        Next     = "RequestApproval"
      }
      RequestApproval = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish.waitForTaskToken"
        Parameters = {
          TopicArn = aws_sns_topic.approval.arn
          Message = {
            "taskToken.$" = "$$.Task.Token"
            "message" = "Approve isolation of compromised resource?"
          }
        }
        TimeoutSeconds = 900
        Next           = "IsolateResource"
        Catch = [{
          ErrorEquals = ["States.Timeout"]
          Next        = "AutoEscalate"
        }]
      }
      IsolateResource = {
        Type     = "Task"
        Resource = aws_lambda_function.isolate_resource.arn
        End      = true
      }
      AutoEscalate = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.approval.arn
          Message  = "ESCALATION: Approval timeout — resource isolation pending"
        }
        End = true
      }
    }
  })

  tags = var.tags
}

# Lambda functions (simplified — use archive_file in production)
resource "aws_lambda_function" "gather_evidence" {
  filename      = "${path.module}/lambda.zip"
  function_name = "${var.project}-gather-evidence"
  role          = aws_iam_role.lambda.arn
  handler       = "gather_evidence.lambda_handler"
  runtime       = "python3.12"
  timeout       = 120

  environment {
    variables = {
      FORENSICS_BUCKET = var.forensics_bucket
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "isolate_resource" {
  filename      = "${path.module}/lambda.zip"
  function_name = "${var.project}-isolate-resource"
  role          = aws_iam_role.lambda.arn
  handler       = "isolate_resource.lambda_handler"
  runtime       = "python3.12"
  timeout       = 60

  environment {
    variables = {
      FORENSICS_SG_ID = var.forensics_sg_id
    }
  }

  tags = var.tags
}

# SNS for approval workflow
resource "aws_sns_topic" "approval" {
  name = "${var.project}-approval"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.approval.arn
  protocol  = "email"
  endpoint  = var.approval_email
}

# IAM roles (abbreviated)
resource "aws_iam_role" "lambda" {
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

resource "aws_iam_role" "step_functions" {
  name = "${var.project}-sfn-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "states.amazonaws.com" }
    }]
  })
  tags = var.tags
}
```

---

## 5. `outputs.tf`

```bash
output "state_machine_arn" {
  description = "Step Functions state machine ARN"
  value       = aws_sfn_state_machine.ir_workflow.arn
}

output "gather_evidence_function" {
  description = "Evidence gathering Lambda"
  value       = aws_lambda_function.gather_evidence.function_name
}

output "isolate_function" {
  description = "Resource isolation Lambda"
  value       = aws_lambda_function.isolate_resource.function_name
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="forensics_bucket=my-forensics-evidence" \
  -var="forensics_sg_id=sg-xxxxxxxxx" \
  -var="approval_email=security-oncall@yourcompany.com"
```

## Important notes

- Two critical automated actions: **evidence gathering** (snapshots, metadata capture) and **isolation** (SG replacement, credential revocation).
- Where human approval is needed, route to **multiple approvers with SLA-based escalation** — auto-escalate if no response within 15 minutes.
- For fully automated responses, **assess business impact** of isolation per workload — isolating a payment server may cause more harm than the threat.
- **All automations must be tested** in non-production before relying on them during a real incident.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/security-automations-adv/).
