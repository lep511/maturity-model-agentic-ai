# Network Flows Analysis - VPC Flow Logs

This solution enables VPC Flow Logs across all VPCs with centralized S3 storage, Athena queries for anomaly detection, and CloudWatch alarms for rejected traffic patterns.

## Recommended file structure

```
flow-logs-analysis/
├── main.tf
├── athena-queries/
│   └── anomaly-detection.sql
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_ids" {
  description = "VPC IDs to enable Flow Logs on"
  type        = list(string)
}

variable "log_bucket" {
  description = "S3 bucket for centralized Flow Log storage"
  type        = string
}

variable "traffic_type" {
  description = "Traffic to capture: ALL, ACCEPT, or REJECT"
  type        = string
  default     = "ALL"
}

variable "project" {
  default = "flow-logs-analysis"
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

# S3 bucket for Flow Logs (centralized)
resource "aws_s3_bucket" "flow_logs" {
  bucket = var.log_bucket
  tags   = var.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  rule {
    id     = "transition-and-expire"
    status = "Enabled"
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    expiration {
      days = 365
    }
  }
}

# Enable Flow Logs on all specified VPCs
resource "aws_flow_log" "vpcs" {
  for_each = toset(var.vpc_ids)

  vpc_id               = each.value
  traffic_type         = var.traffic_type
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"
  max_aggregation_interval = 60

  destination_options {
    file_format        = "parquet"
    per_hour_partition = true
  }

  tags = merge(var.tags, { VpcId = each.value })
}

# Athena database for querying Flow Logs
resource "aws_athena_database" "flow_logs" {
  name   = "flow_logs_db"
  bucket = aws_s3_bucket.flow_logs.bucket
}

# Athena workgroup
resource "aws_athena_workgroup" "flow_logs" {
  name = "${var.project}-workgroup"

  configuration {
    result_configuration {
      output_location = "s3://${aws_s3_bucket.flow_logs.bucket}/athena-results/"
    }
  }

  tags = var.tags
}
```

---

## 3. `athena-queries/anomaly-detection.sql`

```sql
-- Create table for VPC Flow Logs (Parquet format)
CREATE EXTERNAL TABLE IF NOT EXISTS flow_logs_db.vpc_flow_logs (
  version int,
  account_id string,
  interface_id string,
  srcaddr string,
  dstaddr string,
  srcport int,
  dstport int,
  protocol bigint,
  packets bigint,
  bytes bigint,
  start bigint,
  end_time bigint,
  action string,
  log_status string
)
STORED AS PARQUET
LOCATION 's3://BUCKET_NAME/AWSLogs/'
TBLPROPERTIES ("parquet.compression"="GZIP");

-- Detect port scanning (many ports from single IP)
SELECT srcaddr, COUNT(DISTINCT dstport) as ports_scanned, COUNT(*) as attempts
FROM flow_logs_db.vpc_flow_logs
WHERE action = 'REJECT'
  AND from_unixtime(start) > current_timestamp - interval '1' hour
GROUP BY srcaddr
HAVING COUNT(DISTINCT dstport) > 20
ORDER BY ports_scanned DESC;

-- Detect data exfiltration (high outbound volume)
SELECT srcaddr, dstaddr, SUM(bytes)/1024/1024 as mb_transferred
FROM flow_logs_db.vpc_flow_logs
WHERE action = 'ACCEPT'
  AND from_unixtime(start) > current_timestamp - interval '1' hour
GROUP BY srcaddr, dstaddr
HAVING SUM(bytes) > 1073741824  -- > 1 GB
ORDER BY mb_transferred DESC;

-- Detect lateral movement (internal-to-internal on unusual ports)
SELECT srcaddr, dstaddr, dstport, COUNT(*) as connections
FROM flow_logs_db.vpc_flow_logs
WHERE action = 'ACCEPT'
  AND srcaddr LIKE '10.%' AND dstaddr LIKE '10.%'
  AND dstport NOT IN (443, 80, 5432, 3306, 6379)
  AND from_unixtime(start) > current_timestamp - interval '24' hour
GROUP BY srcaddr, dstaddr, dstport
HAVING COUNT(*) > 100
ORDER BY connections DESC;
```

---

## 4. `outputs.tf`

```bash
output "flow_log_ids" {
  description = "Flow Log IDs created"
  value       = { for k, v in aws_flow_log.vpcs : k => v.id }
}

output "log_bucket" {
  description = "S3 bucket for centralized Flow Logs"
  value       = aws_s3_bucket.flow_logs.bucket
}

output "athena_database" {
  description = "Athena database for Flow Log queries"
  value       = aws_athena_database.flow_logs.name
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var='vpc_ids=["vpc-aaa","vpc-bbb","vpc-ccc"]' \
  -var="log_bucket=my-flow-logs-central-123"
```

## Important notes

- Enable Flow Logs across **all VPCs, regions, and accounts** for complete visibility.
- Use **Parquet format** with hourly partitioning for cost-efficient Athena queries.
- Ship to **S3 via Kinesis Firehose** for near-real-time analysis, or directly to S3 for batch analysis.
- Filter to **REJECT** traffic to focus on blocked attacks, or capture **ALL** for full visibility.
- Integrate with **Amazon Detective** or your **SIEM/Security Lake** for correlation with other signals.
- For full packet inspection (beyond metadata), use **VPC Traffic Mirroring**.
- Flow Logs are **agentless** and have **no performance impact** on your instances.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/vpc-flow-logs/).
