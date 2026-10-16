# Threat Intelligence - GuardDuty Custom Threat Lists + WAF Feeds

This solution configures a threat intelligence pipeline that feeds external IoCs into GuardDuty custom threat lists and WAF IP sets for automated blocking.

## Recommended file structure

```
threat-intelligence/
├── main.tf
├── lambda/
│   └── update_threat_feeds.py
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "threat_list_bucket" {
  description = "S3 bucket for threat intelligence lists"
  type        = string
}

variable "feed_urls" {
  description = "URLs of threat intelligence feeds to ingest"
  type        = list(string)
  default = [
    "https://www.spamhaus.org/drop/drop.txt",
    "https://check.torproject.org/torbulkexitlist"
  ]
}

variable "update_schedule" {
  description = "Schedule for updating threat feeds"
  type        = string
  default     = "rate(6 hours)"
}

variable "project" {
  default = "threat-intelligence"
}

variable "tags" {
  default = {}
}
```

---

## 2. `lambda/update_threat_feeds.py`

```python
import json
import os
import boto3
from urllib.request import urlopen
import ipaddress

s3 = boto3.client('s3')
wafv2 = boto3.client('wafv2')

BUCKET = os.environ['THREAT_LIST_BUCKET']
WAF_IP_SET_ID = os.environ.get('WAF_IP_SET_ID', '')
WAF_IP_SET_NAME = os.environ.get('WAF_IP_SET_NAME', '')
FEED_URLS = json.loads(os.environ['FEED_URLS'])

def lambda_handler(event, context):
    all_ips = set()

    for url in FEED_URLS:
        try:
            response = urlopen(url, timeout=30)
            content = response.read().decode('utf-8')

            for line in content.splitlines():
                line = line.strip().split(';')[0].split('#')[0].strip()
                if not line:
                    continue
                try:
                    # Validate it's a valid IP or CIDR
                    network = ipaddress.ip_network(line, strict=False)
                    all_ips.add(str(network))
                except ValueError:
                    continue
        except Exception as e:
            print(f"Error fetching {url}: {e}")

    # Upload to S3 for GuardDuty (one IP per line)
    guardduty_list = '\n'.join(sorted(all_ips))
    s3.put_object(
        Bucket=BUCKET,
        Key='guardduty/threat-list.txt',
        Body=guardduty_list,
        ContentType='text/plain'
    )

    # Update WAF IP Set (if configured)
    if WAF_IP_SET_ID:
        # Get current lock token
        ip_set = wafv2.get_ip_set(
            Name=WAF_IP_SET_NAME,
            Scope='REGIONAL',
            Id=WAF_IP_SET_ID
        )

        # WAF IP sets have a 10,000 address limit
        waf_ips = list(all_ips)[:10000]

        wafv2.update_ip_set(
            Name=WAF_IP_SET_NAME,
            Scope='REGIONAL',
            Id=WAF_IP_SET_ID,
            Addresses=waf_ips,
            LockToken=ip_set['LockToken']
        )

    return {
        'statusCode': 200,
        'ips_collected': len(all_ips),
        'feeds_processed': len(FEED_URLS)
    }
```

---

## 3. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# S3 bucket for threat lists
resource "aws_s3_bucket" "threat_lists" {
  bucket = var.threat_list_bucket
  tags   = var.tags
}

# GuardDuty custom threat IP list
resource "aws_guardduty_threatintelset" "external" {
  activate    = true
  detector_id = data.aws_guardduty_detector.current.id
  format      = "TXT"
  location    = "s3://${aws_s3_bucket.threat_lists.bucket}/guardduty/threat-list.txt"
  name        = "${var.project}-external-threats"
}

data "aws_guardduty_detector" "current" {}

# WAF IP Set for blocking
resource "aws_wafv2_ip_set" "threat_ips" {
  name               = "${var.project}-threat-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = []

  tags = var.tags
}

# Lambda for feed updates
resource "aws_lambda_function" "updater" {
  filename      = "${path.module}/lambda.zip"
  function_name = "${var.project}-feed-updater"
  role          = aws_iam_role.lambda.arn
  handler       = "update_threat_feeds.lambda_handler"
  runtime       = "python3.12"
  timeout       = 120

  environment {
    variables = {
      THREAT_LIST_BUCKET = var.threat_list_bucket
      WAF_IP_SET_ID      = aws_wafv2_ip_set.threat_ips.id
      WAF_IP_SET_NAME    = aws_wafv2_ip_set.threat_ips.name
      FEED_URLS          = jsonencode(var.feed_urls)
    }
  }

  tags = var.tags
}

# Scheduled execution
resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "${var.project}-update-schedule"
  schedule_expression = var.update_schedule
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.schedule.name
  target_id = "UpdateFeeds"
  arn       = aws_lambda_function.updater.arn
}

resource "aws_lambda_permission" "allow_schedule" {
  statement_id  = "AllowSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.updater.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}

# IAM role for Lambda
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

resource "aws_iam_role_policy" "lambda" {
  role = aws_iam_role.lambda.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.threat_lists.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["wafv2:GetIPSet", "wafv2:UpdateIPSet"]
        Resource = aws_wafv2_ip_set.threat_ips.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

---

## 4. `outputs.tf`

```bash
output "guardduty_threat_list_id" {
  description = "GuardDuty custom threat list ID"
  value       = aws_guardduty_threatintelset.external.id
}

output "waf_ip_set_arn" {
  description = "WAF IP Set ARN for threat IPs"
  value       = aws_wafv2_ip_set.threat_ips.arn
}

output "updater_function" {
  description = "Lambda function updating threat feeds"
  value       = aws_lambda_function.updater.function_name
}
```

---

## How to deploy

```bash
terraform init
terraform apply -var="threat_list_bucket=my-threat-intel-123"
```

## Important notes

- GuardDuty includes **native feeds** from Amazon, CrowdStrike, Proofpoint, and TOR exit nodes as a baseline.
- Add **custom threat lists** (STIX, OTX, TXT format) for industry-specific or proprietary intelligence.
- **WAF Security Automations** can ingest SpamHaus, TOR, and EmergingThreats feeds directly.
- For mature teams, deploy **honeypots** (decoy AWS resources) to generate environment-specific threat signals.
- Update feeds on a schedule (every 6 hours) to maintain currency.
- Consider commercial threat intelligence platforms for enriched, curated feeds.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/threat-intellingence/).
