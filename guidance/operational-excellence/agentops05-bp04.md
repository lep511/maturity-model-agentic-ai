# AGENTOPS05-BP04 Define and track KPIs for agent workflows

**Pillar:** Operational excellence · **Focus area:** AGENTOPS05 — Observability and monitoring for agentic systems · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS05-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Infrastructure metrics like CPU, memory, and invocation count explain whether an agent is running. However, these metrics don't determine whether an agent is actually working. Key performance indicators (KPIs) tied to business outcomes give teams and stakeholders a shared language for discussing and improving agent performance.

## Desired outcome

- Every agent workflow has a defined set of KPIs tracked continually against established baselines.
- Teams identify performance degradation early and correlate KPI changes with configuration or model updates.
- Optimization efforts are prioritized based on measurable impact rather than intuition.
- Business stakeholders have regular visibility into how agent workflows contribute to business outcomes.

## Common anti-patterns

- Tracking only infrastructure metrics (like CPU, memory, and invocation count) without agent-specific KPIs that measure business outcomes like task completion rate and user satisfaction.
- Defining KPIs at deployment and never revisiting them as business objectives evolve, measuring metrics that no longer reflect what matters.
- Collecting KPI data without establishing baselines or alerting thresholds, producing dashboards that no one monitors proactively.
- Weighting operational and business metrics equally when one matters ten times more than the other, creating dashboards that feel balanced but mislead.

## Benefits of establishing this best practice

- KPIs provide the quantitative foundation for evidence-based decisions, so teams measure change impact and prioritize improvements based on data.
- Trend tracking reveals patterns of degradation or improvement that inform continuous refinement of prompts, configurations, and integrations.
- Business outcome metrics connect agent work to value delivered, giving stakeholders regular, concrete updates instead of vague reassurance.
- Anomaly-based alerting catches gradual degradation that static thresholds miss.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

A usable KPI framework covers four dimensions rather than one.

Skipping any dimension produces a dashboard that looks complete and can be misleading.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp04.html#implementation-guidance)

### Implementation steps

1. **Define a four-dimensional KPI framework:** Cover operational, quality, efficiency, and business dimensions for each agent workflow, with use-case-specific weighting.
2. **Collect KPIs through [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html) custom metrics:** Add dimensions for agent, workflow, and environment so the same metric can be sliced multiple ways.
3. **Establish baselines and configure anomaly detection:** Use [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html) Anomaly Detection with warning and critical alerting thresholds.
4. **Build weekly KPI dashboards:** Use [Amazon Quick](https://docs.aws.amazon.com/quicksuite/latest/user/welcome.html) reports shared with technical and business stakeholders.
5. **Review KPI alignment quarterly:** Verify that definitions still reflect current business objectives, and retire or replace metrics that no longer apply.

## Resources

**Related best practices:**

- [AGENTOPS05-BP01 Establish end-to-end tracing and telemetry for agent operations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp01.html)
- [AGENTOPS05-BP05 Create workflow-specific dashboards for operational health](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp05.html)
- [AGENTOPS02-BP04 Maintain feedback control loops for continuous improvement](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp04.html)

**Related services:**

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon Quick](https://aws.amazon.com/quicksuite/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
