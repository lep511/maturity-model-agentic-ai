# Perform Threat Modeling

This is a process-oriented recommendation. Below is a structured approach using AWS Threat Composer and STRIDE methodology mapped to MITRE ATT&CK for Cloud.

---

## Threat Modeling Process

### Step 1: Scope the Workload

```markdown
For each critical workload, document:
- [ ] What are we building? (System description, data flows)
- [ ] What can go wrong? (Threat identification)
- [ ] What are we going to do about it? (Mitigations)
- [ ] Did we do a good job? (Validation)
```

### Step 2: Create Data Flow Diagram

```
[User] → [CloudFront/WAF] → [ALB] → [App Server] → [Database]
                                          ↓
                                    [S3 Storage]
                                          ↓
                                    [Third-party API]
```

### Step 3: Apply STRIDE Per Element

| Threat | Category | Example in AWS |
|--------|----------|----------------|
| **S**poofing | Identity | Compromised IAM credentials, stolen session tokens |
| **T**ampering | Data integrity | S3 object modification, CloudTrail log deletion |
| **R**epudiation | Accountability | Disabled logging, actions without attribution |
| **I**nformation Disclosure | Confidentiality | Public S3 buckets, SSRF to IMDS |
| **D**enial of Service | Availability | L7 DDoS on ALB, Lambda throttling |
| **E**levation of Privilege | Authorization | IAM privilege escalation, container escape |

### Step 4: Map to MITRE ATT&CK for Cloud

Key techniques to consider:

| MITRE ATT&CK ID | Technique | AWS Relevance |
|-----------------|-----------|---------------|
| T1078 | Valid Accounts | Compromised access keys, federated identity abuse |
| T1190 | Exploit Public-Facing App | SSRF, SQLi on ALB targets |
| T1537 | Transfer Data to Cloud Account | S3 exfiltration to attacker account |
| T1578 | Modify Cloud Compute | EC2 instance tampering, snapshot manipulation |
| T1580 | Cloud Infrastructure Discovery | Enumerate resources post-compromise |
| T1525 | Implant Container Image | Malicious ECR image injection |

---

## AWS Threat Composer

AWS Threat Composer is an open-source tool that accelerates threat modeling:

```bash
# Access at: https://awslabs.github.io/threat-composer/

# Features:
# - Guided STRIDE-based threat identification
# - Pre-built AWS threat library
# - Exportable threat model documents
# - Integration with AWS Security services

# Alternative: Deploy locally
git clone https://github.com/awslabs/threat-composer
cd threat-composer
npm install && npm start
```

---

## Threat Model Template

```markdown
# Threat Model: [Workload Name]

## 1. System Description
- Architecture: [reference diagram]
- Data classification: [public/internal/confidential/restricted]
- Trust boundaries: [internet, VPC, account, organization]

## 2. Assumptions
- AWS infrastructure is secure (shared responsibility)
- IAM Identity Center is properly configured
- Network segmentation is in place

## 3. Threats Identified

| # | Category | Threat | Impact | Likelihood | Risk | Mitigation |
|---|----------|--------|--------|------------|------|------------|
| 1 | Spoofing | Compromised IAM role | High | Medium | High | MFA, short sessions, monitoring |
| 2 | Tampering | S3 object modification | High | Low | Medium | Versioning, MFA Delete |
| 3 | Info Disclosure | SSRF to IMDS | Critical | Medium | High | IMDSv2, WAF rules |

## 4. Mitigations Applied
- [List security controls mapped to each threat]

## 5. Residual Risk
- [Accepted risks with justification]
```

---

## Important notes

- Perform threat modeling **during the design phase** — not after deployment.
- Map threats to **MITRE ATT&CK techniques** for AWS environments for consistent language.
- Use **AWS Threat Composer** (open source) to accelerate the process with pre-built threat libraries.
- Reference the **AWS Threat Technique Catalog** for AWS-specific attack patterns.
- Threat modeling enables security teams to **prioritize investments** rather than block innovation.
- Track identified threats to **resolution** — a threat model without follow-through provides no value.
- Use structured methodologies (**STRIDE, PASTA, LINDDUN**) for consistency across teams.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/threat-modeling/).
