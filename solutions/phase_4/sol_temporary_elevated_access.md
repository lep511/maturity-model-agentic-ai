# Temporary Elevated Access - AWS TEAM

This solution implements just-in-time privileged access using AWS TEAM (Temporary Elevated Access Management) with approval workflows, time-bound sessions, and full CloudTrail auditing.

## Recommended file structure

```
temporary-elevated-access/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "identity_center_instance_arn" {
  description = "IAM Identity Center instance ARN"
  type        = string
}

variable "elevated_permission_set_arn" {
  description = "Permission Set ARN for elevated access"
  type        = string
}

variable "max_session_duration" {
  description = "Maximum elevated session duration (e.g., PT4H)"
  type        = string
  default     = "PT4H"
}

variable "approval_required" {
  description = "Require approval for elevated access requests"
  type        = bool
  default     = true
}

variable "approver_group_id" {
  description = "Identity Center group ID for approvers"
  type        = string
}

variable "project" {
  default = "temp-elevated-access"
}

variable "tags" {
  default = {}
}
```

---

## 2. AWS TEAM Deployment

AWS TEAM is an open-source solution. Deploy via the provided CDK/CloudFormation:

```bash
# Clone AWS TEAM repository
git clone https://github.com/aws-samples/iam-identity-center-team

# Deploy
cd iam-identity-center-team
npm install
npx cdk deploy --all \
  --parameters TeamStack:IdentityCenterInstanceArn=${IDENTITY_CENTER_ARN} \
  --parameters TeamStack:MaxSessionDuration=PT4H \
  --parameters TeamStack:RequireApproval=true
```

---

## 3. `main.tf` (Supporting infrastructure)

```bash
provider "aws" {
  region = "us-east-1"
}

# Permission Set for elevated access (short duration)
resource "aws_ssoadmin_permission_set" "elevated" {
  name             = "${var.project}-admin"
  description      = "Temporary elevated admin access (JIT)"
  instance_arn     = var.identity_center_instance_arn
  session_duration = var.max_session_duration

  tags = var.tags
}

resource "aws_ssoadmin_managed_policy_attachment" "elevated" {
  instance_arn       = var.identity_center_instance_arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  permission_set_arn = aws_ssoadmin_permission_set.elevated.arn
}

# CloudWatch alarm for elevated session usage
resource "aws_cloudwatch_metric_alarm" "elevated_sessions" {
  alarm_name          = "${var.project}-active-sessions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ElevatedSessionCount"
  namespace           = "Custom/Security"
  period              = 300
  statistic           = "Maximum"
  threshold           = 5
  alarm_description   = "Unusual number of elevated access sessions"

  tags = var.tags
}

# EventBridge rule to track elevated access usage in CloudTrail
resource "aws_cloudwatch_event_rule" "elevated_usage" {
  name        = "${var.project}-usage-tracking"
  description = "Track elevated permission set usage"

  event_pattern = jsonencode({
    "source"      = ["aws.sso"]
    "detail-type" = ["AWS API Call via CloudTrail"]
    "detail" = {
      "eventName" = ["CreateAccountAssignment"]
    }
  })

  tags = var.tags
}
```

---

## 4. `outputs.tf`

```bash
output "elevated_permission_set_arn" {
  description = "Permission Set ARN for elevated access"
  value       = aws_ssoadmin_permission_set.elevated.arn
}

output "max_session_duration" {
  description = "Maximum elevated session duration"
  value       = var.max_session_duration
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="identity_center_instance_arn=arn:aws:sso:::instance/ssoins-xxx" \
  -var="approver_group_id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Workflow

```markdown
1. Engineer requests elevated access via TEAM portal
2. Request includes: target account, duration, justification
3. Approver(s) review and approve/deny
4. On approval: temporary account assignment created in Identity Center
5. Engineer authenticates and receives time-bound credentials
6. Session automatically expires at configured duration
7. All actions logged in CloudTrail with the elevated role
8. Manual revocation available at any time
```

## Important notes

- **Perpetual privileged access is a major risk** — a compromised credential with standing permissions is far more damaging.
- Use **AWS TEAM** (open source, built on IAM Identity Center) or a PAM solution (CyberArk, Okta) for just-in-time access.
- Every privileged session must be subject to an **approval workflow and audited in CloudTrail**.
- Sessions are **automatically revoked on expiry** and manually revocable if needed.
- Credentials issued are **temporary** — not durable access keys.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/iam-temporary-elevated-access/).
