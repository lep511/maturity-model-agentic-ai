# Custom Threat Detection Capabilities - Amazon Security Lake / SIEM

This solution deploys Amazon Security Lake for centralized log normalization (OCSF) and integrates with Athena for custom detection queries.

## Recommended file structure

```
security-lake-siem/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "regions" {
  description = "Regions to collect logs from"
  type        = list(string)
  default     = ["us-east-1"]
}

variable "log_sources" {
  description = "AWS log sources to ingest"
  type        = list(string)
  default     = ["CLOUD_TRAIL_MGMT", "VPC_FLOW", "ROUTE53", "S3_DATA", "LAMBDA_EXECUTION"]
}

variable "subscriber_accounts" {
  description = "Account IDs for SIEM subscriber access"
  type        = list(string)
  default     = []
}

variable "retention_days" {
  description = "Days to retain logs before transitioning to Glacier"
  type        = number
  default     = 365
}

variable "project" {
  default = "security-lake"
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

# Enable Security Lake
resource "aws_securitylake_data_lake" "main" {
  meta_store_manager_role_arn = aws_iam_role.security_lake.arn

  configuration {
    region = "us-east-1"

    lifecycle_configuration {
      transition {
        days          = 90
        storage_class = "STANDARD_IA"
      }
      transition {
        days          = 180
        storage_class = "GLACIER"
      }
      expiration {
        days = var.retention_days
      }
    }
  }
}

resource "aws_iam_role" "security_lake" {
  name = "${var.project}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "securitylake.amazonaws.com" }
    }]
  })

  tags = var.tags
}

# AWS Log Sources
resource "aws_securitylake_aws_log_source" "sources" {
  for_each = toset(var.log_sources)

  source {
    accounts = []
    regions  = var.regions
    source_name    = each.value
    source_version = "2.0"
  }

  depends_on = [aws_securitylake_data_lake.main]
}

# Subscriber for SIEM integration
resource "aws_securitylake_subscriber" "siem" {
  count = length(var.subscriber_accounts) > 0 ? 1 : 0

  subscriber_name = "${var.project}-siem-subscriber"

  source {
    aws_log_source_resource {
      source_name    = "CLOUD_TRAIL_MGMT"
      source_version = "2.0"
    }
  }

  subscriber_identity {
    external_id = "siem-integration"
    principal   = var.subscriber_accounts[0]
  }

  access_type = "S3"

  depends_on = [aws_securitylake_data_lake.main]
}

# Athena workgroup for custom detection queries
resource "aws_athena_workgroup" "security" {
  name = "${var.project}-queries"

  configuration {
    result_configuration {
      output_location = "s3://${aws_s3_bucket.query_results.bucket}/athena-results/"
      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }
  }

  tags = var.tags
}

resource "aws_s3_bucket" "query_results" {
  bucket = "${var.project}-query-results-${data.aws_caller_identity.current.account_id}"
  tags   = var.tags
}

data "aws_caller_identity" "current" {}
```

---

## 3. Sample Detection Queries (Athena)

```sql
-- Detect unusual cross-account AssumeRole activity
SELECT
  time, src_endpoint.ip, actor.user.name,
  api.operation, cloud.account_uid
FROM cloud_trail_mgmt
WHERE api.operation = 'AssumeRole'
  AND time > current_timestamp - interval '24' hour
  AND cloud.account_uid != '123456789012'
ORDER BY time DESC;

-- Detect data exfiltration patterns (large S3 downloads)
SELECT
  time, actor.user.name, src_endpoint.ip,
  api.operation, resources[1].uid
FROM s3_data
WHERE api.operation IN ('GetObject', 'SelectObjectContent')
  AND time > current_timestamp - interval '1' hour
GROUP BY 1,2,3,4,5
HAVING count(*) > 100;

-- Detect SSH brute force from VPC Flow Logs
SELECT
  src_endpoint.ip, dst_endpoint.ip, dst_endpoint.port,
  count(*) as attempts
FROM vpc_flow
WHERE dst_endpoint.port = 22
  AND time > current_timestamp - interval '1' hour
GROUP BY 1,2,3
HAVING count(*) > 50;
```

---

## 4. `outputs.tf`

```bash
output "data_lake_arn" {
  description = "Security Lake data lake ARN"
  value       = aws_securitylake_data_lake.main.arn
}

output "athena_workgroup" {
  description = "Athena workgroup for security queries"
  value       = aws_athena_workgroup.security.name
}

output "query_results_bucket" {
  description = "S3 bucket for Athena query results"
  value       = aws_s3_bucket.query_results.bucket
}
```

---

## How to deploy

```bash
terraform init
terraform apply

# With SIEM subscriber:
terraform apply -var='subscriber_accounts=["123456789012"]'
```

## Important notes

- **GuardDuty does not support custom detections** — Security Lake/SIEM fills this gap.
- Security Lake normalizes all logs to **OCSF format** — consistent schema across AWS and third-party sources.
- Supports **third-party ingestion**: CrowdStrike, Okta, Palo Alto, Cisco, and more.
- Connect a **SIEM** (Splunk, QRadar, Microsoft Sentinel) for real-time correlation, or query directly with **Athena**.
- Alternative: deploy an **open-source SIEM on Amazon OpenSearch** using the aws-samples CloudFormation template (includes 2,200 Sigma rules).
- Start with CloudTrail Management Events and VPC Flow Logs, then expand to S3 Data Events and third-party sources.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/siem-custom-threat-detection/).
