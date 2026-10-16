# Involve Security Teams in Development

This is a process-oriented recommendation. Below is a framework for integrating security teams into the development lifecycle from design through deployment.

---

## Security Engagement Model

### When Security Must Be Involved

| Development Phase | Security Activity | Output |
|------------------|-------------------|--------|
| **Design** | Threat modeling, architecture review | Threat model document, security requirements |
| **Development** | Secure coding guidance, library approvals | Approved dependency list, coding standards |
| **Code Review** | Security-focused PR reviews | Security approval on critical paths |
| **Testing** | SAST/DAST integration, penetration testing | Vulnerability report |
| **Deployment** | Production security checklist | Go/No-go decision |
| **Operations** | Incident response, monitoring review | Alert tuning, runbooks |

---

## Implementation Framework

### 1. Establish Security Office Hours

```markdown
Schedule: Weekly 1-hour open session
Format: Drop-in, no appointment needed
Purpose: Developers can ask security questions without formal ticket

Benefits:
- Reduces friction between security and development
- Catches issues early when they are cheap to fix
- Builds trust and security culture
```

### 2. Security Review Triggers (Mandatory)

Define events that **require** security team involvement:

```markdown
- [ ] New internet-facing application or API
- [ ] Changes to authentication or authorization logic
- [ ] New third-party integration or vendor access
- [ ] Data model changes involving PII or sensitive data
- [ ] Infrastructure changes to network boundaries
- [ ] New AWS account or service adoption
- [ ] Changes to encryption or key management
- [ ] Privilege escalation paths (new admin roles)
```

### 3. Self-Service Security Resources

Create materials developers can use without waiting for security:

```markdown
- [ ] Approved architecture patterns (with Terraform modules)
- [ ] Secure coding guidelines per language
- [ ] Approved library/dependency list
- [ ] Security requirements checklist per service type
- [ ] FAQ: common security questions with pre-approved answers
- [ ] Slack channel for async security questions
```

### 4. Production Readiness Checklist

```markdown
## Security Readiness (must pass before production)

- [ ] Threat model completed and reviewed
- [ ] SAST scan passed (no critical/high findings)
- [ ] Dependencies scanned (no known critical CVEs)
- [ ] Authentication and authorization tested
- [ ] Input validation implemented (OWASP Top 10)
- [ ] Secrets stored in Secrets Manager (not in code)
- [ ] Logging and monitoring configured
- [ ] Incident response runbook created
- [ ] Data classification documented
- [ ] Network access restricted to minimum required
```

---

## Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Time from design to security review | < 1 week | Avoid being a bottleneck |
| Security review backlog | < 5 items | Measure capacity |
| Vulnerabilities found in production | Trending down | Measure shift-left effectiveness |
| Developer satisfaction with security team | > 4/5 | Measure approachability |
| Office hours attendance | Growing | Measure adoption |

---

## Anti-Patterns to Avoid

```markdown
- Security team as gatekeepers who only say "no"
- Reviewing only at the end (pre-production)
- Requiring formal tickets for simple questions
- Providing criticism without solutions
- Being unreachable or having long response times
- Blocking releases without offering alternatives
```

---

## Important notes

- Security involvement must start at **design and architecture, not just before production**.
- Late involvement creates friction, leaves **no time to remediate**, and results in insecure applications being exposed.
- Security teams should be **proactive guides**, not reactive auditors.
- Later maturity phases build on this with **Security Champions** (Phase 3) and **DevSecOps** (Phase 3).
- Make the security team **easy to reach** — Slack channel, office hours, and quick-turnaround reviews.
- Measure security team responsiveness as a KPI — being a bottleneck is as bad as not being involved.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/security-teams-in-dev/).
