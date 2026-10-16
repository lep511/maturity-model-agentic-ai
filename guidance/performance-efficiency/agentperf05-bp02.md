# AGENTPERF05-BP02 Implement optimized multi-agent collaboration models

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF05 — Workflow orchestration and multi-agent collaboration · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF05-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Multi-agent systems typically deliver the strongest results when each collaboration pattern is matched to the task it was designed for (for example, supervisor-worker for structured decomposition, swarm for creative exploration, and pipeline for sequential processing). Before picking any multi-agent pattern, decide whether a capability should be a sub-agent or a tool that a single agent invokes. A tool call completes in milliseconds, while a sub-agent delegation is a full LLM reasoning loop that costs time and tokens.

## Desired outcome

- You have multi-agent workflows that use collaboration models matched to their task characteristics.
- You have each capability implemented at the right abstraction level, tool for deterministic single-step operations, sub-agent for tasks that require independent reasoning.
- You have coordination overhead minimized through appropriate pattern selection and implementation.

## Common anti-patterns

- Delegating to a sub-agent for capabilities that are deterministic, stateless, and single-step, API calls, database lookups, or format conversions, paying the full cost of an LLM reasoning loop for work that a tool call would handle in milliseconds.
- Using a supervisor-worker model for all multi-agent workflows, creating a bottleneck at the supervisor that must process every intermediate result and make every delegation decision.
- Deploying swarm patterns without explicit convergence criteria or resource budgets, letting agents continue exploring indefinitely without converging on a shared outcome.

## Benefits of establishing this best practice

- Matching the collaboration model to task structure minimizes coordination overhead.
- Appropriate model selection for decomposable tasks maximizes parallelism.
- Timeouts and fallback mechanisms keep collaboration resilient when individual agents fail or slow down.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Use a sub-agent when the capability requires its own reasoning (LLM inference for ambiguous inputs or judgment calls), its own context or memory scope, multi-step tool orchestration where sequencing requires reasoning, a different model or prompt, or independent failure isolation.

Use a tool when the capability is deterministic, stateless, single-step, and fast (under 2-3 seconds).

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp02.html#implementation-guidance)

### Implementation steps

1. **Evaluate whether each capability should be a tool or a sub-agent:** Default to tools and promote to sub-agents only when re-invocation patterns indicate the need for independent reasoning.
2. **Classify multi-agent workflows by task characteristics:** Assess decomposability, dependency structure, latency requirements, and whether the task benefits from parallel exploration.
3. **Select the collaboration model:** Use supervisor-worker for clear decomposition, pipeline for sequential flow, peer-to-peer for shared problem spaces, and swarm for parallel exploration.
4. **Implement using your framework's native multi-agent patterns:** Use Strands agent-as-tool, Amazon Bedrock multi-agent collaboration, or an equivalent, and use [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) for shared context across agents.
5. **Implement timeout and fallback mechanisms for all collaboration models:** Set per-agent timeouts and define fallback behavior so one slow or failed agent can't block the full workflow.
6. **Monitor collaboration overhead metrics and optimize model selection over time:** Track coordination latency, redundant work rate, and throughput per model, and re-evaluate the collaboration choice as traffic shifts.

## Resources

**Related best practices:**

- [AGENTPERF05-BP01 Design efficient workflow orchestration patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp01.html)
- [AGENTPERF05-BP04 Implement efficient agent delegation and handoff patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp04.html)
- [AGENTPERF04-BP02 Implement efficient protocol-based agent communications](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp02.html)

**Related services:**

- [Amazon Bedrock Agents](https://aws.amazon.com/bedrock/agents/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
