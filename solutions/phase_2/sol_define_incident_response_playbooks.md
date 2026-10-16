# Define Incident Response Playbooks

This is a process-oriented recommendation. Below are playbook templates for the most critical scenarios and an automation framework for containment actions.

---

## Playbook Templates

### 1. Compromised EC2 Instance (GuardDuty: CryptoCurrency/C2)

```markdown
## Trigger
GuardDuty finding: CryptoCurrency:EC2/BitcoinTool.B!DNS, Backdoor:EC2/C&CActivity.B

## Severity: HIGH

## Steps

1. **Isolate** — Replace Security Group with forensics-only SG (deny all outbound, inbound only from forensics team IP)
2. **Preserve** — Create EBS snapshots of all attached volumes
3. **Capture** — Take memory dump if possible (SSM Run Command)
4. **Tag** — Add tag `incident=true`, `incident-date=YYYY-MM-DD`
5. **Investigate** — Analyze CloudTrail for IAM actions from the instance role, VPC Flow Logs for lateral movement
6. **Contain** — Revoke instance role active sessions (inline deny policy)
7. **Eradicate** — Terminate instance after evidence is preserved
8. **Recover** — Deploy clean replacement from known-good AMI
9. **Document** — Record timeline, root cause, and lessons learned
```

### 2. Exposed IAM Access Keys

```markdown
## Trigger
GuardDuty/Security Hub: IAM credential leaked publicly, AWS Abuse notification

## Severity: CRITICAL

## Steps

1. **Disable** — Immediately disable (do not delete) the exposed access key
2. **Assess scope** — Query CloudTrail for all actions taken with the key in the last 90 days
3. **Revoke sessions** — Add inline deny-all policy to the IAM user/role
4. **Check persistence** — Look for new IAM users, roles, policies, or Lambda functions created by the attacker
5. **Check resources** — Identify any EC2 instances, S3 objects, or other resources created
6. **Clean up** — Delete attacker-created resources and the compromised credential
7. **Rotate** — Issue new credentials if the key is still needed (prefer IAM roles)
8. **Report** — Open AWS support ticket if account compromise is suspected
```

### 3. S3 Data Exfiltration

```markdown
## Trigger
GuardDuty: Exfiltration:S3/*, Macie: sensitive data exposed

## Severity: HIGH

## Steps

1. **Block** — Apply bucket policy denying all external access immediately
2. **Identify** — Determine what data was accessed (S3 server access logs, CloudTrail data events)
3. **Assess** — Classify the sensitivity of exposed data (PII, financial, credentials)
4. **Notify** — Inform legal/compliance if regulated data was exposed
5. **Remediate** — Fix the misconfiguration (BPA, bucket policy, ACLs)
6. **Monitor** — Enable Macie continuous monitoring on affected buckets
```

---

## Automation Framework (Optional)

### `lambda/containment.py`

```python
import json
import boto3

ec2 = boto3.client('ec2')
iam = boto3.client('iam')

FORENSICS_SG_ID = 'sg-xxxxxxxxx'  # Pre-created: deny all out, allow forensics in

def isolate_instance(instance_id):
    """Replace all SGs with forensics-only SG"""
    ec2.modify_instance_attribute(
        InstanceId=instance_id,
        Groups=[FORENSICS_SG_ID]
    )

    # Create snapshots for evidence
    response = ec2.describe_instances(InstanceIds=[instance_id])
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            for volume in instance.get('BlockDeviceMappings', []):
                vol_id = volume['Ebs']['VolumeId']
                ec2.create_snapshot(
                    VolumeId=vol_id,
                    Description=f"Forensic snapshot - incident - {instance_id}",
                    TagSpecifications=[{
                        'ResourceType': 'snapshot',
                        'Tags': [{'Key': 'incident', 'Value': 'true'}]
                    }]
                )

def disable_access_key(user_name, access_key_id):
    """Disable compromised access key"""
    iam.update_access_key(
        UserName=user_name,
        AccessKeyId=access_key_id,
        Status='Inactive'
    )

def revoke_sessions(role_name):
    """Revoke all active sessions for a role"""
    iam.put_role_policy(
        RoleName=role_name,
        PolicyName='RevokeOlderSessions',
        PolicyDocument=json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Deny",
                "Action": "*",
                "Resource": "*",
                "Condition": {
                    "DateLessThan": {"aws:TokenIssueTime": "CURRENT_TIME"}
                }
            }]
        })
    )
```

---

## Pre-Requisites Checklist

```markdown
- [ ] Create a forensics Security Group (deny all outbound, inbound from forensics team only)
- [ ] Define escalation contacts and communication channels
- [ ] Set up a dedicated Slack/Teams channel for incidents
- [ ] Document AWS CIRT engagement process (support ticket for active compromise)
- [ ] Store playbooks in a location accessible during an incident (not only in a compromised account)
- [ ] Train junior personnel to execute playbooks independently
- [ ] Schedule quarterly tabletop exercises to test playbooks
```

---

## Important notes

- **Documented playbooks ensure consistency** — junior personnel can respond effectively when senior staff are unavailable.
- AWS provides a free [Security Incident Response Guide](https://docs.aws.amazon.com/whitepapers/latest/aws-security-incident-response-guide/) and sample playbook framework.
- If an account may be compromised, open a **support ticket to engage AWS CIRT** — free assistance during active incidents.
- Test playbooks via **tabletop exercises** (Phase 3) before a real incident occurs.
- Store playbooks outside the potentially compromised environment (wiki, shared drive, printed copies).
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/playbooks/).
