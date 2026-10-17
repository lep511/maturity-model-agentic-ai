# AGENTSUS02-BP04 Measure and optimize the environmental footprint of agent workloads

**Pillar:** Sustainability · **Focus area:** AGENTSUS02 — Resource right-sizing · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS02-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Without measurement, sustainability claims are aspirational and optimizations are not tracked against real-world data. Tracking the environmental footprint of agent workloads makes sustainability an engineering metric. Baselines show where effort is worth investing, and trends show whether changes are actually working.

## Desired outcome

- You have carbon emissions baselines for agent infrastructure established across a defined observation period.
- Resource efficiency metrics for each task (tokens per successful completion, compute hours per workflow, and cache hit rates) are tracked alongside business outcomes.
- Deferrable workloads are scheduled during off-peak periods or routed to Regions with favorable energy profiles.
- Operational and sustainability metrics are combined in dashboards that inform periodic optimization reviews.

## Common anti-patterns

- Claiming sustainability benefits from agent optimizations without establishing baselines, making it impossible to validate whether changes actually reduced impact.
- Treating every workload as equally time-sensitive, running batch processing and background tasks during peak hours when deferring them would reduce contention and energy consumption.
- Ignoring regional differences in energy infrastructure when selecting deployment Regions for workloads with flexible latency requirements.
- Tracking only infrastructure utilization without tying it to business outcomes, so efficiency gains in compute don't connect to value delivered.

## Benefits of establishing this best practice

- Measurable baselines make sustainability improvements verifiable instead of aspirational.
- Optimization effort flows to the workloads with the largest environmental impact, rather than being applied uniformly.
- Deferrable workloads run when infrastructure is underutilized, improving fleet-wide efficiency without affecting user-facing performance.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

[AWS Sustainability](https://docs.aws.amazon.com/sustainability/latest/userguide/what-is-sustainability.html) provides carbon emissions tracking with service and Region breakdowns for the infrastructure side, and [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) adds agent-specific metrics, tokens per successful task, compute hours per workflow, and cache hit rates that tie consumption to business outcomes. Establish baselines across a 30-day observation window so that normal workload variation is included, and track trends monthly afterward so optimization work can be validated against measured change rather than claimed change.

Not every agent workload has the same latency sensitivity. User-facing interactions need low-latency responses. Batch jobs, periodic knowledge base indexing, bulk data enrichment, evaluation runs, and non-interactive research workflows can wait hours or overnight without affecting the user. Shifting deferrable work to off-peak periods reduces resource contention on shared infrastructure and takes advantage of time windows when the broader grid is cleaner. [Amazon Bedrock cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) extends the same principle across geographies. Batch workloads without tight latency constraints can run in Regions with favorable energy profiles rather than defaulting to the closest one.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp04.html#implementation-guidance)

### Implementation steps

1. **Enable carbon emissions tracking:** Turn on [AWS Sustainability](https://docs.aws.amazon.com/sustainability/latest/userguide/what-is-sustainability.html) and establish environmental baselines for agent infrastructure across a 30-day observation window.
2. **Instrument resource efficiency per task:** Configure [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to track tokens per successful completion, compute hours per workflow execution, and cache hit rates.
3. **Schedule deferrable workloads off-peak:** Identify non-interactive workloads and shift them to off-peak windows: batch processing, knowledge base indexing, periodic AgentCore Evaluations runs, bulk data enrichment.
4. **Evaluate Region placement for batch work:** For workloads with flexible latency, use [Amazon Bedrock cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) to route requests to Regions with favorable energy profiles.
5. **Build combined dashboards and review on a cadence:** Create Amazon CloudWatch dashboards pairing operational metrics with sustainability indicators (resource utilization efficiency, waste percentage, and peak compared to off-peak utilization), and review them as part of periodic optimization cycles.

## Resources

**Related best practices:**

- [AGENTSUS02-BP01 Optimize context management and memory utilization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp01.html)
- [AGENTSUS02-BP03 Appropriately scale data, networking, and compute dependencies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp03.html)
- [SUS01-BP01 Choose Region based on both business requirements and sustainability goals](https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sus_sus_region_a2.html)

**Related services:**

- [AWS Sustainability](https://aws.amazon.com/sustainability/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
