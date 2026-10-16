# Sharing Security Work and Responsibility

This is a process-oriented recommendation. Below is a RACI matrix framework and escalation mechanism for distributing security responsibilities across teams.

---

## RACI Matrix Template

| Security Activity | Security Team | DevOps/Platform | Development | Business Owner |
|-------------------|:---:|:---:|:---:|:---:|
| Security strategy & roadmap | **R/A** | C | I | A |
| IAM policy management | A | **R** | C | I |
| Vulnerability remediation | C | C | **R** | A |
| Incident response (P1) | **R/A** | C | C | I |
| Security monitoring & alerting | **R** | C | I | I |
| Compliance audits | **R/A** | C | C | I |
| Secure architecture review | **R** | C | **R** | I |
| Penetration testing | **R/A** | C | I | I |
| Data classification | C | I | C | **R/A** |
| WAF rule management | A | **R** | C | I |
| Secrets rotation | C | **R** | C | I |
| Security training | **R** | I | I | A |
| Third-party security assessment | **R** | C | I | **A** |
| Business impact assessment | C | I | I | **R/A** |

**R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed

---

## Escalation Mechanism for Ambiguous Findings

```markdown
## When to Escalate to Business Owners

Security findings that require business context:
- WAF rate-limit alerts on suspicious orders (legitimate spike vs. attack?)
- Unusual API usage patterns from a partner integration
- Data access from an unexpected region (new market expansion vs. exfiltration?)
- High-privilege access request from a team not previously authorized

## Escalation Process

1. Security team enriches the finding with context:
   - What happened (technical details)
   - Potential impact (business terms)
   - Recommended actions (options with trade-offs)

2. Route to business owner with deadline:
   - P1: 15-minute response required
   - P2: 1-hour response required
   - P3: Same-day response required

3. If no response within SLA:
   - P1: Security team applies default safe action (block)
   - P2-P3: Auto-escalate to next management level

4. Decision logged for audit trail
```

---

## Third-Party Responsibility Coverage

```markdown
## Contract Checklist (security obligations)

For every third-party with access to your AWS environment or data:

- [ ] Security responsibilities explicitly documented in contract
- [ ] SLA for vulnerability remediation defined
- [ ] Incident notification timeline agreed (e.g., 24 hours)
- [ ] Right to audit / security assessment included
- [ ] Data handling and retention requirements specified
- [ ] Termination data destruction obligations defined
- [ ] Insurance / liability for security breaches addressed
- [ ] Compliance certifications required (SOC 2, ISO 27001)
```

---

## Implementation Checklist

```markdown
- [ ] Create RACI matrix covering all security activities
- [ ] Assign each security task to a specific team/individual
- [ ] Define escalation paths with SLAs for ambiguous findings
- [ ] Review third-party contracts for security responsibility gaps
- [ ] Set up automated routing of findings to appropriate owners (via tags)
- [ ] Track security task completion across teams
- [ ] Review and update RACI quarterly
- [ ] Report security responsibility distribution to leadership
```

---

## Important notes

- Security is a **shared responsibility across all teams** — not just the security team.
- A RACI matrix frees security specialists for **strategic work** by distributing operational tasks.
- For ambiguous findings requiring business context, provide **enriched context** and options — don't just throw raw alerts at business owners.
- Reserve **autonomous security team blocking** for clear-cut threats (crypto mining, C2, credential exposure).
- Ensure third-party contracts **explicitly cover** any delegated security responsibilities.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/share-security-responsibility/).
