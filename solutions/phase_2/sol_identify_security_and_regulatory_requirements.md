# Identify Security and Regulatory Requirements

This is a process-oriented recommendation. Below is a structured approach to identifying applicable regulations, mapping controls, and using AWS tools for evidence collection.

---

## Framework Selection Guide

| Regulation/Framework | Applies To | AWS Security Hub Standard |
|---------------------|------------|--------------------------|
| SOC 2 Type II | SaaS companies, US-based services | AWS Foundational Best Practices |
| PCI-DSS v4.0 | Payment card processing | PCI DSS v3.2.1 |
| HIPAA | Healthcare data (US) | HIPAA |
| ISO 27001 | International, general security | CIS AWS Foundations |
| NIST 800-53 | US government, federal contractors | NIST 800-53 Rev 5 |
| GDPR | EU personal data | CIS AWS Foundations |
| FedRAMP | US federal agencies | NIST 800-53 Rev 5 |

---

## Implementation Steps

### 1. Identify Applicable Requirements

```markdown
- [ ] List all jurisdictions where the organization operates
- [ ] Identify industry-specific regulations (healthcare, finance, government)
- [ ] Map contractual obligations (customer contracts, SLAs)
- [ ] Determine data classification levels (public, internal, confidential, restricted)
- [ ] Assign ownership — designate team/individual responsible for compliance
```

### 2. Map Controls to AWS Services

```markdown
- [ ] Enable relevant Security Hub standards for continuous monitoring
- [ ] Configure AWS Audit Manager for automated evidence collection
- [ ] Use AWS Artifact to download AWS compliance certifications for auditors
- [ ] Check AWS Compliance Center for country-specific guidance
```

### 3. Terraform — Enable Relevant Security Hub Standards

```bash
provider "aws" {
  region = "us-east-1"
}

resource "aws_securityhub_account" "this" {}

# CIS AWS Foundations Benchmark
resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.this]
}

# AWS Foundational Security Best Practices
resource "aws_securityhub_standards_subscription" "aws_fsbp" {
  standards_arn = "arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.this]
}

# PCI DSS (if processing payments)
resource "aws_securityhub_standards_subscription" "pci" {
  standards_arn = "arn:aws:securityhub:us-east-1::standards/pci-dss/v/3.2.1"
  depends_on    = [aws_securityhub_account.this]
}

# NIST 800-53 (if federal/government)
resource "aws_securityhub_standards_subscription" "nist" {
  standards_arn = "arn:aws:securityhub:us-east-1::standards/nist-800-53/v/5.0.0"
  depends_on    = [aws_securityhub_account.this]
}
```

### 4. AWS Audit Manager Setup

```bash
resource "aws_auditmanager_account_registration" "this" {}

resource "aws_auditmanager_assessment" "main" {
  name = "annual-compliance-assessment"

  framework_id = data.aws_auditmanager_framework.soc2.id

  assessment_reports_destination {
    destination      = "s3://${aws_s3_bucket.audit_reports.bucket}"
    destination_type = "S3"
  }

  roles {
    role_arn  = aws_iam_role.audit_manager.arn
    role_type = "PROCESS_OWNER"
  }

  scope {
    aws_accounts {
      id = data.aws_caller_identity.current.account_id
    }
    aws_services {
      service_name = "ec2"
    }
    aws_services {
      service_name = "s3"
    }
    aws_services {
      service_name = "iam"
    }
  }

  depends_on = [aws_auditmanager_account_registration.this]
}

data "aws_auditmanager_framework" "soc2" {
  name            = "SOC 2"
  framework_type = "Standard"
}

data "aws_caller_identity" "current" {}
```

---

## Key AWS Resources for Compliance

| Resource | Purpose |
|----------|---------|
| **AWS Artifact** | Download AWS certifications and compliance reports for auditors |
| **AWS Compliance Center** | Country-specific regulatory information |
| **AWS Security Hub** | Continuous compliance monitoring against standards |
| **AWS Audit Manager** | Automated evidence collection for audits |
| **AWS Config** | Configuration history and compliance rules |

---

## Important notes

- Without clear understanding of applicable requirements, organizations risk **fines, license revocation, or loss of authorization to operate**.
- AWS holds its own certifications, but **customers must separately certify their workloads** (shared responsibility model).
- Use **AWS Artifact** to provide auditors with evidence for cloud-related controls.
- Align to an established framework (**NIST, ISO 27001, CIS**) rather than creating controls from scratch.
- **Assign a designated team or individual** responsible for compliance and audits.
- Reassess requirements **annually** or when entering new markets/jurisdictions.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/identify-compliance-requirements/).
