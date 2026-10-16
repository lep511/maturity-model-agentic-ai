# AGENTPERF03-BP01 Implement tiered memory management systems

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF03 — Memory, context, and RAG optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF03-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents that carry context across turns and sessions deliver more personalized and accurate responses, but only when memory retrieval doesn't become the latency bottleneck on every reasoning iteration. A tiered memory architecture separates fast, transient session state from durable cross-session knowledge so each tier's storage technology, access pattern, and lifecycle can be optimized independently rather than forced through a single store.

## Desired outcome

- You have agent memory separated into a short-term tier for in-session context and a long-term tier for cross-session knowledge, each backed by storage matched to its access pattern.
- You have automated lifecycle policies that extract durable insights from short-term memory into long-term strategies (semantic, episodic, summary, and user preference) and evict stale short-term state without manual intervention.
- You have per-tier retrieval latency tracked as a first-class KPI, with budgets that keep memory access from dominating the reasoning loop.
- You have long-term memory scoped and namespaced per user, session, or tenant so retrievals return only the records relevant to the current actor.

## Common anti-patterns

- Storing all agent memory in a single database regardless of access pattern, forcing sub-second session reads and large-scale semantic searches through the same storage layer.
- Persisting every turn of short-term memory indefinitely without extraction into long-term strategies or eviction, allowing session stores to grow without bounds and retrieval latency to degrade over time.
- Treating long-term memory as a single bag of records rather than differentiating between semantic facts, episodic events, conversation summaries, and user preferences, which forces every query to search all record types.
- Scoping long-term memory globally rather than per user, session, or tenant, so retrievals return cross-actor records that inflate context and leak information.
- Building custom tiered memory infrastructure from scratch instead of evaluating managed services that provide session stores, extraction strategies, and vector retrieval as primitives.

## Benefits of establishing this best practice

- Fast in-memory stores serve session reads in single-digit milliseconds while vector stores handle long-term semantic queries without coupling the two.
- Automated extraction and eviction policies keep each tier's footprint and retrieval latency stable as usage scales.
- Separating long-term memory into distinct strategies, semantic, episodic, summary, preference, lets the agent query only the record type relevant to its current reasoning step.
- Namespacing long-term memory by user, session, or tenant helps prevent cross-actor retrievals and keeps context relevant.
- Managed memory primitives remove the need to operate session stores, extraction pipelines, and vector indexes as bespoke infrastructure.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Memory access sits on the hot path of every reasoning iteration. An agent that reads session context and retrieves relevant long-term knowledge at every step pays that retrieval latency multiplied by the iteration count, which makes memory one of the largest use points in the reasoning loop.

The root cause of poor memory performance is typically an access-pattern mismatch. Using a single storage layer for both sub-millisecond session reads and large-scale semantic searches forces one pattern to carry cost and latency characteristics suited to the other. Tiering resolves the mismatch by splitting memory into a short-term tier for in-session context and a long-term tier for cross-session knowledge, then matching each tier to storage with the right latency, durability, and query model.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp01.html#implementation-guidance)

### Implementation steps

1. **Inventory the memory the agent reads and writes:** List the distinct pieces of state the agent maintains, last-N-turn context, intermediate reasoning, tool outputs, user preferences, past-interaction summaries, domain facts, and for each note the access pattern (read per iteration, read per session, read per task class), retention requirement (session-scoped or durable), and query shape (key lookup or semantic search). This inventory is the input to tier selection, as without it, tier boundaries are drawn by guess and either fragment naturally grouped data or collapse patterns that should be separated. Record the inventory alongside the workload's performance budgets so tiering decisions can be audited and revisited.
2. **Assign each inventoried item to a short-term or long-term tier:** Place session-scoped, high-frequency, latency-critical items in the short-term tier and durable, cross-session items queried semantically in the long-term tier. Avoid intermediate "working memory" tiers unless a concrete access pattern justifies one, most "working memory" is either active short-term state or a long-term record that has not been extracted. Document the tier boundary so every new memory item has a clear home.
3. **Choose storage for each tier based on the tier's access pattern:** For the short-term tier, select [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) if you also want managed long-term extraction, or [Amazon ElastiCache (Valkey)](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/agentic-memory-why-elasticache.html) if you prefer to own the extraction pipeline. For the long-term tier, use AgentCore Memory's built-in strategies or [Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/application-agentic-memory.html) for dense and hybrid retrieval. Resist using one storage layer for both tiers. It is the single most common cause of memory-bound latency regressions.
4. **Configure long-term memory with strategies that match what the agent retrieves:** Enable the subset of [AgentCore's built-in long-term strategies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/long-term-configuring-built-in-strategies.html), semantic, episodic, summary, and user preference, that correspond to the retrieval patterns in the inventory. Each strategy extracts a different shape of record from short-term events and indexes it separately, so the agent can query only the store relevant to its current step. In self-managed stacks, create equivalent per-strategy indexes rather than a single general-purpose corpus.
5. **Namespace every memory record to its actor (user, session, or tenant):** Attach an actor identifier to every short-term and long-term record and filter every retrieval by that identifier using AgentCore Memory's [actor and session scoping](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-organization.html) or an equivalent filter in self-managed stacks. Scoping reduces the search space (lower retrieval latency) and helps prevent cross-actor context leakage (correctness and isolation). Align the actor key with the authentication identity used by the agent so scoping can't be bypassed by a missing filter in application code.
6. **Automate extraction from short-term to long-term and eviction of stale short-term state:** Configure the managed extraction pipeline, AgentCore Memory's asynchronous strategy extraction, or build an equivalent job in self-managed stacks that reads session events, derives long-term records per enabled strategy, and writes them to the long-term index. Apply TTLs or sliding-window eviction to short-term state so session stores don't grow without bounds. Both movements must run without manual intervention. If either requires human action, memory growth and extraction lag will exceed design targets.
7. **Emit per-tier retrieval latency as a first-class performance metric and set budgets:** Publish short-term read latency and long-term query latency as distinct time-series through [Amazon CloudWatch generative AI observability](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/GenAI-observability.html) or an equivalent pipeline, alongside tier size, hit rate, and extraction lag. Allocate each tier an explicit portion of the per-iteration latency budget so memory can't silently consume time reserved for inference or tool calls. Treat per-tier latency as an early indicator: sustained growth in long-term query latency usually signals index size or scope drift before it registers on end-to-end metrics.
8. **Review tier sizing, strategies, and budgets against production telemetry on a defined cadence:** Schedule reviews of short-term tier size distributions, long-term strategy growth rates, extraction lag, and per-tier latency against budget. Tighten TTLs on short-term stores that are consistently oversized, disable long-term strategies that are never queried, and re-scope memory if retrievals are returning more cross-actor records than the scope intended. Tiering parameters set at launch rarely match production traffic unless they are reviewed on an ongoing basis.

## Resources

**Related best practices:**

- [AGENTPERF03-BP02 Optimize context window utilization and prompt management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp02.html)
- [AGENTPERF03-BP03 Optimize RAG retrieval pipelines for latency and precision](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp03.html)
- [AGENTPERF03-BP04 Establish efficient agent caching and data access patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp04.html)
- [AGENTPERF03-BP05 Implement agentic retrieval patterns for dynamic, agent-driven knowledge access](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp05.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon ElastiCache](https://aws.amazon.com/elasticache/)
- [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service/)
- [Amazon Neptune Analytics](https://docs.aws.amazon.com/neptune-analytics/latest/userguide/what-is-neptune-analytics.html)
