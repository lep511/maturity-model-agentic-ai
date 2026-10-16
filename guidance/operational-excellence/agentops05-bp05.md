# AGENTOPS05-BP05 Create workflow-specific dashboards for operational health

**Pillar:** Operational excellence · **Focus area:** AGENTOPS05 — Observability and monitoring for agentic systems · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS05-BP05](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp05.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Generic infrastructure dashboards can hide important metrics to agentic workflows. A dashboard designed around a specific workflow's critical path, step-level latencies, and characteristic failure modes provides detail that operators need to quickly see issues and understand the root cause.

## Desired outcome

- Each critical agent workflow has a dedicated dashboard with real-time visibility into workflow health.
- Operators identify issues and quickly understand root causes.
- Dashboards are tailored to the specific characteristics of each workflow, not generic templates.
- Operational teams use these dashboards as the primary tool for workflow monitoring and incident response.

## Common anti-patterns

- Using generic infrastructure dashboards for all agent workflows, missing workflow-specific metrics like handoff success rates, reasoning iteration counts, and step-level bottlenecks.
- Building dashboards without linking to operational runbooks, forcing operators to search for remediation during incidents instead of navigating directly.
- Creating dashboards once and never updating them as workflows evolve, so metrics for steps that no longer exist stay visible while new steps go unmonitored.
- Building dashboards that require deep context to interpret, so only the original author can make sense of them.

## Benefits of establishing this best practice

- Workflow-specific dashboards expose the metrics and patterns most relevant to each workflow's operational characteristics and failure modes.
- Tailored dashboards adapt monitoring depth to each workflow's criticality, providing detail for critical workflows and overview for less critical ones.
- Embedded runbook links compress the time from detection to remediation.
- Deployment event annotations correlate metric changes with configuration changes, giving operators attribution without cross-referencing tools.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

A common layout, like top-level health summary (healthy, degraded, and critical), key metrics as time-series graphs, and recent events and alerts, means that operators learn the pattern once and apply it to every workflow dashboard. Each workflow then adds its specific content, like the critical-path steps, their completion times, their success rates, and their queue depths.

Identifying the critical path within the dashboard. [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) Contributor Insights identifies top contributors to errors and latency empirically rather than by guesswork, which is often more accurate than what the team assumes.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp05.html#implementation-guidance)

### Implementation steps

1. **Identify workflows that warrant dedicated dashboards:** Base the list on business impact and incident history.
2. **Design a consistent dashboard layout:** Apply the same health summary, key metrics, and recent events pattern to every workflow dashboard.
3. **Visualize the critical path:** Show step-level latency and success rates for the steps where bottlenecks typically form, using [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights.html) Contributor Insights to identify top contributors empirically.
4. **Annotate deployment events:** Correlate metric changes with configuration deployments so attribution is visible on the dashboard.
5. **Embed runbook links and review quarterly:** Link each dashboard to the runbook for common failure scenarios, and update dashboards as workflows change.

## Resources

**Related best practices:**

- [AGENTOPS05-BP04 Define and track KPIs for agent workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp04.html)
- [AGENTOPS05-BP01 Establish end-to-end tracing and telemetry for agent operations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp01.html)
- [AGENTOPS05-BP02 Monitor agent behavior patterns and detect anomalies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp02.html)

**Related services:**

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
