# Forming a Blue Team (Incident Response)

This is a process-oriented recommendation. Below is a framework for building a dedicated Blue Team covering the full IR lifecycle with automated response workflows.

---

## Blue Team Structure

### IR Lifecycle Phases

| Phase | Activities | Cloud Automation Opportunities |
|-------|-----------|-------------------------------|
| **Preparation** | Playbooks, training, tooling | IaC for IR infrastructure, pre-built Lambda functions |
| **Identification** | Alert triage, investigation | GuardDuty, Detective, automated enrichment |
| **Containment** | Isolate threat, limit blast | Automated SG replacement, credential revocation |
| **Eradication** | Remove attacker persistence | Automated IAM user/role cleanup, Lambda deletion |
| **Recovery** | Restore services | CloudFormation rebuild from known-good templates |
| **Lessons Learned** | Improve detection/response | Update Sigma rules, refine EventBridge patterns |

### Team Composition

```markdown
## Minimum Viable Blue Team (3-5 people)

- IR Lead: Coordination, escalation, communication
- Cloud Forensics Analyst: CloudTrail/VPC Flow Log investigation, evidence preservation
- Automation Engineer: Lambda/Step Functions for response workflows
- Threat Hunter: Proactive detection, hypothesis-driven investigation
- Detection Engineer: Custom rules, SIEM correlation, reducing false positives

## Rotation & Oncall
- 24x7 coverage via oncall rotation
- Primary + secondary responder
- Escalation to IR Lead for severity 1
- Monthly rotation of roles for skill building
```

---

## Automated Response Workflows

```markdown
## Priority 1: Build These First

1. **Compromised EC2** → Isolate (SG swap) + Snapshot + Notify
2. **Compromised credentials** → Disable key + Deny-all policy + Notify
3. **Public S3 bucket** → Auto-block public access + Notify owner
4. **Unauthorized IAM user created** → Disable + Alert + Investigate

## Priority 2: Build Next

5. **Crypto mining detected** → Isolate + Terminate (after snapshot)
6. **Unusual API volume** → Throttle (SCP) + Alert
7. **Data exfiltration signal** → Block bucket policy + Preserve logs
8. **Unauthorized region activity** → Terminate resources + Alert
```

---

## KPIs to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mean Time to Detect (MTTD) | < 5 min | Time from event to alert |
| Mean Time to Respond (MTTR) | < 30 min | Time from alert to containment |
| Automation coverage | > 80% of P1 scenarios | Automated vs manual responses |
| False positive rate | < 10% | Alerts closed as FP |
| Post-incident actions completed | 100% | Lessons learned tracked to resolution |

---

## Important notes

- In the cloud, IR can be **highly automated** via CloudTrail, Config, and programmatic resource access.
- The team should invest significantly in **building automated response workflows** for frequent or high-impact incident types.
- **Post-incident lessons learned** must drive improvements to detection rules, playbooks, and automations.
- Cloud IR advantages: immutable logs, infrastructure-as-code rebuild, snapshot-based forensics, API-driven containment.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/blue-team/).
