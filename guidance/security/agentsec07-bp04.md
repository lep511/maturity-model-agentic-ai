# AGENTSEC07-BP04 Behavioral anomaly detection and agent containment

**Pillar:** Security · **Focus area:** AGENTSEC07 — Human oversight protection and agent containment · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC07-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Detection without containment leaves issues identified but running. Containment without detection relies on manual observation. Per-agent baselines paired with automated credential revocation and forensic capture stop affected agents within minutes while preserving what investigators need.

## Desired outcome

- You establish behavioral baselines per agent and trigger real-time alerts when deviations cross defined thresholds.
- You automatically isolate agents exhibiting anomalous behavior within minutes of detection through credential revocation and circuit breaker activation.
- You capture forensic state before isolation, and manual override capabilities allow incident responders to quarantine or restore agents when human judgment is required.

## Common anti-patterns

- Monitoring only infrastructure metrics without agent-specific behavioral indicators, missing signals such as API call patterns, decision frequencies, and data access volumes.
- Deploying anomaly detection without establishing behavioral baselines first, producing excessive false positives or missed detections.
- Relying on manual quarantine processes that require human intervention, letting an affected agent continue operating for hours while waiting for human response.
- Implementing quarantine by stopping the agent process without revoking credentials, so the agent can be restarted with the same identity and permissions.
- Not preserving agent state and logs before quarantine, losing forensic evidence from the agent's memory, active sessions, and pending operations.

## Benefits of establishing this best practice

- Automated credential revocation and circuit breaker activation isolate affected agents within minutes of detection.
- Forensic preservation through state capture before isolation provides evidence for investigation without relying on the agent's own logs.
- Circuit breakers route dependent workflows to safe fallback paths rather than allowing cascading failures.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Behavioral signals differ by agent type. A RAG agent and a coding agent have very different normal patterns, so generic thresholds produce either false alarms or missed detections. Start with the general categories (API call rate, data access volume, decision frequency, error rate, resource consumption) but pick the specific measurements that actually make sense for each agent. A customer-support agent might track outbound email volume and cross-customer retrievals, a coding agent might track commit rates and commands executed, and a data-analysis agent might track query volume and cross-table joins. Amazon CloudWatch anomaly detection on the selected metrics establishes dynamic baselines that adapt to normal variation patterns, reducing false positives compared to static thresholds, and alarms fire when metrics deviate beyond the anomaly detection band.

[Amazon Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/aws/amazon-bedrock-agentcore-adds-quality-evaluations-and-policy-controls-for-deploying-trusted-ai-agents/) adds a detection layer at the behavior-quality level. Built-in evaluators (correctness, tool-selection accuracy, helpfulness, safety) are a starting point, but custom evaluators capture the quality dimensions that matter for your agent, whether outputs conform to your organization's policy, whether the agent is using the expected tools for its domain, and whether it accomplishes the task it was assigned. A sudden drop in evaluation scores serves as an early-warning signal that behavior is drifting before infrastructure-level anomaly alarms fire. Amazon CloudWatch alarms on evaluation scores alongside behavioral metrics give you layered detection.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp04.html#implementation-guidance)

### Implementation steps

1. **Choose agent-specific metrics and baseline them:** Pick meaningful metrics for each agent from the general categories, configure Amazon CloudWatch anomaly detection on them, and establish baselines during normal operation.
2. **Add evaluation-based early warning:** Deploy [Amazon Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/aws/amazon-bedrock-agentcore-adds-quality-evaluations-and-policy-controls-for-deploying-trusted-ai-agents/) with built-in and custom evaluators, and configure Amazon CloudWatch alarms on evaluation scores.
3. **Centralize security findings:** Enable Amazon GuardDuty and Amazon Macie for all agent accounts and centralize findings in AWS Security Hub CSPM.
4. **Automate containment on threshold exceedance:** Implement Amazon EventBridge rules that invoke AWS Lambda or AWS Systems Manager Automation when anomaly severity exceeds thresholds, and sequence forensic capture, credential revocation, and quarantine event broadcast.
5. **Wire circuit breakers into dependent workflows:** Configure catch states in AWS Step Functions workflows that depend on quarantinable agents, routing to safe fallback paths on agent unavailability.
6. **Provide a manual runbook with multi-person auth:** Create AWS Systems Manager Automation runbooks for manual quarantine and restoration with multi-person authorization required for restoration.
7. **Test quarterly:** Run containment procedure tests every quarter to validate isolation, circuit breakers, and forensic capture.

## Resources

**Related best practices:**

- [AGENTSEC05-BP01 Implement comprehensive logging and decision artifact storage](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html)
- [AGENTSEC06-BP02 Implement workflow orchestration security controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp02.html)
- [AGENTSEC06-BP04 Monitor and detect coordination anomalies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp04.html)
- [AGENTREL02-BP03 Implement behavioral anomaly detection and monitoring](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp03.html)
- [AGENTREL07-BP02 Enable automatic recovery from agent execution failures](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp02.html)

**Related services:**

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon GuardDuty](https://aws.amazon.com/guardduty/)
- [Amazon Macie](https://aws.amazon.com/macie/)
- [AWS Security Hub CSPM](https://aws.amazon.com/security-hub/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [AWS Systems Manager](https://aws.amazon.com/systems-manager/)
- [AWS Identity and Access Management](https://aws.amazon.com/iam/)
