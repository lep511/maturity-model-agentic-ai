# AGENTPERF05-BP03 Optimize multi-stage AI pipeline execution

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF05 — Workflow orchestration and multi-agent collaboration · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF05-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Real-world agent tasks rarely complete in a single step. Document processing, data analysis, and customer service workflows all involve multiple sequential stages where each stage's throughput is limited by the slowest process or mechanism. Each stage transition introduces overhead (like serialization, network transfer, or cold starts), and streaming or micro-batching allows downstream stages to begin processing before upstream stages complete, overlapping execution to cut total latency.

## Desired outcome

- You have multi-stage AI pipelines that execute with minimal inter-stage overhead, with data flowing efficiently between stages.
- You have pipeline throughput balanced across stages with no single stage creating a persistent bottleneck.
- You have streaming implemented where possible to overlap processing.
- You have each stage's compute resources right-sized for its specific requirements.

## Common anti-patterns

- Waiting for an entire batch to complete one stage before starting the next, when streaming or micro-batching would let downstream stages begin processing as upstream results become available.
- Using the same compute configuration for all pipeline stages regardless of their processing requirements, over-provisioning lightweight stages and under-provisioning compute-intensive stages.
- Serializing large intermediate results to persistent storage between every stage when in-memory passing or streaming would be more efficient for stages that execute in close succession.

## Benefits of establishing this best practice

- Streaming and micro-batching overlap stage processing, reducing end-to-end latency.
- Balanced stage capacity and buffered inter-stage communication improve throughput.
- Right-sized compute per stage optimizes cost.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Implement multi-stage pipelines using [AWS Step Functions](https://aws.amazon.com/step-functions/) with stage-specific [AWS Lambda](https://aws.amazon.com/lambda/) functions, [Amazon ECS](https://aws.amazon.com/ecs/) tasks, or agents hosted on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html), where each stage's compute configuration is independently tuned. For pipelines with high throughput requirements, Step Functions Distributed Map processes items in parallel across stages. Right-size compute for each stage, using Lambda for lightweight processing, ECS for compute-intensive stages, and AgentCore Runtime for stages that require LLM-based reasoning.

Streaming between stages is the single largest latency win when it applies. Use Amazon Bedrock's streaming inference API to begin post-processing output tokens as they are generated rather than waiting for the complete response. For data-intensive pipelines, [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/) acts as an inter-stage buffer that supports streaming data flow, so downstream stages begin processing as soon as upstream results are available. For batch pipelines, micro-batching sends small groups of items to downstream stages as they complete rather than waiting for the entire batch.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp03.html#implementation-guidance)

### Implementation steps

1. **Map the multi-stage pipeline and identify dependencies between stages:** Document stage dependencies, opportunities for streaming, and the critical path so optimization effort lands on the stages that drive end-to-end latency.
2. **Implement each stage as an independent compute unit with stage-specific resource configurations:** Use [AWS Lambda](https://aws.amazon.com/lambda/) for lightweight processing, [Amazon ECS](https://aws.amazon.com/ecs/) for compute-intensive stages, and AgentCore Runtime for stages that require LLM reasoning, and tune each stage's resources to its own profile.
3. **Enable streaming between stages using the Amazon Bedrock streaming API and Kinesis Data Streams where applicable:** Use the streaming inference API to post-process output tokens as they are generated, and [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/) as an inter-stage buffer so downstream stages begin processing as upstream results arrive.
4. **Implement micro-batching for batch pipelines to reduce end-to-end latency:** Send small groups of items to downstream stages as they complete rather than waiting for the full batch.
5. **Configure AgentCore Observability or X-Ray tracing across all pipeline stages for end-to-end latency visibility:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) or [AWS X-Ray](https://aws.amazon.com/xray/) to trace requests across every stage.
6. **Monitor per-stage latency, throughput, and resource utilization to identify and resolve bottlenecks:** Publish metrics for each stage so bottleneck stages are visible and can be split, parallelized, or resized.

## Resources

**Related best practices:**

- [AGENTPERF05-BP01 Design efficient workflow orchestration patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp01.html)
- [AGENTPERF02-BP04 Optimize streaming responses and time-to-first-token for agent interactions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp04.html)
- [AGENTPERF02-BP03 Optimize agent execution paths for reduced latency](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp03.html)

**Related services:**

- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon ECS](https://aws.amazon.com/ecs/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
