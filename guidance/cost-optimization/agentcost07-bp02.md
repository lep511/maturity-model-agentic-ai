# AGENTCOST07-BP02 Establish proactive anomaly detection for agent cost patterns

**Pillar:** Cost optimization · **Focus area:** AGENTCOST07 — Agent cost governance and continuous optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST07-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost07-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Generic billing alerts help you find cost escalation more quickly after it starts. Agent-specific anomaly detection catches reasoning loop token spikes, tool invocation storms, and memory growth quickly, and routing those alerts correctly means that you can alert the team that owns the agent instead of the operations team.

## Desired outcome

- You establish ML-based anomaly detection with statistical baselines and deviation thresholds.
- You have custom detectors for agent-specific failure modes beyond generic infrastructure monitoring.
- You pair every anomaly type with an investigation runbook to accelerate resolution.
- You correlate anomalies to route agent-driven issues to development teams and infrastructure issues to operations teams.

## Common anti-patterns

- Deploying anomaly detection without sufficient baseline data, generating excessive false positives that undermine team confidence.
- Relying solely on generic infrastructure monitoring that misses agent-specific failure modes driving the highest costs.
- Detecting anomalies without investigation runbooks, leaving costs escalating while teams figure out diagnostic procedures as issues occur.
- Treating all cost spikes as equivalent when agent spikes have different root causes (reasoning loops, tool storms, memory growth) that require different remediation.
- Collecting anomaly insights without feeding them back into agent design changes (tighter iteration limits, better prompts, tool caching) that help prevent recurrence.

## Benefits of establishing this best practice

- Proactive detection identifies cost escalation from agent-specific failure modes within minutes rather than days.
- Investigation runbooks reduce mean time to resolution by replacing ad-hoc analysis with guided diagnostic execution.
- Correlation analysis routes alerts to the right team (agent development or operations), helping prevent triage delays.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Anomaly detection needs real baselines before it is useful. Collect 2 to 4 weeks of baseline operational data before setting thresholds, because detectors configured on insufficient history produce false positives that erode confidence in the whole system. [Amazon CloudWatch Anomaly Detection](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html) automatically learns statistical baselines for agent cost metrics and generates dynamic anomaly bands that adapt to seasonality and trends. Apply it to [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) metrics including token consumption per session, tool invocation frequency, memory growth, and cost-per-task-completion. Use 2σ for warning and 3σ for critical alerts.

Generic infrastructure monitoring doesn't catch the failure modes that cost agents the most money. Reasoning loop token spikes, tool invocation storms, and memory growth are agent-specific patterns, and they need agent-specific detectors. Reasonable initial thresholds include:

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost07-bp02.html#implementation-guidance)

### Implementation steps

1. **Baseline, then detect:** Collect 2 to 4 weeks of baseline data using [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html), then configure [Amazon CloudWatch Anomaly Detection](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html) on key cost indicators with 2σ warning and 3σ critical thresholds.
2. **Implement agent-specific detectors:** Deploy Lambda-based detectors for reasoning loop token spikes (5x session average), tool invocation storms (3x baseline rate), memory growth anomalies (2x per hour), and workflow cost escalation (2x historical average), publishing structured anomaly events to Amazon EventBridge.
3. **Add billing-level anomaly coverage:** Configure [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html) monitors per agent cost allocation tag as a backstop for gradual escalations.
4. **Create investigation runbooks:** Store runbooks for each anomaly type in AWS Systems Manager OpsCenter, with diagnostic queries (Amazon CloudWatch Logs Insights for traces, AWS X-Ray for distributed workflows, AgentCore Observability span analysis for token patterns) and mitigation actions.
5. **Route anomalies through correlation analysis:** Classify anomalies using cost allocation tags and AgentCore Observability dimensions, routing agent-driven anomalies to development teams and infrastructure anomalies to operations teams.

## Resources

**Related best practices:**

- [AGENTCOST01-BP01 Use the reflection pattern to design efficient agent reasoning loops](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp01.html)
- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)
- [AGENTCOST07-BP01 Implement automated cost controls with intelligent cutoffs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost07-bp01.html)
- [AGENTCOST07-BP03 Create systematic optimization feedback loops for continuous improvement](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost07-bp03.html)

**Related services:**

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Cost Management](https://aws.amazon.com/aws-cost-management/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
