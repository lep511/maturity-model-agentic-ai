# Disaster Recovery Plan - AWS Elastic Disaster Recovery

This solution establishes a cross-region DR strategy with AWS Elastic Disaster Recovery (DRS), classifying workloads by resilience tier and defining RTO/RPO per workload.

## Recommended file structure

```
disaster-recovery/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "primary_region" {
  description = "Primary region for workloads"
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

variable "replication_subnet_id" {
  description = "Subnet ID in DR region for replication servers"
  type        = string
}

variable "project" {
  default = "disaster-recovery"
}

variable "tags" {
  default = {}
}
```

---

## 2. `main.tf`

```bash
provider "aws" {
  alias  = "primary"
  region = var.primary_region
}

provider "aws" {
  alias  = "dr"
  region = var.dr_region
}

# Cross-region S3 replication for critical data
resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = "${var.project}-primary-${data.aws_caller_identity.current.account_id}"
  tags     = var.tags
}

resource "aws_s3_bucket" "dr" {
  provider = aws.dr
  bucket   = "${var.project}-dr-${data.aws_caller_identity.current.account_id}"
  tags     = var.tags
}

resource "aws_s3_bucket_versioning" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "dr" {
  provider = aws.dr
  bucket   = aws_s3_bucket.dr.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "primary_to_dr" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.dr.arn
      storage_class = "STANDARD"
    }
  }

  depends_on = [aws_s3_bucket_versioning.primary, aws_s3_bucket_versioning.dr]
}

resource "aws_iam_role" "replication" {
  provider = aws.primary
  name     = "${var.project}-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "replication" {
  provider = aws.primary
  role     = aws_iam_role.replication.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetReplicationConfiguration", "s3:ListBucket"]
        Resource = aws_s3_bucket.primary.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObjectVersionForReplication", "s3:GetObjectVersionAcl"]
        Resource = "${aws_s3_bucket.primary.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ReplicateObject", "s3:ReplicateDelete"]
        Resource = "${aws_s3_bucket.dr.arn}/*"
      }
    ]
  })
}

# RDS cross-region read replica for critical databases
resource "aws_db_instance" "dr_replica" {
  provider = aws.dr

  identifier          = "${var.project}-dr-replica"
  replicate_source_db = "arn:aws:rds:${var.primary_region}:${data.aws_caller_identity.current.account_id}:db:primary-db"
  instance_class      = "db.t3.medium"
  storage_encrypted   = true

  tags = var.tags
}

data "aws_caller_identity" "current" {}
```

---

## 3. Business Continuity Plan Template

```markdown
## Workload Classification

| Tier | Strategy | RTO | RPO | Example |
|------|----------|-----|-----|---------|
| Tier 1 (Critical) | Multi-Region Active-Passive | < 1h | < 15m | Payment processing, auth |
| Tier 2 (Important) | Cross-Region Warm Standby | < 4h | < 1h | Customer portal, APIs |
| Tier 3 (Standard) | Multi-AZ HA | < 15m | < 5m | Internal tools |
| Tier 4 (Non-critical) | Backup & Restore | < 24h | < 24h | Dev/test environments |

## DR Strategies by Tier

### Tier 1: Multi-Region Active-Passive
- Continuous data replication (DynamoDB Global Tables, Aurora Global Database)
- Pre-provisioned infrastructure in DR region (warm standby)
- Route 53 health checks with automatic failover
- Regular DR drills (quarterly)

### Tier 2: Cross-Region Warm Standby
- Cross-region RDS read replicas (promote on failover)
- S3 cross-region replication
- CloudFormation template for compute (on-demand recovery)
- DR drill semi-annually

### Tier 3: Multi-AZ HA
- Multi-AZ RDS, ALB across AZs, Auto Scaling
- No cross-region needed — AZ failure is contained
- Automatic recovery via health checks

### Tier 4: Backup & Restore
- AWS Backup with cross-region copy
- Restore from backup on demand
- Acceptable for non-time-sensitive workloads
```

---

## 4. `outputs.tf`

```bash
output "primary_bucket" {
  description = "Primary S3 bucket"
  value       = aws_s3_bucket.primary.bucket
}

output "dr_bucket" {
  description = "DR S3 bucket (replication target)"
  value       = aws_s3_bucket.dr.bucket
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
terraform apply \
  -var="primary_region=us-east-1" \
  -var="dr_region=us-west-2" \
  -var="replication_subnet_id=subnet-xxx"
```

## Important notes

- Define **RTO/RPO per workload** — not all workloads need cross-region DR.
- **AWS Elastic Disaster Recovery (DRS)** provides continuous block-level replication for EC2 instances with push-button recovery.
- DR also enables **point-in-time recovery** — useful against ransomware or accidental data corruption.
- **Test DR scenarios regularly** — untested DR plans fail during actual disasters.
- A common pattern: Multi-AZ HA with continuous cross-region data replication and an **on-demand CloudFormation template** for compute recovery.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/disaster-recovery/).
