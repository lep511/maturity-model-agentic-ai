# AGENTREL03-BP01 Design an information classification model to identify short-term and long-term memories

**Pillar:** Reliability · **Focus area:** AGENTREL03 — Agent memory and state management · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL03-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

A single undifferentiated memory store blurs conversation context with durable knowledge and pulls stale or irrelevant data into active tasks. Classifying memory at ingestion time and routing each item to the right tier keeps retrieval predictable and storage costs aligned with how long each type actually needs to live.

## Desired outcome

- You have an explicit memory taxonomy distinguishing short-term session context from long-term persistent knowledge.
- Your agents classify information at ingestion time and route it to the appropriate tier with metadata tags.
- You retain each memory type according to a policy matched to its persistence requirement.

## Common anti-patterns

- Storing all memory in a single undifferentiated store, so agents retrieve stale or irrelevant items during active tasks.
- Running without retention or eviction policies for short-term memory, letting session context accumulate indefinitely.
- Skipping classification at ingestion, making targeted retrieval and appropriate retention impossible.

## Benefits of establishing this best practice

- Predictable retrieval through explicit classification that routes information to the correct store.
- Storage costs aligned with persistence requirements instead of a one-size-fits-all retention window.
- Reduced context pollution because transient session data can't contaminate long-term knowledge.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

A memory taxonomy is the foundation. At minimum, distinguish short-term (scoped to a single conversation) from long-term (durable across sessions). For complex agents, extend the taxonomy to include episodic memory (records of specific past interactions) and semantic memory (general domain knowledge). The taxonomy should be documented in accessible reference materials in addition to code, because classification decisions happen at ingestion and must be consistent across agents that write to shared memory.

[Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) provides session-scoped and persistent memory namespaces, handling the underlying infrastructure. Use session memory for short-term context scoped to a single conversation, persistent memory for cross-session knowledge, and shared memory for facts multiple agents consume. [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) handles RAG over external document corpora, policy documents, product catalogs, and domain reference material that supplement agent memory with organizational knowledge.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp01.html#implementation-guidance)

### Implementation steps

1. **Define a memory taxonomy:** Document classification criteria for each memory type (session context, persistent knowledge, episodic records) and the retention policy that fits each.
2. **Configure AgentCore Memory namespaces:** Provision [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) with session-scoped and persistent namespaces that map to the taxonomy.
3. **Implement classification logic at ingestion:** Evaluate each item against the taxonomy criteria and route to the appropriate tier with metadata tags.
4. **Use Amazon Bedrock Knowledge Bases for external corpora:** Supplement agent memory with [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) for RAG over organizational knowledge.
5. **Monitor access patterns to detect classification errors:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to spot unexpectedly high retrieval rates from wrong tiers.

## Resources

**Related best practices:**

- [AGENTREL03-BP02 Architect fault-tolerant memory stores with redundancy and failover](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp02.html)
- [AGENTREL03-BP03 Implement comprehensive state management and checkpoint-based recovery](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp03.html)
- [AGENTREL03-BP04 Implement graceful degradation for memory and state operations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp04.html)
- [AGENTSUS02-BP01 Optimize context management and memory utilization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
