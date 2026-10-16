# AGENTSEC03-BP04 Regular permission audits and access reviews

**Pillar:** Security · **Focus area:** AGENTSEC03 — Agent identity and permission management · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC03-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agent roles accumulate permissions over time. Scheduled automated analysis paired with periodic human-led reviews catches drift before it turns into significant over-privilege and produces the documented audit trail that compliance needs.

## Desired outcome

- You continually monitor agent permissions and review them on a cadence matched to the agent's risk profile, identifying and removing unused access regularly.
- Automated alerts fire immediately when agent permissions are modified, enabling rapid detection of unauthorized policy changes.
- You document access reviews with timestamped findings and remediation actions for compliance purposes.

## Common anti-patterns

- Conducting permission reviews only annually or in response to incidents, letting drift accumulate undetected for months.
- Setting a single review cadence for every agent regardless of risk, so high-risk agents (those with broad permissions, mutating tool access, or production data reach) receive the same scrutiny as low-risk informational agents.
- Reviewing permissions manually without tooling support, making it impractical to assess the full scope of agent access across dozens or hundreds of roles.
- Treating IAM Access Analyzer findings as informational rather than as practical remediation items, so identified over-privilege persists indefinitely.
- Not alerting on permission changes in real time, discovering unauthorized policy modifications only during the next scheduled review cycle weeks or months later.

## Benefits of establishing this best practice

- Ongoing permission monitoring detects drift before it accumulates into significant over-privilege.
- Timestamped findings and remediation actions support compliance requirements and security investigations.
- Usage-based evidence from AWS CloudTrail drives permission reduction with data rather than guesswork about which permissions are still needed.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Two review modes are both necessary. Automated analysis provides speed and coverage, the ability to scan every agent role across every account every day. Periodic human-led reviews provide the context that automation can't supply, such as whether a technically unused permission is still needed for upcoming work, whether a recent policy change was expected, and whether the current privilege level matches the current role of the agent in the business. Running only one of the two leaves a gap: automation alone produces findings no one acts on, and manual-only reviews happen too infrequently to catch drift in time.

AWS IAM Access Analyzer at the organization level continually analyzes agent IAM policies and generates findings for permissions that grant access to resources outside the intended scope. Its unused-permissions analysis uses AWS CloudTrail activity data to identify access that has not been exercised, giving a data-driven basis for permission reduction rather than a guess. Weekly review and remediation of Access Analyzer findings, prioritized by severity, keeps the backlog bounded and turns findings into change tickets.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp04.html#implementation-guidance)

### Implementation steps

1. **Enable organization-level IAM Access Analyzer:** Turn on AWS IAM Access Analyzer at the organization level and configure it to analyze all agent IAM roles for unused and overly permissive access.
2. **Detect policy changes with AWS Config:** Deploy AWS Config rules to detect changes to agent IAM policies and trigger Amazon EventBridge notifications for immediate alerting to the security team.
3. **Retain activity data in CloudTrail Lake:** Configure AWS CloudTrail Lake for long-term retention of agent API activity data, supporting access review correlation and compliance reporting.
4. **Automate weekly finding reviews:** Implement automated weekly reviews of Access Analyzer findings, generating reports that prioritize high-severity findings for remediation.
5. **Run a formal access review on a risk-based cadence:** Set the review cadence per agent based on its risk profile (high-risk agents reviewed frequently, low-risk informational agents reviewed less often). Correlate Access Analyzer findings with CloudTrail usage data, document findings and remediation actions, and record sign-off for each review cycle.
6. **Aggregate findings in Security Hub CSPM:** Pull IAM findings from Access Analyzer, AWS Config, and Amazon GuardDuty into AWS Security Hub CSPM for a unified view of permission-related issues across the agent fleet.

## Resources

**Related best practices:**

- [AGENTSEC03-BP03 Implement least privilege with dynamic boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html)
- [AGENTSEC03-BP02 Separate agent and human user permission](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp02.html)
- [AGENTSEC05-BP01 Implement comprehensive logging and decision artifact storage](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html)

**Related services:**

- [AWS IAM Access Analyzer](https://aws.amazon.com/iam/features/analyze-access/)
- [AWS Config](https://aws.amazon.com/config/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [AWS CloudTrail](https://aws.amazon.com/cloudtrail/)
- [AWS Security Hub CSPM](https://aws.amazon.com/security-hub/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
