# AGENTPERF01-BP01 Define performance-aligned success criteria for agent workloads

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF01 — Strategic performance planning and measurement · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF01-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agent workloads are harder to measure than traditional applications because a single user request fans out into multiple inference calls, tool invocations, and memory retrievals, each with its own latency, quality, and cost signature. Without explicit performance targets, teams optimize against a moving reference and can't tell when an agent is ready for production.

## Desired outcome

- You have documented performance success criteria for every agent workload, with specific, measurable targets that are reviewed as business requirements evolve.
- Your teams objectively assess whether an agent meets performance expectations before deployment and continually validate performance in production.
- You have performance criteria integrated into CI/CD pipelines as quality gates, helping prevent regressions from reaching production.

## Common anti-patterns

- Defining success criteria only around infrastructure metrics such as CPU utilization or memory consumption, without measuring agent-specific dimensions like reasoning latency, token efficiency, or task completion quality.
- Applying a single latency target across streaming and non-streaming agents, or across interactive and batch workloads, when time-to-first-token and end-to-end completion are primary KPIs for different agent classes.
- Establishing performance targets after deployment rather than during design, producing architectures that can't meet requirements without significant rework.

## Benefits of establishing this best practice

- Explicit success criteria establish concrete targets against which telemetry can be evaluated, making downstream performance work measurable rather than speculative.
- Performance-aligned criteria direct teams to optimize the reasoning pipeline for the metrics that matter, rather than pursuing generic optimizations that don't improve business outcomes.
- Quality gates tied to measurable targets convert success criteria into enforceable artifacts that block regressions from reaching production rather than detecting them after the fact.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Success criteria for an agent workload must be concrete enough to evaluate a build against and specific enough to drive architectural decisions. A performance-aligned criterion names the signal, the threshold, the percentile or attainment goal, the evaluation window, and the business outcome it helps protect. Without that specificity, teams can't decide whether to swap models, add caching, split a workflow, or reject a release, as there is no reference against which the change can be judged.

Agent workloads have a wider KPI surface than traditional applications because a single user request expands into multiple inference calls, retrieval queries, tool invocations, and, for multi-agent systems, inter-agent handoffs, each with its own latency, error mode, and cost. A complete set of success criteria spans four dimensions:

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html#implementation-guidance)

### Implementation steps

1. **Capture business outcomes and user expectations with stakeholders:** Work with product, business, and user-experience owners to document the outcomes the agent must produce, the scenarios in which it operates, and the user expectations for responsiveness, quality, and cost. Use this intake to frame every downstream target so latency, throughput, quality, and efficiency KPIs trace back to a stated business or user need. The [AWS Well-Architected Performance Efficiency process guidance](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/perf_process_culture_establish_key_performance_indicators.html) treats this stakeholder alignment as the first step in establishing credible KPIs.
2. **Classify each agent workload by interaction pattern:** Determine whether the agent is streaming or non-streaming, interactive or batch, synchronous or asynchronous, and single-agent or multi-agent. The classification dictates which latency KPI is primary, time-to-first-token for streaming conversational agents, end-to-end completion for task-oriented agents, throughput and cost-per-task for batch workflows, and whether multi-agent coordination metrics such as handoff latency and collaboration success belong in the criteria set.
3. **Define the KPI taxonomy spanning latency, throughput, quality, and efficiency:** For each workload, enumerate the specific signals to measure along the four dimensions, including agent-specific signals that infrastructure metrics can't cover. Structure quality signals in layers, final-response quality, task completion, tool use accuracy, memory and retrieval relevance, reasoning grounding, and responsibility and safety, following the [agent evaluation framework described by Amazon teams](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/). Include efficiency signals such as tokens per task, cost per completion, and cache hit rate to connect performance to unit economics.
4. **Set quantitative targets with thresholds, percentiles, and attainment goals:** Attach a numeric target to every KPI, specifying the percentile (p50, p90, p99) for latency and throughput signals and the attainment goal (for example, 99.5 percent of requests) for quality and availability signals. Anchor latency targets to p90 and p99 rather than averages, because tail behavior drives user-perceived performance, the [AWS Well-Architected Performance Efficiency pillar](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html) cautions that averages hide the slow responses that matter most.
5. **Allocate per-phase latency budgets within the end-to-end budget:** Decompose the end-to-end latency target into per-phase budgets, context retrieval, LLM inference, tool invocation, inter-agent coordination, output generation, so each phase has its own ceiling that sums to the overall target. Per-phase budgets make exceedances attributable at criteria-definition time and give engineering teams clear optimization targets when a phase drifts. Validate the decomposition against measured traces so the budgets reflect real behavior rather than assumption.
6. **Formalize targets as service level objectives with error budgets and burn-rate alerts:** For each customer-facing KPI, encode the target as an SLO with an SLI, threshold, attainment goal, interval, and period using [Amazon CloudWatch Application Signals service level objectives](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html). Configure burn-rate alarms so the service signals when the error budget is being consumed faster than expected, giving operators time to respond before an SLO is exceeded. Group related SLIs into composite SLOs where a single user-facing outcome depends on multiple operations meeting their individual targets.
7. **Operationalize quality and cost KPIs through GenAI-aware monitoring:** Publish token consumption, per-invocation latency percentiles, cost attribution, and agent-level quality metrics through [Amazon CloudWatch generative AI observability](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/GenAI-observability.html), which surfaces these signals natively for Amazon Bedrock model invocations and accepts structured traces from agents running on any runtime through the [AWS Distro for OpenTelemetry](https://aws-otel.github.io/docs/introduction). Emit agent-specific quality signals, task completion rate, tool selection accuracy, reasoning grounding, as custom metrics so they can be thresholded, alarmed, and tied to SLOs the same way infrastructure signals are.
8. **Integrate targets as quality gates in the deployment pipeline:** Convert each success criterion into an automated check in CI/CD so releases that exceed a latency, quality, or cost target are blocked before they reach users. Run load tests against the latency and throughput targets and curated evaluation sets against the quality targets as part of the pipeline, following the lifecycle-management framing in [Operationalizing agentic AI on AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-operationalizing-agentic-ai/introduction.html). Gates turn written criteria into enforceable artifacts that help prevent regressions rather than detecting them in production.
9. **Revisit targets on a defined cadence as the workload evolves:** Schedule regular reviews of each success criterion against production telemetry, changes in user expectations, and shifts in the underlying models, prompts, or tools. Tighten targets that are consistently exceeded, relax targets that are blocking legitimate improvements, and retire signals that no longer map to a business outcome, agent behavior drifts, and criteria that were correct at launch need to be revalidated against current reality.

## Resources

**Related best practices:**

- [AGENTPERF01-BP02 Implement comprehensive performance telemetry](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp02.html)
- [AGENTPERF01-BP03 Profile end-to-end agent latency and identify optimization targets](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp03.html)
- [AGENTOPS05-BP04 Define and track KPIs for agent workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp04.html)
- [AGENTOPS06-BP02 Evaluate and track ongoing agent performance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp02.html)
- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)

**Related services:**

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon CloudWatch Application Signals](https://aws.amazon.com/cloudwatch/features/application-monitoring/)
- [AWS Distro for OpenTelemetry (ADOT)](https://aws.amazon.com/otel/)
