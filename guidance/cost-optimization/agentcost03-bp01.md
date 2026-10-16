# AGENTCOST03-BP01 Design cost-effective retrieval systems with tiered memory

**Pillar:** Cost optimization · **Focus area:** AGENTCOST03 — Agent memory and state cost management · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST03-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost03-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agent memory has to serve two opposing needs at once: fast access for active context, and cheap storage for history that is rarely touched. Tiered memory matches each class of data to infrastructure priced for its actual access pattern, and selective retrieval keeps token costs proportional to what the current task needs.

## Desired outcome

- You have short-term working memory on high-performance storage and long-term memory on cost-effective tiers, with automatic lifecycle transitions between them.
- You retrieve only top-K relevant items per reasoning step rather than loading full memory stores into context.
- You track retrieval operations per session and use the data to tune tier assignments and access patterns.

## Common anti-patterns

- Storing all agent memory in expensive high-performance storage regardless of access frequency, incurring unnecessary costs for rarely accessed historical interactions.
- Retrieving entire memory stores for each reasoning step, consuming excessive input tokens when targeted top-K retrieval would suffice.
- Using single-tier storage for all memory regardless of access pattern, wasting resources on uniform infrastructure for data with distinct access profiles.
- Deploying memory systems without retrieval cost monitoring, hiding inefficient access patterns inside aggregate session cost.

## Benefits of establishing this best practice

- Tiered storage matches each memory category to its access pattern, reducing costs for historical data without sacrificing active session performance.
- Selective top-K retrieval limits context to the most pertinent items, avoiding token charges for irrelevant historical data.
- Automated tier lifecycle management scales across thousands of sessions without manual intervention or over-provisioning.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The cost of agent memory comes from two decisions: where data lives and how much of it you pull into the model's context window. [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) handles the first decision as a managed service. Short-term memory stores turn-by-turn session context on fast storage, while long-term memory extracts and consolidates key insights across sessions into cheaper tiers.

For agents on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html), this removes the need to build storage tiers and promotion policies by hand. When a custom implementation is required, define explicit promotion and demotion policies based on access frequency so frequently accessed items stay on low-latency storage and rarely accessed items migrate to lower-cost tiers automatically.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost03-bp01.html#implementation-guidance)

### Implementation steps

1. **Adopt managed tiered memory:** Integrate [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) for short-term and long-term memory with automatic lifecycle management, and document which namespaces each agent writes to and reads from.
2. **Configure selective retrieval:** Use [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) with top-K semantic search, starting at K=5 and tuning based on observed reasoning quality and token cost.
3. **Tune vector index parameters:** Adjust HNSW ef\_construction and m on the [Amazon OpenSearch Service Serverless](https://aws.amazon.com/opensearch-service/features/serverless/) backing store to balance index build cost, query latency, and recall accuracy for your workload.
4. **Pre-fetch context at task initiation:** Replace per-step retrievals with a single batch pre-fetch at task start, cached in working context so the model doesn't pay retrieval overhead on every reasoning step.
5. **Instrument retrieval operations:** Enable [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) and set Amazon CloudWatch alarms when retrieval frequency exceeds expected bounds per session.
6. **Review access patterns weekly:** Run CloudWatch Logs Insights queries to reveal expensive retrieval patterns and never-accessed items, and use the results to reassign tiers and retire dead entries.

## Resources

**Related best practices:**

- [AGENTCOST01-BP02 Optimize multi-agent collaboration cost through efficient handoff patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp02.html)
- [AGENTCOST02-BP03 Use intelligent caching to reduce redundant model invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html)
- [AGENTCOST03-BP02 Cost optimize through intelligent compression and pruning of context windows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost03-bp02.html)
- [AGENTCOST03-BP03 Implement cost-optimized state persistence and lifecycle management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost03-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
