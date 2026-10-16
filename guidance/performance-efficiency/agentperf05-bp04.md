# AGENTPERF05-BP04 Implement efficient agent delegation and handoff patterns

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF05 — Workflow orchestration and multi-agent collaboration · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF05-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Smooth agent-to-agent transitions make multi-agent workflows feel like a single cohesive experience, where the receiving agent picks up exactly where the delegating agent left off. Delegation and handoff both require efficient context transfer. The receiving agent needs enough context to act, but transferring too much wastes time and tokens.

## Desired outcome

- You have agent delegation and handoff operations that complete with minimal latency, transferring precisely the context needed by the receiving agent.
- You have receiving agents that begin productive processing immediately without re-deriving context the delegating agent already possessed.
- You have standardized context transfer mechanisms that let any agent delegate to or receive handoffs from any other agent.
- You have handoff latency measured and optimized as part of the overall workflow performance budget.

## Common anti-patterns

- Transferring the entire conversation history and all accumulated context during every delegation, regardless of what the receiving agent actually needs, wasting serialization time and context window capacity.
- Requiring receiving agents to re-derive context (re-query databases, re-retrieve documents) that the delegating agent already had, duplicating work and adding latency.
- Implementing delegation as synchronous blocking calls where the parent agent waits idle for the child agent to complete, wasting the parent's compute resources.

## Benefits of establishing this best practice

- Selective context transfer and shared context stores reduce delegation latency.
- Receiving agents reuse context already gathered by delegating agents instead of repeating the work.
- Asynchronous delegation patterns improve parent agent throughput.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Implement a shared context store using [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) or [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) where delegating agents write context and receiving agents read it, avoiding the need to serialize and transfer large context payloads through the orchestration layer. Context transfer schemas define the minimum context required for each delegation type, a data validation agent needs the data and validation rules, not the full conversation history. For agents built with Strands Agents, the built-in agent-as-tool pattern automatically inherits relevant context from the parent agent's session.

For handoff patterns in conversational agents, context summarization compresses the conversation into a concise handoff summary tailored to the receiving agent's role, rather than transferring raw conversation history. For predictable delegation patterns, for example, a triage agent that consistently delegates to one of several specialist agents, pre-warming through [AWS Lambda](https://aws.amazon.com/lambda/) provisioned concurrency or warm session pools on AgentCore Runtime removes cold-start latency from the receiving side. Asynchronous delegation lets the parent agent continue processing other tasks while the child agent works, using callbacks or [Amazon EventBridge](https://aws.amazon.com/eventbridge/) notifications to receive results.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp04.html#implementation-guidance)

### Implementation steps

1. **Identify delegation and handoff patterns in existing multi-agent workflows and measure current transition latency:** Map delegation and handoff points and measure the current transition latency so optimization targets are grounded in data.
2. **Implement shared context stores using AgentCore Memory or DynamoDB for context transfer between agents:** Use [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) or [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) so delegating agents write context once and receiving agents read it without serializing large payloads.
3. **Define minimum context schemas for each delegation type, specifying exactly what the receiving agent needs:** Keep the delegation payload small and purpose-specific so receivers only get the context required for their role.
4. **Implement context summarization for conversational handoffs that compresses history into role-appropriate summaries:** Summarize raw conversation history into a handoff summary tailored to the receiving agent's role rather than forwarding the full transcript.
5. **Configure pre-warming for predictable delegation patterns using provisioned concurrency or warm session pools:** For recurring delegation targets, use [AWS Lambda](https://aws.amazon.com/lambda/) provisioned concurrency or warm session pools on AgentCore Runtime to remove cold-start latency.
6. **Convert synchronous delegations to asynchronous patterns with callback-based result delivery:** Let the parent agent continue other work while the child agent runs, receiving results through callbacks or EventBridge notifications.

## Resources

**Related best practices:**

- [AGENTPERF05-BP01 Design efficient workflow orchestration patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp01.html)
- [AGENTPERF05-BP02 Implement optimized multi-agent collaboration models](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp02.html)
- [AGENTPERF04-BP01 Optimize asynchronous message handling patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
