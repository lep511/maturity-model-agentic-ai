# Run Tabletop Exercises - Simulations

This is a process-oriented recommendation. Below are exercise templates, facilitator guides, and tools for hands-on blue team practice.

---

## Tabletop Exercise Templates

### Exercise 1: Compromised IAM Credentials

```markdown
## Scenario
A developer's AWS access key was found in a public GitHub repository 2 hours ago.
GuardDuty shows the key was used to launch 50 EC2 instances in ap-southeast-1 (unused region).

## Facilitator Injects (reveal progressively)
1. Initial: GuardDuty alert — UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration
2. 10 min: CloudTrail shows new IAM user "admin-backup" created with AdministratorAccess
3. 20 min: S3 bucket "company-financials" was accessed and objects downloaded
4. 30 min: A Lambda function "data-exfil" was created that runs every 5 minutes

## Expected Actions
- [ ] Disable the compromised access key immediately
- [ ] Search CloudTrail for all actions by the compromised key
- [ ] Identify and remove attacker-created persistence (IAM user, Lambda)
- [ ] Terminate unauthorized EC2 instances
- [ ] Assess data accessed in S3 (scope of breach)
- [ ] Engage AWS CIRT if needed
- [ ] Notify legal/compliance if PII was accessed
```

### Exercise 2: Ransomware / Destructive Attack

```markdown
## Scenario
Monday morning: multiple teams report they cannot access their RDS databases.
CloudTrail shows someone deleted 12 RDS instances and their automated backups at 3 AM.

## Facilitator Injects
1. Initial: RDS instances deleted, automated backups gone
2. 10 min: The actor used an IAM role from a compromised EC2 instance
3. 20 min: AWS Backup cross-account copies exist (last backup: 6 hours old)
4. 30 min: A ransom note was placed in an S3 bucket

## Expected Actions
- [ ] Isolate the compromised EC2 instance
- [ ] Assess scope: which databases, which data
- [ ] Restore from cross-account AWS Backup (separate account)
- [ ] Revoke compromised role sessions
- [ ] Determine entry vector (SSRF? stolen creds?)
- [ ] Engage AWS CIRT and potentially law enforcement
- [ ] Communication plan to affected stakeholders
```

### Exercise 3: Data Exfiltration via S3

```markdown
## Scenario
Macie alerts: 500,000 customer records (PII) were accessed from S3 by an unknown external account.

## Facilitator Injects
1. Initial: S3 bucket policy was modified to allow cross-account access
2. 10 min: The modification came from an authorized IAM user (insider threat?)
3. 20 min: The user's laptop was compromised (phishing email last week)
4. 30 min: Data was copied to an account outside the organization

## Expected Actions
- [ ] Revoke the bucket policy change immediately
- [ ] Identify all data accessed (S3 access logs)
- [ ] Classify the data (PII, financial, health)
- [ ] Determine: insider threat vs. compromised credential
- [ ] Notify legal/privacy team (GDPR 72-hour notification?)
- [ ] Preserve evidence (CloudTrail, S3 access logs)
```

---

## Exercise Facilitator Guide

```markdown
## Before the Exercise
- [ ] Confirm team knows basic IR procedures
- [ ] Ensure tooling access (CloudTrail, GuardDuty, console)
- [ ] Prepare scenario injects on a timer
- [ ] Book war room (physical or virtual)
- [ ] Invite: IR team, security leads, relevant engineering

## During the Exercise (90 minutes)
- 0-10 min: Present initial scenario
- 10-30 min: Team discusses and assigns actions
- 30-50 min: Reveal injects, team adapts
- 50-70 min: Escalation decisions, communication drafts
- 70-90 min: Debrief and lessons learned

## After the Exercise
- [ ] Document findings and gaps
- [ ] Update playbooks based on lessons learned
- [ ] Track remediation items to completion
- [ ] Schedule next exercise (quarterly cadence)

## Include Unexpected Elements
- Anti-forensics (attacker deleted CloudTrail logs)
- Evasion (attacker used legitimate tools)
- Pressure (executive asks for status update mid-exercise)
- Complication (second incident during first response)
```

---

## Hands-On Practice Tools

### AWS CloudSaga

```bash
# CLI tool that simulates real CIRT-documented attack scenarios in a sandbox
pip install cloudsaga

# Run a simulation
cloudsaga --scenario credential-exfiltration --sandbox-account 123456789012

# Scenarios include:
# - Credential exfiltration
# - Crypto mining
# - Data exfiltration
# - Ransomware
```

### AWS Jams

```markdown
Access via: AWS Skill Builder (https://skillbuilder.aws)

Gamified blue team challenges:
- Investigate GuardDuty findings
- Contain a compromised instance
- Trace lateral movement via CloudTrail
- Timed, scored, team-based
```

---

## Important notes

- Run exercises **at least once per year** — quarterly is ideal for mature teams.
- Ensure the team knows **basic IR procedures** and has tooling access before the first exercise.
- Include **unexpected elements** (evasion, anti-forensics, pressure) to test adaptability.
- Use **AWS Jams** (gamified) and **AWS CloudSaga** (CLI simulation) for hands-on technical practice.
- Close with a **debrief** — track lessons learned and update playbooks accordingly.
- Exercises validate that playbooks (Phase 2) actually work under pressure.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/tabletop-exercises/).
