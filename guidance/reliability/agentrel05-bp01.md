# AGENTREL05-BP01 Design modular, fault-tolerant agentic reasoning components

**Pillar:** Reliability · **Focus area:** AGENTREL05 — Agent cognition · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL05-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

A monolithic reasoning pipeline fails completely whenever any stage fails. Splitting cognition into modular stages with clear interfaces and stage-specific fallbacks lets an agent keep reasoning, with reduced quality, even when one stage is degraded.

## Desired outcome

- You have the reasoning pipeline decomposed into modular stages with explicit input/output schemas.
- You have stage-specific fallbacks that activate automatically when error rates climb.
- You log the retrieval tier and model tier used in each invocation so quality analysis is possible after the fact.

## Common anti-patterns

- Running agent cognition as a monolithic pipeline where any component failure causes complete cognition failure.
- Skipping interfaces between reasoning components, reducing the ability for independent testing and replacement.
- Treating all reasoning components as equally critical without distinguishing essential from quality-enhancing components.

## Benefits of establishing this best practice

- Partial cognition survives individual component failures through modular fault isolation.
- Reasoning components can be optimized or replaced independently, without full pipeline rewrites.
- Clear component boundaries isolate the source of errors and speed up debugging.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The first architectural decision is where the stage boundaries go. Useful boundaries for most agents are context retrieval, prompt construction, model inference, output parsing, and action selection. Each stage has a narrow contract: inputs, outputs, and the error conditions it signals. Deploy each stage on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) with its own error handling and fallback behavior. Without this decomposition, all errors appear as generic reasoning failures, making debugging difficult. Clear stage boundaries enable precise error identification and faster resolution.

Tiering is where the stages earn their modularity. For context retrieval, primary tier uses [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) for semantic search, with fallback to simpler retrieval methods when the primary is unavailable. For model inference, implement model tier fallback using [Bedrock cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) for availability, substituting alternative models when the primary is degraded. For multimodal agents, [Amazon Bedrock Data Automation](https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html) preprocesses documents, images, audio, and video as a distinct reasoning stage before text-based reasoning, with independent fallbacks per modality.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp01.html#implementation-guidance)

### Implementation steps

1. **Decompose the reasoning pipeline into distinct stages:** Define explicit input/output schemas and deploy each stage on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html).
2. **Implement automatic cutoffs between stages:** Activate stage-specific fallbacks when error rates exceed thresholds.
3. **Build tiered context retrieval:** Use [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) as primary with progressively simpler fallbacks.
4. **Implement model tier fallback:** Use [Bedrock cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) for availability during primary model degradation.
5. **Monitor per-stage health:** Track error rates, latency, and fallback activation through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) with alarms that trigger automatic cutoffs.

## Resources

**Related best practices:**

- [AGENTREL01-BP02 Establish modular, fault-isolated layers](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp02.html)
- [AGENTREL05-BP02 Facilitate reliable adaptation through evaluation-driven improvement cycles](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp02.html)
- [AGENTREL05-BP03 Ground agent cognition in real information](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
