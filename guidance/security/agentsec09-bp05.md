# AGENTSEC09-BP05 Implement runtime threat detection, security event correlation, and automated remediation for agents

**Pillar:** Security · **Focus area:** AGENTSEC09 — Agent vulnerability scanning and penetration testing · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC09-BP05](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp05.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Scanning finds latent weaknesses. Runtime detection catches the attacks happening now. Correlating events across agent interaction surfaces and triggering automated remediation compresses the gap between an active exploit and the response that contains it.

## Desired outcome

- You continually monitor security events from agent activity, correlate them across interaction surfaces, and analyze them for multi-step attack sequences.
- You detect active threats targeting agentic systems within minutes, with critical attack sequences surfaced at the highest severity.
- Automated remediation workflows trigger containment actions and generate ready-to-implement fixes, reducing mean time to detection and mean time to remediation.
- Security teams have a unified view of agent-related threats alongside findings from vulnerability scanning and penetration testing.

## Common anti-patterns

- Treating agent security events in isolation rather than correlating them across interaction surfaces, missing multi-step attack sequences where individual events look benign but together constitute a coordinated attack.
- Relying on pre-deployment vulnerability scanning alone without runtime threat detection, leaving a gap where vulnerabilities introduced through configuration drift, new tool integrations, or novel attack techniques go undetected until the next scheduled assessment.
- Generating security alerts without automated remediation workflows, creating alert fatigue where security teams are overwhelmed by findings but lack the tooling to act quickly.
- Not correlating penetration testing findings with runtime threat detection signals, missing the connection between known vulnerabilities and active exploitation attempts that together provide a high-confidence remediation prioritization signal.

## Benefits of establishing this best practice

- AI/ML-powered event correlation identifies coordinated attacks spanning multiple agent interaction surfaces, time periods, and resources.
- Automated workflows trigger containment actions and generate fix recommendations when threats are detected, closing the loop between detection and response.
- Centralized findings from vulnerability scanning, penetration testing, and runtime threat detection enable risk-based prioritization across the full threat lifecycle.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Scanning and penetration testing find weaknesses before exploit. Runtime detection catches the exploit as it happens. Both are necessary because neither alone is sufficient. An agentic system adds surface area (tools, APIs, memory stores, other agents) that is exploited through prompt injection chains, credential misuse, data exfiltration sequences, and privilege escalation paths. Detection has to correlate across that surface, not treat each channel in isolation.

Deploy Amazon GuardDuty across all accounts where agents operate to provide continuous threat detection for agent IAM roles, API activity, and data access patterns. [GuardDuty Extended Threat Detection](https://aws.amazon.com/blogs/aws/introducing-amazon-guardduty-extended-threat-detection-aiml-attack-sequence-identification-for-enhanced-cloud-security/) correlates security signals to identify active attack sequences (privilege discovery followed by API manipulation, persistence activities, and data exfiltration) and surfaces them as critical-severity attack sequence findings with natural language summaries, MITRE ATT&CK mapping, and prescriptive remediation recommendations.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp05.html#implementation-guidance)

### Implementation steps

1. **Enable GuardDuty across agent accounts:** Turn on Amazon GuardDuty with monitoring configured for AWS CloudTrail events, Amazon VPC Flow Logs, DNS logs, Amazon S3 data events, and GuardDuty Runtime Monitoring for agent compute resources.
2. **Centralize findings in Security Hub CSPM:** Aggregate findings from Amazon GuardDuty, [AWS Security Agent](https://aws.amazon.com/security-agent/), Amazon Macie, and Amazon Inspector in AWS Security Hub CSPM, and configure Security Hub CSPM insights to correlate penetration testing findings with runtime threat detection signals.
3. **Automate containment on high-severity findings:** Use Amazon EventBridge rules and AWS Lambda functions to trigger containment actions and generate fix recommendations when high-severity findings are generated.
4. **Combine evaluation drift with GuardDuty findings:** Configure Amazon CloudWatch composite alarms that combine [Amazon Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/aws/amazon-bedrock-agentcore-adds-quality-evaluations-and-policy-controls-for-deploying-trusted-ai-agents/) score degradation with GuardDuty findings to surface high-confidence threat signals.
5. **Route fixes to developers and measure MTTR:** Route remediation recommendations, including code fixes from AWS Security Agent, to development teams through a tracked workflow, and monitor mean time to detection and mean time to remediation as key security metrics.
6. **Tune detection quarterly:** Review detection rules, remediation workflows, and finding correlation logic quarterly based on observed threat patterns and false positive rates.

## Resources

**Related best practices:**

- [AGENTSEC05-BP01 Implement comprehensive logging and decision artifact storage](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html)
- [AGENTSEC07-BP04 Behavioral anomaly detection and agent containment](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp04.html)
- [AGENTSEC09-BP01 Integrate AI-powered vulnerability scanning across the development lifecycle](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp01.html)
- [AGENTSEC09-BP02 Conduct context-aware penetration testing with multi-agent attack simulation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp02.html)

**Related services:**

- [Amazon GuardDuty](https://aws.amazon.com/guardduty/)
- [AWS Security Hub CSPM](https://aws.amazon.com/security-hub/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon Macie](https://aws.amazon.com/macie/)
- [Amazon Inspector](https://aws.amazon.com/inspector/)
