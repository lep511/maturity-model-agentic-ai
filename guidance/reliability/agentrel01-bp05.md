# AGENTREL01-BP05 Implement adaptive provisioning

**Pillar:** Reliability · **Focus area:** AGENTREL01 — Predictable agent behavior · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL01-BP05](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp05.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Static provisioning forces a choice between overpaying for peak and failing under load. Agent workloads shift minute to minute, so capacity, model tier, and quota must respond to task complexity and current demand without operator intervention.

## Desired outcome

- You have agent compute allocation that adjusts for each invocation without manual tuning.
- You route tasks to model tiers appropriate for their complexity, with fallbacks when quotas tighten.
- You pre-provision resources ahead of known demand patterns and scale down during quiet periods.

## Common anti-patterns

- Running static resource provisioning and paying for peak capacity even during low-demand periods.
- Skipping the metrics that trigger scaling decisions, so the system has no basis to provision resources when they are needed.
- Treating every task as needing the same model, ignoring the cost and latency savings of tiering by complexity.

## Benefits of establishing this best practice

- Performance stays consistent under variable load because resources track demand instead of a fixed provisioning plan.
- Resource exhaustion during spikes is prevented without human intervention.
- Cost drops during low-demand periods through automatic scale-down.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Serverless is the baseline for adaptive compute. [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) hosts agents with built-in scaling that adjusts compute allocation for each invocation, so individual agents don't need to manage fleet sizing. For LLM inference, Amazon Bedrock's on-demand mode scales without capacity reservations. [Amazon Bedrock cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) distributes requests across Regions to reduce the impact of regional capacity constraints.

Tiering matches model selection to workload. Low-complexity tasks route to smaller, faster Amazon Bedrock models, while complex reasoning routes to larger models. The router should adjust dynamically based on task complexity signals and current quota utilization, not a fixed rule baked into code. For latency-sensitive user-facing agents where throttling is unacceptable, use Amazon Bedrock's Priority on-demand tier for premium throughput allocation. For workloads that need consistent low latency regardless of overall service demand, use Amazon Bedrock Provisioned Throughput with fixed model units. The [Amazon Bedrock Capacity, Limits, and Cost Optimization](https://docs.aws.amazon.com/bedrock/latest/userguide/capacity-limits-cost-optimization.html) guide covers the trade-offs between Flex, Standard, Priority, and Reserved tiers.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp05.html#implementation-guidance)

### Implementation steps

1. **Deploy agents on AgentCore Runtime for serverless scaling:** Use [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) so compute allocation adjusts for each invocation without manual fleet sizing.
2. **Route tasks by complexity to appropriate Amazon Bedrock models:** Implement tiered model selection that sends low-complexity tasks to smaller models and reasoning-heavy tasks to larger ones based on complexity signals.
3. **Enable Amazon Bedrock cross-region inference:** Turn on [cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) to distribute requests and reduce the impact of regional capacity constraints.
4. **Monitor token throughput and latency through AgentCore Observability:** Watch per-tier throughput and latency through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) and trigger tier adjustments when thresholds are exceeded.
5. **Use scheduled scaling ahead of anticipated spikes:** Pre-provision based on historical patterns so capacity is ready before demand lands.

## Resources

**Related best practices:**

- [AGENTREL01-BP01 Implement a resilient messaging layer](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp01.html)
- [AGENTREL01-BP02 Establish modular, fault-isolated layers](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp02.html)
- [AGENTREL08-BP03 Architect agent systems with resource isolation and contention mitigation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel08-bp03.html)
- [AGENTCOST02-BP01 Architect tiered model selection for cost-performance optimization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
