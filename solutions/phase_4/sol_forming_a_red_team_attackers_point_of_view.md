# Forming a Red Team (Attacker's Point of View)

This is a process-oriented recommendation. Below is a framework for building a Red Team capability with AWS-compatible attack simulation tools and exercise structure.

---

## Red Team Capability Framework

### Attack Simulation Tools (AWS-Compatible)

| Tool | Type | Use Case |
|------|------|----------|
| **Stratus Red Team** | Open source | Simulate AWS-specific ATT&CK techniques (IAM, S3, EC2) |
| **Pacu** | Open source | AWS exploitation framework (enumeration, privilege escalation) |
| **CloudSaga** | AWS official | CLI tool simulating real CIRT-documented events |
| **GuardDuty Tester** | AWS official | Generate sample GuardDuty findings for detection validation |
| **XM Cyber** | Commercial | Continuous attack path analysis |
| **AttackIQ** | Commercial | Breach and attack simulation platform |
| **Atomic Red Team** | Open source | Library of atomic tests mapped to MITRE ATT&CK |

### Exercise Types

```markdown
## Progression (least to most disruptive)

1. **Purple Team** (collaborative)
   - Red + Blue work together openly
   - Focus: validate detection coverage
   - Low risk, high learning

2. **Assumed Breach** (scoped)
   - Red starts with initial access (provided credentials)
   - Focus: lateral movement, impact assessment
   - Medium risk

3. **Full Red Team** (adversarial)
   - Red operates independently, Blue unaware
   - Focus: end-to-end attack chain, social engineering
   - High value, requires mature Blue Team

4. **Red vs Blue** (competitive)
   - Timed exercise, scoring both teams
   - Focus: detection speed, response quality
   - Best for mature organizations
```

---

## Sample Red Team Exercise Plan

```markdown
## Objective
Validate detection and response capabilities for IAM credential compromise scenario.

## Scope
- Target: Production AWS accounts (non-destructive)
- Duration: 2 weeks
- Rules of engagement: No data destruction, no service disruption

## Attack Path
1. Initial Access: Phishing simulation → compromised developer credential
2. Discovery: Enumerate IAM roles, S3 buckets, EC2 instances
3. Privilege Escalation: Exploit overly permissive role assumption
4. Lateral Movement: Pivot to production account via cross-account role
5. Impact: Demonstrate data access (read-only, no exfiltration)

## Success Criteria (Blue Team)
- [ ] Detect initial credential usage from unusual location
- [ ] Alert on privilege escalation within 15 minutes
- [ ] Contain lateral movement within 30 minutes
- [ ] Identify full attack path in post-incident analysis

## Debrief
- Detection gaps identified
- Mean time to detect/respond measured
- Playbook improvements documented
- Control improvements prioritized
```

---

## Stratus Red Team Examples

```bash
# Install Stratus Red Team
go install github.com/DataDog/stratus-red-team/v2/cmd/stratus@latest

# List available attack techniques
stratus list

# Simulate credential exfiltration from EC2 instance
stratus detonate aws.credential-access.ec2-get-password-data

# Simulate S3 data exfiltration
stratus detonate aws.exfiltration.s3-backdoor-bucket-policy

# Simulate IAM privilege escalation
stratus detonate aws.persistence.iam-create-admin-user

# Clean up after exercise
stratus cleanup aws.credential-access.ec2-get-password-data
```

---

## Important notes

- Red teaming **requires proper authorization** before any exercise — document scope, rules of engagement, and emergency contacts.
- Goes beyond automated scanners — includes **exploitation, lateral movement, and impact assessment**.
- Findings are shared with the Blue Team to **drive remediation and build cyber-resilience**.
- AWS allows penetration testing on most services **without prior approval** — review the [AWS Penetration Testing Policy](https://aws.amazon.com/security/penetration-testing/).
- Requires **skilled personnel** — inexperienced red teaming can cause outages or miss critical findings.
- Start with **Purple Team exercises** (collaborative) before progressing to adversarial red team operations.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/red-team/).
