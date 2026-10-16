# AGENTPERF03-BP05 Implement agentic retrieval patterns for dynamic, agent-driven knowledge access

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF03 — Memory, context, and RAG optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF03-BP05](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp05.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Complex questions often require information from multiple sources, iterative refinement, or real-time data that a single retrieval pass can't provide. In agentic retrieval the agent actively controls the retrieval process as part of its reasoning loop, deciding when to retrieve, what to retrieve, which retrieval tool to use, and whether the retrieved context is sufficient before proceeding. Each iteration adds embedding generation, vector search, re-ranking, and context injection overhead, so the retrieval loop needs explicit termination conditions.

## Desired outcome

- You have agents retrieving the right information in the minimum number of iterations required.
- You have simple questions answered with a single retrieval and complex questions handled through structured multi-hop retrieval with explicit termination conditions.
- You have the agent selecting the most appropriate retrieval tool for each query type.
- You have retrieval iteration counts, per-iteration latency, and sufficiency rates tracked and optimized.

## Common anti-patterns

- Treating all retrieval as a single-shot preprocessing step, forcing the agent to work with whatever context was retrieved on the first attempt regardless of sufficiency.
- Allowing agents to retrieve iteratively without retrieval budgets or termination conditions, producing unbounded retrieval loops that consume tokens and latency without converging.
- Routing all retrieval through a single pipeline regardless of query type, missing opportunities to use faster or more appropriate retrieval tools for different information needs.

## Benefits of establishing this best practice

- Parallel sub-query execution and retrieval-tool routing reduce end-to-end latency by selecting the fastest appropriate source.
- Explicit budgets that cap iterations and total tokens keep retrieval costs under control.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Design retrieval as a set of agent tools rather than a monolithic pipeline. Distinct retrieval tools for different knowledge access patterns let the agent route to the right source:

[Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) exposes retrieval tools as MCP-compatible endpoints, and registering each tool with clear descriptions, what question types it handles, what data sources it accesses, and its expected latency guides the agent's tool selection.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp05.html#implementation-guidance)

### Implementation steps

1. **Implement distinct retrieval tools for different knowledge access patterns:** Register a semantic search tool, a structured-query tool, a real-time data tool, a web search tool, and a document processing tool through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) with clear descriptions that guide the agent's tool selection.
2. **Implement retrieval sufficiency evaluation as a lightweight post-retrieval assessment:** Use a small, fast model to judge whether retrieved context is sufficient, identify gaps, and formulate refined queries for the next iteration.
3. **Configure maximum retrieval iteration limits with graceful fallback to best-available context:** Cap iterations at 2-3 for most tasks, and when the budget is exhausted proceed with the best context obtained and communicate uncertainty rather than looping without bounds.
4. **Implement query decomposition for complex questions, running independent sub-queries concurrently:** Break multi-source questions into focused sub-queries and fan them out in parallel so sub-query latency doesn't accumulate serially.
5. **Define per-task retrieval performance budgets based on the overall latency SLO:** Allocate an explicit portion of the task's latency SLO to retrieval so the iterative pattern can't silently consume the budget reserved for inference or downstream tool calls.

## Resources

**Related best practices:**

- [AGENTPERF03-BP03 Optimize RAG retrieval pipelines for latency and precision](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp03.html)
- [AGENTPERF03-BP02 Optimize context window utilization and prompt management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp02.html)
- [AGENTPERF02-BP01 Design efficient reasoning pipelines](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp01.html)
- [AGENTREL05-BP03 Ground agent cognition in real information](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp03.html)
- [AGENTCOST03-BP02 Cost optimize through intelligent compression and pruning of context windows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost03-bp02.html)

**Related services:**

- [Amazon Bedrock Knowledge Bases](https://aws.amazon.com/bedrock/knowledge-bases/)
- [Amazon Bedrock AgentCore Gateway](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
