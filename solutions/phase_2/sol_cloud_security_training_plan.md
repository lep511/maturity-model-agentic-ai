# Cloud Security Training Plan

This is a process-oriented recommendation — no Terraform infrastructure is required. Below is a structured training plan with learning paths, timelines, and resources.

---

## Training Plan Structure

### Role-Based Learning Paths

| Role | Day 1 | Week 1 | Month 1 | Month 3 |
|------|-------|--------|---------|---------|
| All employees | Security Awareness Training | — | — | Annual refresher |
| Cloud admins | AWS Cloud Practitioner Essentials | Security fundamentals | Well-Architected Security Pillar | AWS Solutions Architect Associate |
| Security team | AWS Security Fundamentals | Security Specialty prep | Incident response workshop | AWS Certified Security Specialty |
| Developers | Secure coding basics | IAM permissions deep-dive | DevSecOps practices | Security Champions program |
| Red team | AWS pentesting rules of engagement | CloudGoat lab | Offensive security tools on AWS | Penetration testing advanced |
| Blue team | IR fundamentals | CloudTrail investigation | Forensics & containment | Tabletop exercise facilitation |

---

## Free Resources

### AWS Official

1. **Security Awareness Training** (mandatory for all): https://learnsecurity.amazon.com
2. **AWS Skill Builder** (free tier): https://skillbuilder.aws
3. **Security Ramp-Up Guide**: https://d1.awsstatic.com/training-and-certification/ramp-up_guides/Ramp-Up_Guide_Security.pdf
4. **AWS Workshops**: https://workshops.aws (search for security)
5. **Well-Architected Security Pillar**: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/

### Hands-On Labs

1. **AWS Security Workshops**: https://catalog.workshops.aws/security
2. **CloudGoat** (vulnerable by design): https://github.com/RhinoSecurityLabs/cloudgoat
3. **flAWS Challenge**: http://flaws.cloud
4. **IAM Vulnerable**: https://github.com/BishopFox/iam-vulnerable

### Certifications

- **AWS Certified Security - Specialty** (target for security team)
- **AWS Certified Solutions Architect - Associate** (foundation for admins)

---

## Implementation Checklist

```markdown
- [ ] Assign Security Awareness Training to all employees (learnsecurity.amazon.com)
- [ ] Define role-based learning paths with deadlines
- [ ] Enroll security team in AWS Security Specialty prep
- [ ] Schedule quarterly hands-on workshops
- [ ] Track completion rates as a KPI
- [ ] Include cloud security training in onboarding for new hires
- [ ] Budget for instructor-led training for advanced topics
- [ ] Set up annual refresher cadence
```

---

## Tracking Training Progress

Use a simple spreadsheet or LMS to track:

| Metric | Target |
|--------|--------|
| Security Awareness completion | 100% of staff |
| Security team certification rate | 80% within 6 months |
| Developer secure coding training | 100% within 3 months |
| Quarterly workshop attendance | > 70% of technical staff |

---

## Important notes

- **Start with Security Awareness Training** for all employees — it is free from AWS and takes under 1 hour.
- Security team members should pursue the **AWS Certified Security Specialty** certification.
- Training is not one-time — establish a **recurring cadence** (quarterly workshops, annual refreshers).
- Combine training with **hands-on labs** — theoretical knowledge without practice is insufficient.
- Track training completion as a **security KPI** and report to leadership.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/2.-foundational/training-plan/).
