# AGENTPERF01-BP02 Implement comprehensive performance telemetry

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF01 — Strategic performance planning and measurement · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF01-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

A single agent request fans out into chains of inference calls, parallel tool invocations, memory lookups, and inter-agent communications. Infrastructure-only monitoring can't determine by itself which of those contributes to a slow or expensive response. Agent-aware telemetry decomposes execution into observable, attributable operations so that performance decisions are grounded in measured behavior.

## Desired outcome

- You have a complete distributed trace for every agent execution that decomposes total latency into its constituent operations.
- You have real-time dashboards that provide visibility into agent performance trends, with the resulting metrics feeding the alerting layer.
- You have historical telemetry data that supports capacity planning, model selection decisions, and architecture optimization through data-driven analysis.

## Common anti-patterns

- Relying only on infrastructure-level metrics such as function duration or API gateway latency without instrumenting the agent's reasoning pipeline, making it impossible to distinguish between slow inference and slow tool calls.
- Treating telemetry as an afterthought, producing gaps in trace continuity across agent boundaries, tool invocations, and asynchronous operations.
- Collecting telemetry data without establishing baselines, thresholds, or alerts, creating a data lake of metrics that nobody monitors or acts upon.

## Benefits of establishing this best practice

- Fine-grained performance data directs engineering effort toward the operations that materially contribute to end-to-end latency, helping prevent wasted cycles on components with negligible impact on user experience.
- Span-level attribution reduces mean-time-to-resolution for production incidents by pinpointing whether slow responses originate in inference, tool calls, retrieval, or inter-agent coordination.
- Historical telemetry data supports informed model selection, routing, and capacity planning by comparing latency, token, and cost profiles across models and architectures.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Comprehensive agent telemetry means capturing metrics, traces, and logs, as well as structuring them so every step of the reasoning pipeline is individually attributable. If any step of the agent's multiple and unique operations is opaque, performance investigations become less data-based and therefore less useful.

[OpenTelemetry (OTel)](https://opentelemetry.io/) is the portable substrate for this instrumentation, and its [generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) define standard attributes for LLM operations, model, input and output tokens, request parameters, and finish reasons so that spans remain comparable across frameworks, models, and runtimes. Using these conventions rather than framework-specific schemas keeps telemetry portable when an agent moves between Amazon Bedrock AgentCore Runtime, AWS Lambda, Amazon ECS, Amazon EKS, or self-hosted infrastructure, and helps prevent a rewrite every time the deployment target changes.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp02.html#implementation-guidance)

### Implementation steps

1. **Define a standardized telemetry schema:** Document the span types the agent will emit (reasoning iteration, LLM inference, tool invocation, memory operation, retrieval, inter-agent handoff) and the required attributes for each, aligning LLM spans with the [OpenTelemetry generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) and agent spans with the [GenAI agent span conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/). Specify a consistent set of metric dimensions, agent ID, workflow, environment, task type, model ID, that every custom metric and span must carry so signals remain correlatable across the stack.
2. **Instrument the reasoning pipeline across every execution layer:** Wrap reasoning iterations, LLM inference, tool invocations, memory operations, retrieval queries, and inter-agent handoffs as OpenTelemetry spans. For agents on Amazon Bedrock AgentCore Runtime, the runtime auto-instruments agent code when [AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html) is enabled. For agents on other runtimes, use the [AWS Distro for OpenTelemetry (ADOT)](https://aws-otel.github.io/docs/introduction) together with a framework-specific instrumentation library (OpenInference, OpenLLMetry, OpenLit, or Traceloop) so reasoning-pipeline spans are captured rather than only request-level spans.
3. **Propagate trace and session context across every boundary:** Carry [W3C Trace Context](https://www.w3.org/TR/trace-context/) headers through every outbound call the agent makes, tool invocations, retrieval queries, inter-agent handoffs, asynchronous queue-backed work, so a single user request produces a single connected trace rather than disconnected fragments. Propagate the session identifier through OpenTelemetry baggage so every span in a conversation can be linked back to its session for conversation-level analysis.
4. **Enable CloudWatch ingestion for spans and Amazon Bedrock API attributes:** Complete the one-time setup for [CloudWatch Transaction Search](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Transaction-Search.html) so 100 percent of spans are ingested as structured logs and a configurable percentage are indexed as trace summaries. Enable [CloudWatch Application Signals with GenAI attribute support](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Services-example-scenario-GenerativeAI.html) to auto-populate OTel GenAI attributes on Amazon Bedrock API calls so token, model, and finish-reason data is captured without custom instrumentation.
5. **Emit custom metrics for signals not captured natively:** Publish task success and failure rate, cache hit rate, tool-selection accuracy, time-to-first-token, and cost per task as [CloudWatch custom metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html) from the agent runtime or the OTel collector, using the standard dimension set defined in step 1. Without these, observability tooling can display infrastructure and inference signals but can't answer product-level questions about agent quality or unit economics.
6. **Build the observability surface:** Use the [Amazon CloudWatch generative AI observability dashboard](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/GenAI-observability.html) to provide session, trace, and agent views for incident triage and trend analysis, and publish composed dashboards for per-workflow, per-model, and per-tenant slices using the standard dimension set.

## Resources

**Related best practices:**

- [AGENTPERF01-BP01 Define performance-aligned success criteria for agent workloads](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html)
- [AGENTPERF01-BP03 Profile end-to-end agent latency and identify optimization targets](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp03.html)
- [AGENTOPS05-BP01 Establish end-to-end tracing and telemetry for agent operations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp01.html)
- [AGENTOPS05-BP05 Create workflow-specific dashboards for operational health](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp05.html)
- [AGENTCOST05-BP02 Implement distributed cost tracing for multi-agent workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp02.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon CloudWatch Application Signals](https://aws.amazon.com/cloudwatch/features/application-monitoring/)
- [AWS Distro for OpenTelemetry (ADOT)](https://aws.amazon.com/otel/)
