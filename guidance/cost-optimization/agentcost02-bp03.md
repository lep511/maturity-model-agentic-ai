# AGENTCOST02-BP03 Use intelligent caching to reduce redundant model invocations

**Pillar:** Cost optimization · **Focus area:** AGENTCOST02 — Model invocation and token cost optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST02-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents repeat work constantly: identical prompts, semantically equivalent requests, the same planning steps across similar tasks. Caching at the prompt, semantic, and plan-template layers changes repetition from a recurring expense into a one-time cost paid on the first invocation.

## Desired outcome

- You have prompt caching enabled for stable system prompts so the cacheable prefix is reused across invocations at reduced rates.
- You have a semantic cache that serves responses for functionally equivalent requests above a configurable similarity threshold.
- You have plan templates cached and instantiated for recurring task patterns rather than regenerated each time.
- You track cache hit rates and cost savings per caching layer.

## Common anti-patterns

- Transmitting identical system prompts and tool descriptions on every invocation at full input token cost rather than cached prefix rates.
- Using exact-match lookups when functionally equivalent requests use different wording, causing cache misses on semantically identical tasks.
- Applying one cache TTL across all task types without distinguishing static reference data from time-sensitive information, returning stale responses that degrade quality.
- Deploying customized models without monitoring cache-assisted performance, missing opportunities to validate that expected cost reductions actually materialize.

## Benefits of establishing this best practice

- Prompt caching reduces input token costs by reusing cached system instructions across invocations at reduced rates.
- Semantic caching helps prevent redundant reasoning by serving cached responses for functionally equivalent tasks.
- Plan template reuse reduces model invocations for the planning phase of recurring task patterns.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Caching for agents works at three distinct layers, and each layer has a different failure mode.

[Amazon Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) is the highest-impact layer for agents with large stable system prompts. Amazon Bedrock stores the key-value state of the cached prefix and reuses it at reduced rates. Design so that the cacheable prefix (system prompt, tool descriptions) is stable across invocations, because any dynamic content mixed in invalidates the cache. Refactor to move user-specific or session-specific content out of the cacheable prefix.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html#implementation-guidance)

### Implementation steps

1. **Enable prompt caching for stable prefixes:** Turn on [Amazon Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) for agents with system prompts larger than 1,000 tokens, and refactor the prompt to move dynamic content out of the cacheable prefix.
2. **Deploy a semantic cache layer:** Stand up an OpenSearch Serverless index with embedding-based similarity, configure similarity thresholds per task type, and set per-task TTLs. Accept quantization only when accuracy loss remains below two percent on task success rate.
3. **Cache plan templates:** Key plan templates by task type and input parameter signature, and perform a pre-invocation lookup before generating a new plan.
4. **Use managed memory for session state:** Configure [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) session identifiers so multi-turn conversation state is maintained without manual history concatenation.
5. **Design event-driven invalidation and monitor hit rates:** Wire event-driven cache invalidation to source data changes, and create CloudWatch dashboards that display hit rates across prompt, semantic, and plan-template caches with alarms when hit rates fall below target.

## Resources

**Related best practices:**

- [AGENTCOST02-BP01 Architect tiered model selection for cost-performance optimization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html)
- [AGENTCOST02-BP02 Cost optimize token consumption through efficient prompt engineering](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp02.html)
- [AGENTCOST03-BP01 Design cost-effective retrieval systems with tiered memory](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost03-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
