# AGENTSEC06-BP04 Monitor and detect coordination anomalies

**Pillar:** Security · **Focus area:** AGENTSEC06 — Secure multi-agent orchestration · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC06-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Distributed tracing tells you what happened on one request. Coordination monitoring tells you when many requests start behaving differently from the baseline. Tracking inter-agent message rates, workflow frequencies, and topology changes against established baselines catches issues through their observable impact on coordination before they escalate into security events.

## Desired outcome

- You detect anomalous coordination patterns such as unexpected agent communication paths, unusual interaction frequencies, or coordination latency spikes in near real time and trigger alerts for investigation.
- You establish baseline coordination profiles for each agent workflow, so statistical anomaly detection catches deviations before they cause significant impact.

## Common anti-patterns

- Monitoring only infrastructure metrics (CPU, memory, and network) without tracking agent-specific coordination metrics, missing the coordination-level signals most indicative of multi-agent issues.
- Not establishing coordination baselines before deploying anomaly detection, which produces either excessive false positives or missed detections.
- Treating Amazon GuardDuty findings and agent coordination logs as separate data streams, leaving investigators without the multi-agent context that turns API-level anomalies into useful signal.

## Benefits of establishing this best practice

- Behavioral baselines catch coordination deviations before they propagate across the multi-agent system.
- Service maps compare observed communication paths against the expected trust boundary architecture, validating topology continually.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Distributed tracing (AGENTSEC05-BP02) reconstructs what happened during a specific request. Coordination anomaly detection is a different problem. It is a proactive early-warning system that watches whether coordination patterns across many requests over time are drifting from the baseline. Tracing is reactive and investigation-focused. Coordination monitoring is preventive and baseline-focused.

Start by defining coordination metrics for each multi-agent workflow:

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp04.html#implementation-guidance)

### Implementation steps

1. **Define and publish coordination metrics:** Capture inter-agent message rates, execution frequencies, response latencies, and error rates per agent pair through Amazon CloudWatch custom metrics for each multi-agent workflow.
2. **Establish baselines and enable anomaly detection:** Collect metrics during normal operation and configure Amazon CloudWatch anomaly detection on key metrics.
3. **Build topology maps:** Use [Amazon Bedrock AgentCore Observability](https://aws.amazon.com/blogs/machine-learning/build-trustworthy-ai-agents-with-amazon-bedrock-agentcore-observability/) service maps and A2A request lifecycle events to build coordination topology maps, and alert on unexpected topology changes that deviate from the documented trust boundary architecture.
4. **Layer evaluations as early warning:** Deploy [Amazon Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/aws/amazon-bedrock-agentcore-adds-quality-evaluations-and-policy-controls-for-deploying-trusted-ai-agents/) to continually score agent behavior, and configure Amazon CloudWatch alarms on evaluation scores as an early-warning layer for coordination issues.
5. **Correlate GuardDuty with coordination logs:** Enable Amazon GuardDuty for all agent accounts, integrate findings with AWS Security Hub CSPM, and create correlation rules that connect API anomalies to specific agent coordination logs.
6. **Run Logs Insights queries on a schedule:** Build Amazon CloudWatch Logs Insights queries for coordination security event patterns and publish results to a security dashboard on a scheduled cadence.
7. **Document the response runbook:** Establish an incident response runbook for coordination anomaly alerts that defines investigation steps, escalation paths, and remediation actions.

## Resources

**Related best practices:**

- [AGENTSEC06-BP01 Encrypt and sign inter-agent messages](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp01.html)
- [AGENTSEC06-BP03 Establish trust boundaries between agents](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp03.html)
- [AGENTSEC07-BP04 Behavioral anomaly detection and agent containment](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp04.html)
- [AGENTREL02-BP03 Implement behavioral anomaly detection and monitoring](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp03.html)

**Related services:**

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon GuardDuty](https://aws.amazon.com/guardduty/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Security Hub CSPM](https://aws.amazon.com/security-hub/)
