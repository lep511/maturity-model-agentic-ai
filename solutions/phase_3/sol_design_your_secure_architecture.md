# Design Your Secure Architecture

This is a process-oriented recommendation. Below is a secure architecture reference pattern with key principles and a discovery tool configuration.

---

## Secure Architecture Principles

### Network Path Design

```
Internet → CloudFront (WAF) → ALB (public subnet)
                                    ↓
                              App Servers (private subnet, SG: ALB only)
                                    ↓
                              Database (isolated subnet, SG: App only)
                                    ↓
                              Backups (separate account)
```

### Key Design Decisions

| Decision | Secure Choice | Why |
|----------|--------------|-----|
| Instance access | SSM Fleet Manager | No open ports 22/3389 |
| Internet-facing | ALB + CloudFront only | Single entry point with WAF inspection |
| Database access | SG reference from app tier | No direct internet path |
| Secrets | Secrets Manager | No hardcoded credentials |
| Credentials | IAM roles (temporary) | No long-term access keys |
| Multi-AZ | Required for production | Fault tolerance |
| Admin access | IAM Identity Center | Centralized, temporary, audited |
| Logging | CloudTrail + VPC Flow Logs | Full auditability |

---

## Workload Discovery on AWS

Deploy Workload Discovery to auto-generate architecture diagrams and detect shadow IT:

```bash
# Deploy via CloudFormation
aws cloudformation create-stack \
  --stack-name workload-discovery \
  --template-url https://solutions-reference.s3.amazonaws.com/workload-discovery-on-aws/latest/workload-discovery-on-aws.template \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

# After deployment, access the web UI to:
# 1. Visualize all resources and their relationships
# 2. Identify undocumented resources (shadow IT)
# 3. Export architecture diagrams
# 4. Detect resources not matching your secure patterns
```

---

## Well-Architected Security Pillar Checklist

```markdown
## Identity and Access
- [ ] Strong sign-in mechanism (MFA, Identity Center)
- [ ] Temporary credentials everywhere
- [ ] Least privilege permissions
- [ ] Centralized identity management

## Detection
- [ ] GuardDuty enabled all accounts/regions
- [ ] CloudTrail centralized and protected
- [ ] Security Hub for continuous posture evaluation
- [ ] Automated alerting on critical findings

## Infrastructure Protection
- [ ] Network segmented (public/private/isolated)
- [ ] No direct SSH/RDP (use Fleet Manager)
- [ ] WAF on all internet-facing endpoints
- [ ] Security Groups with SG references (not open CIDRs)

## Data Protection
- [ ] Encryption at rest (customer-managed KMS)
- [ ] Encryption in transit (TLS everywhere)
- [ ] S3 Block Public Access at account level
- [ ] Data classification defined

## Incident Response
- [ ] Playbooks defined and tested
- [ ] Automated containment for critical scenarios
- [ ] AWS CIRT engagement process documented
```

---

## AWS Security Reference Architecture (SRA)

The SRA provides prescriptive guidance for deploying security services across a multi-account environment:

```
Management Account
├── CloudTrail Org Trail
├── Organizations (SCPs)
└── Delegated Admins

Security Tooling Account (delegated admin)
├── Security Hub (aggregator)
├── GuardDuty (admin)
├── Inspector (admin)
├── Detective
└── Macie (admin)

Log Archive Account
├── CloudTrail Logs (protected)
├── Config Logs
├── VPC Flow Logs
└── Security Lake

Network Account
├── Transit Gateway
├── Network Firewall
├── DNS Firewall
└── VPN/Direct Connect
```

---

## Important notes

- **Intentional architecture** reduces attack vectors and blast radius — design security in, don't bolt it on.
- Replace exposed SSH/RDP with **AWS Systems Manager Fleet Manager** — eliminates entire attack vector.
- Use the **AWS Well-Architected Framework** and **Security Reference Architecture** as design guides.
- Deploy **Workload Discovery on AWS** to auto-generate diagrams and detect undocumented resources.
- Review architecture against the **Well-Architected Tool** in the AWS console for automated recommendations.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/architecture/).
