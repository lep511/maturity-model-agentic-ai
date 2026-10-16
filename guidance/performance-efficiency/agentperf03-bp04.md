# AGENTPERF03-BP04 Establish efficient agent caching and data access patterns

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF03 — Memory, context, and RAG optimization · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF03-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents that repeatedly fetch the same data benefit from caching, breaking the cycle of redundant retrievals speeds up every reasoning iteration. Agentic workloads often access the same tool outputs, retrieved documents, computed embeddings, and configuration data across multiple reasoning iterations, sessions, or agents in a multi-agent workflow. Without caching, each access pays the full latency and cost of the original operation.

## Desired outcome

- You have multi-layer caching that removes redundant computations and data fetches across reasoning iterations, sessions, and agents.
- You have cache hit rates monitored and optimized.
- You have cache invalidation policies tuned to balance freshness requirements with performance benefits.

## Common anti-patterns

- Implementing no caching at all, forcing agents to re-fetch the same documents, re-compute the same embeddings, and re-invoke the same tools on every reasoning iteration.
- Using a single cache TTL for all data types without considering freshness requirements, producing either stale data (TTL too long) or poor hit rates (TTL too short).
- Designing cache keys based only on exact string matching, missing cache hits for semantically equivalent queries that use different phrasing.

## Benefits of establishing this best practice

- Cache hits substantially reduce latency for repeated data access.
- Removing redundant LLM inference calls and external API invocations lowers cost.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Caching is applied at multiple layers of the agent stack, and each layer has its own invalidation discipline.

At the LLM inference layer, [Amazon Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) caches and reuses common prompt prefixes (like system instructions and tool definitions) across invocations, reducing both latency and cost for repeated portions of prompts, prompt caching savings compound further when combined with Amazon Bedrock's Flex pricing tier for development and testing workloads.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp04.html#implementation-guidance)

### Implementation steps

1. **Identify cacheable data across the agent stack:** Enumerate LLM prompt prefixes, RAG results, tool outputs, session state, and configuration data, each has its own access pattern, freshness requirement, and cache layer.
2. **Enable Amazon Bedrock prompt caching for common prompt prefixes shared across invocations:** Turn on [Amazon Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) and structure prompts so system instructions and tool definitions appear before variable content, letting the cached prefix be reused across requests.
3. **Implement retrieval result caching with semantic cache keys and data-type-specific TTLs:** Cache RAG results under embedding-based similarity keys so semantically equivalent queries share results, and tune TTLs to the freshness needs of each data type rather than applying a single global TTL.
4. **Implement tool output caching with TTLs calibrated to data freshness requirements:** Cache tool outputs under input-parameter keys with TTLs that match how fast each tool's data changes, short TTLs for real-time data, long TTLs for static reference data.
5. **Monitor cache hit rates and latency savings per cache layer using CloudWatch:** Publish hit rate, miss rate, and latency savings per cache layer as CloudWatch metrics so TTLs and warming strategies can be tuned from data rather than assumption.

## Resources

**Related best practices:**

- [AGENTPERF03-BP01 Implement tiered memory management systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp01.html)
- [AGENTPERF03-BP03 Optimize RAG retrieval pipelines for latency and precision](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp03.html)
- [AGENTPERF02-BP03 Optimize agent execution paths for reduced latency](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp03.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon ElastiCache](https://aws.amazon.com/elasticache/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
