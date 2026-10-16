# Multi-Region Disaster Recovery Automation - AWS Elastic DR

This solution configures AWS Elastic Disaster Recovery for continuous cross-region replication with automated failover and IaC-defined recovery infrastructure.

## Recommended file structure

```
multi-region-dr/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "primary_region" {
  type    = string
  default = "us-east-1"
}

variable "dr_region" {
  type    = string
  default = "us-west-2"
}

variable "staging_subnet_id" {
  description = "Subnet in DR region for DRS staging area"
  type        = string
}

variable "project" {
  default = "multi-region-dr"
}

variable "tags" {
  default = {}
}
```

---

## 2. `main.tf`

```bash
provider "aws" {
  alias  = "dr"
  region = var.dr_region
}

# DRS Replication Configuration Template
resource "aws_drs_replication_configuration_template" "main" {
  provider = aws.dr

  associate_default_security_group = true
  bandwidth_throttling             = 0
  create_public_ip                 = false
  data_plane_routing               = "PRIVATE_IP"
  default_large_staging_disk_type  = "GP3"
  ebs_encryption                   = "DEFAULT"
  replication_server_instance_type = "t3.small"
  staging_area_subnet_id           = var.staging_subnet_id
  use_dedicated_replication_server = false

  staging_area_tags = merge(var.tags, { Purpose = "DRS-Staging" })

  tags = var.tags
}
```

---

## 3. DR Failover CloudFormation Template

```yaml
# dr-recovery-stack.yaml — deploy on-demand in DR region
AWSTemplateFormatVersion: '2010-09-09'
Description: DR Recovery Infrastructure

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
  DBSnapshotArn:
    Type: String

Resources:
  RecoveryALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Subnets: !Ref SubnetIds
      Scheme: internet-facing

  RecoveryASG:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      VPCZoneIdentifier: !Ref SubnetIds
      MinSize: 2
      MaxSize: 6
      LaunchTemplate:
        LaunchTemplateId: !Ref RecoveryLaunchTemplate
        Version: !GetAtt RecoveryLaunchTemplate.LatestVersionNumber

  RecoveryDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBSnapshotIdentifier: !Ref DBSnapshotArn
      DBInstanceClass: db.r6g.large
      MultiAZ: true
```

---

## 4. `outputs.tf`

```bash
output "replication_template_id" {
  description = "DRS replication configuration template ID"
  value       = aws_drs_replication_configuration_template.main.id
}

output "dr_region" {
  description = "Disaster recovery region"
  value       = var.dr_region
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="staging_subnet_id=subnet-xxx-in-dr-region"
```

## DR Drill Procedure

```bash
# 1. Initiate recovery drill (non-disruptive)
aws drs start-recovery --source-servers "s-xxxxxxxxx" --is-drill true --region us-west-2

# 2. Validate recovered instances
# 3. Run application health checks
# 4. Measure actual RTO (time from initiation to healthy)
# 5. Terminate drill instances
aws drs terminate-recovery-instances --recovery-instance-ids "i-xxxxxx" --region us-west-2
```

## Important notes

- **Elastic DR** provides continuous asynchronous cross-region replication with sub-second RPO.
- Supports both **on-premises to cloud** and **region-to-region** replication.
- DR also enables **point-in-time recovery** — useful against ransomware or accidental corruption.
- If multi-region DR cannot be implemented but is required by SLAs, an executive must sign a **formal risk acceptance**.
- **Test DR failover regularly** — a DR plan that hasn't been drilled is not a DR plan.
- Encryption in transit and at rest is enabled **by default**.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/multi-region-disaster-recovery-automation/).
