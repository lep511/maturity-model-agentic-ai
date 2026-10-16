# AGENTREL08-BP04 Track agent memory utilization metrics

**Pillar:** Reliability · **Focus area:** AGENTREL08 — Graceful degradation and configuration management · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL08-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel08-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Memory exhaustion produces agents that look healthy but lack the context to reason well. Tracking utilization across short-term, long-term, and in-context tiers reveals the pressure before silent failures begin.

## Desired outcome

- You track token counts per context component and emit context-window utilization percentages.
- You have alarms when context window utilization exceeds 80%, triggering summarization or pruning workflows.
- You detect memory growth trends through metric math so gradual leaks surface before they cause failures.

## Common anti-patterns

- Monitoring only infrastructure-level memory metrics without tracking agent-specific patterns like context window utilization and session state growth.
- Operating without baselines for normal memory consumption, making anomalous growth undetectable.
- Skipping in-context memory utilization, the most direct indicator of context-related degradation.

## Benefits of establishing this best practice

- Memory pressure gets detected early through continual monitoring before exhaustion causes failures.
- Degradation decisions are informed by which memory tier is actually under pressure.
- Silent memory-related failures get prevented because in-context utilization is monitored proactively.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

In-context memory is where silent failures start. When the context window fills with retrieved context, conversation history, and tool results, the model has less room for new information and its effective reasoning capacity drops. Tracking utilization by component (system prompt, retrieved context, conversation history, tool results) through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) tells you which component is driving pressure. Alarms when utilization exceeds 80% of the model's context window trigger summarization or pruning workflows before the limit becomes a hard wall. For accurate token measurement with Anthropic models on Amazon Bedrock, use [Amazon Bedrock token counting](https://docs.aws.amazon.com/bedrock/latest/userguide/count-tokens.html). For other providers, approximate estimation works well enough for baseline purposes.

External memory stores are the other place pressure shows up. Monitor [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) access latency and error rates through AgentCore Observability, and watch infrastructure-level metrics through Amazon CloudWatch. Latency climbing on memory access is often the first signal that the store is under pressure, well before it actually fails.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel08-bp04.html#implementation-guidance)

### Implementation steps

1. **Track in-context memory utilization per component:** Measure token counts for system prompt, retrieved context, conversation history, and tool results. Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) for collection.
2. **Configure alarms at 80% context window utilization:** Trigger summarization or pruning workflows before the limit becomes a hard wall.
3. **Monitor AgentCore Memory access latency and error rates:** Catch external store pressure early through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html).
4. **Implement memory growth trend analysis:** Use [Amazon CloudWatch Metric Math](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html) to detect gradual leaks that don't trip threshold alarms.
5. **Build automated memory management responses:** Implement summarization, pruning, and consolidation responses per tier.

## Resources

**Related best practices:**

- [AGENTREL03-BP04 Implement graceful degradation for memory and state operations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp04.html)
- [AGENTREL08-BP01 Establish consistent configuration management practices](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel08-bp01.html)
- [AGENTREL08-BP02 Implement agent tracing for telemetry throughout agent processing](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel08-bp02.html)
- [AGENTREL08-BP03 Architect agent systems with resource isolation and contention mitigation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel08-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
