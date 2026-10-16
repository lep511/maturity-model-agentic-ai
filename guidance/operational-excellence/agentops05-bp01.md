# AGENTOPS05-BP01 Establish end-to-end tracing and telemetry for agent operations

**Pillar:** Operational excellence · **Focus area:** AGENTOPS05 — Observability and monitoring for agentic systems · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS05-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

When an agent produces an unexpected output, the investigation is only as good as the telemetry. Distributed tracing that captures the full execution path (reasoning, tool calls, memory operations, and model invocations) enables precise reconstruction of every decision and action.

## Desired outcome

- Every agent run produces a complete distributed trace covering the flow from request to response across all services and agents.
- Teams can reconstruct the exact sequence of operations for any run, enabling rapid debugging and targeted optimization.
- Real-time telemetry dashboards give operational teams continuous visibility into agent health.
- Trace data is retained on a defined policy for post-operations analysis and compliance.

## Common anti-patterns

- Instrumenting only infrastructure metrics (Lambda duration, API Gateway latency) without capturing agent-specific spans for reasoning steps, tool invocations, and memory operations.
- Implementing tracing without propagating trace context across agent boundaries, producing disconnected trace fragments that can't be correlated into end-to-end workflows.
- Capturing telemetry without standardized schemas, making it impossible to query consistently across agents or compare behavior across versions.
- Retaining traces forever because no one defined a policy, or retaining them too briefly to support quarterly trend analysis.

## Benefits of establishing this best practice

- Distributed tracing makes agent operations like decisions and actions queryable.
- Detailed telemetry provides the empirical foundation for optimization, identifying bottlenecks and validating improvements with data.
- Trace context propagation across agent boundaries makes multi-agent workflow debugging tractable.
- Standardized schemas enable cross-agent comparison and version-over-version regression analysis.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

[Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) is the default telemetry service for agents on AgentCore Runtime. Its OpenTelemetry-compatible instrumentation automatically captures LLM inference calls, tool invocations, and memory operations without requiring each agent to add its own spans. For agents built on Strands Agents or custom frameworks, the agent loop itself needs instrumentation. OpenTelemetry spans wrapping each operation phase make the trace complete.

Trace context propagation separates useful traces from fragmented ones. W3C Trace Context propagation across all agent boundaries maintains continuity in distributed workflows, so a request that passes through five agents produces one trace with five spans, not five disconnected traces. Without propagation, multi-agent debugging becomes manual correlation by timestamp, which scales poorly and produces incorrect answers when concurrent requests overlap.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp01.html#implementation-guidance)

### Implementation steps

1. **Instrument agents with OpenTelemetry spans:** Deploy on [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) or add manual instrumentation covering all operation phases (reasoning, tool calls, memory operations).
2. **Propagate W3C Trace Context across agent boundaries:** Carry trace context forward on every agent-to-agent, agent-to-tool, and agent-to-service call.
3. **Define standardized telemetry schemas:** Specify fields for each span type, and log in structured JSON for efficient [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html) Logs queries.
4. **Build end-to-end dashboards:** Visualize agent performance with drill-down to individual trace components.
5. **Set retention policies:** Balance visibility with storage cost, with different tiers for operational, compliance, and debug telemetry.

## Resources

**Related best practices:**

- [AGENTOPS05-BP02 Monitor agent behavior patterns and detect anomalies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp02.html)
- [AGENTOPS05-BP03 Implement structured logging and comprehensive audit trails](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp03.html)
- [AGENTOPS04-BP03 Develop fallback behavior and error handling for tool invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops04-bp03.html)
- [AGENTPERF01-BP02 Implement comprehensive performance telemetry](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp02.html)
- [AGENTREL07-BP03 Implement distributed tracing to track system dependencies and facilitate recovery](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS X-Ray](https://aws.amazon.com/xray/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
