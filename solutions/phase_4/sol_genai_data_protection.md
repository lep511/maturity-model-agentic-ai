# GenAI Data Protection - Amazon Bedrock

This solution configures Amazon Bedrock with Guardrails for prompt injection prevention, sensitive data filtering, and private VPC endpoint access.

## Recommended file structure

```
bedrock-security/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "vpc_id" {
  description = "VPC ID for Bedrock private endpoint"
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for Bedrock endpoint"
  type        = list(string)
}

variable "blocked_topics" {
  description = "Topics to block in Guardrails"
  type        = list(string)
  default     = ["violence", "illegal-activities", "hate-speech"]
}

variable "pii_entities_to_block" {
  description = "PII entity types to redact in responses"
  type        = list(string)
  default     = ["EMAIL", "PHONE", "SSN", "CREDIT_DEBIT_CARD_NUMBER"]
}

variable "project" {
  default = "bedrock-security"
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

# VPC Endpoint for private Bedrock access (no internet traversal)
resource "aws_vpc_endpoint" "bedrock" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.us-east-1.bedrock-runtime"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.subnet_ids
  security_group_ids  = [aws_security_group.bedrock.id]
  private_dns_enabled = true

  tags = merge(var.tags, { Name = "${var.project}-bedrock-endpoint" })
}

resource "aws_security_group" "bedrock" {
  name        = "${var.project}-bedrock-sg"
  description = "Security group for Bedrock VPC endpoint"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  tags = var.tags
}

# Bedrock Guardrail
resource "aws_bedrock_guardrail" "main" {
  name                      = "${var.project}-guardrail"
  description               = "Guardrail for prompt injection and data protection"
  blocked_input_messaging   = "Your request was blocked by security policy."
  blocked_outputs_messaging = "The response was blocked by security policy."

  # Content filters
  content_policy_config {
    filters_config {
      type            = "VIOLENCE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = "HIGH"
      output_strength = "NONE"
    }
  }

  # PII redaction
  sensitive_information_policy_config {
    dynamic "pii_entities_config" {
      for_each = var.pii_entities_to_block
      content {
        type   = pii_entities_config.value
        action = "BLOCK"
      }
    }
  }

  # Topic blocking
  topic_policy_config {
    dynamic "topics_config" {
      for_each = var.blocked_topics
      content {
        name       = topics_config.value
        type       = "DENY"
        definition = "Block content related to ${topics_config.value}"
      }
    }
  }

  tags = var.tags
}

resource "aws_bedrock_guardrail_version" "v1" {
  guardrail_arn = aws_bedrock_guardrail.main.guardrail_arn
  description   = "Initial version"
}
```

---

## 3. `outputs.tf`

```bash
output "guardrail_id" {
  description = "Bedrock Guardrail ID"
  value       = aws_bedrock_guardrail.main.guardrail_id
}

output "guardrail_arn" {
  description = "Bedrock Guardrail ARN"
  value       = aws_bedrock_guardrail.main.guardrail_arn
}

output "vpc_endpoint_id" {
  description = "Bedrock VPC endpoint ID"
  value       = aws_vpc_endpoint.bedrock.id
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="vpc_id=vpc-xxx" \
  -var='subnet_ids=["subnet-a","subnet-b"]'
```

## Important notes

- Amazon Bedrock **guarantees your data is never used for model training** — unlike many third-party providers.
- Bedrock enforces **encryption in transit and at rest** by default.
- Access Bedrock via **VPC endpoint** to keep all traffic private (no internet traversal).
- **Bedrock Guardrails** filter: prompt injection attempts, sensitive data disclosure (PII), off-topic responses, and harmful content.
- If using third-party model providers directly, **review their data usage terms** carefully and implement compensating controls.
- Apply Guardrails at the application level — they protect both inputs and outputs.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/gen-ai-security/).
