# AGENTCOST05-BP02 Implement distributed cost tracing for multi-agent workflows

**Pillar:** Cost optimization · **Focus area:** AGENTCOST05 — Agent cost visibility and attribution · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST05-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

In multi-agent workflows, aggregate cost tells you how much you spent but not where those specific costs came from. Tracing with workflow IDs propagating across agent boundaries makes workflow costs more clear, as it is broken down into worker execution, tool invocations, and memory operations, which helps you make data-driven architectural optimization decisions.

## Desired outcome

- You propagate workflow trace IDs through every agent invocation, tool call, and memory operation.
- You calculate true cost-per-workflow-completion, with orchestration overhead tracked separately from execution cost.
- You compare efficiency across different collaboration patterns using real cost data.
- You visualize workflow cost by pattern, agent role, and business outcome.

## Common anti-patterns

- Tracking costs for individual agents without workflow-level correlation, making it impossible to calculate true cost-per-workflow-completion.
- Combining supervisor and worker costs into a single metric, obscuring whether workflows suffer from excessive orchestration overhead.
- Deploying one multi-agent pattern without measuring cost differences between alternatives, missing architectural cost reduction.
- Analyzing total costs without role-based breakdowns, reducing the risk of identification of which agent types drive the highest spending and require targeted optimization.

## Benefits of establishing this best practice

- Full workflow cost visibility enables calculation of true cost-per-workflow-completion across agent boundaries.
- Orchestration overhead ratios reveal when coordination consumes a disproportionate share of workflow spending.
- Cost comparison across collaboration patterns turns architecture decisions from guesswork into data-driven choices.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Workflow-level cost visibility starts with a workflow trace ID generated at workflow initiation and propagated through every agent invocation, tool call, and memory operation. Without that correlation key, per-agent costs can't be stitched into a per-workflow total, and it becomes difficult to determine how expensive it is to deliver one business outcome. [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) provides a three-tiered hierarchy that maps directly to this problem: sessions for complete workflows, traces for individual agent invocations, and spans for operation-level granularity. For agents on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html), session isolation keeps cost boundaries aligned with agent execution boundaries, so no complex allocation formulas are required.

The most useful decomposition within a workflow is the orchestrator-compared to-worker split. Tag supervisor invocations with agent-role:orchestrator and worker invocations with agent-role:worker, then compute the orchestration overhead ratio as orchestrator cost divided by total workflow cost. A high ratio indicates coordination is dominating execution, which typically signals a hierarchy that needs flattening or manifests that need compression. Breaking workflow cost further into orchestration tokens, worker execution tokens, tool invocation costs, and memory retrieval costs tells you which component to optimize first.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp02.html#implementation-guidance)

### Implementation steps

1. **Enable distributed tracing across agents:** Configure [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to capture distributed traces, exporting telemetry to Amazon CloudWatch with workflow trace IDs propagated through every invocation.
2. **Apply role-based tagging and compute overhead ratios:** Tag every invocation with agent-role (orchestrator or worker), and calculate the orchestration overhead ratio per workflow type.
3. **Visualize cost by pattern and alarm on thresholds:** Build CloudWatch dashboards showing workflow cost distributions by collaboration pattern and agent role, with alarms when orchestration overhead exceeds thresholds.
4. **Run pattern experiments:** Route a percentage of executions to alternative collaboration patterns and compare cost-per-workflow-completion across patterns.
5. **Compare workflow efficiency in Cost Explorer:** Use AWS Cost Explorer to compare efficiency across different collaboration patterns over time.
6. **Decompose workflow cost:** Deploy cost aggregation functions that break total workflow cost into orchestration tokens, worker execution tokens, tool invocation costs, and memory retrieval costs for each workflow type.

## Resources

**Related best practices:**

- [AGENTCOST01-BP02 Optimize multi-agent collaboration cost through efficient handoff patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp02.html)
- [AGENTCOST01-BP03 Implement cost-effective patterns like hybrid supervisor for multi-agent coordination](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp03.html)
- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)
- [AGENTCOST05-BP03 Design tenant-aware cost allocation for AaaS pricing models](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
