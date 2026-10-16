# AGENTREL01-BP03 Design specialized agents following actor model principles

**Pillar:** Reliability · **Focus area:** AGENTREL01 — Predictable agent behavior · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL01-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Multi-purpose agents concentrate risk. A single failure in one function affects every other function in the same process. Specialized agents that encapsulate one atomic capability, own their state, and communicate through messages keep the impact proportional to the scope of the failing component.

## Desired outcome

- You have each agent scoped to a single atomic function with explicit input and output schemas.
- Your agents maintain their own state and exchange information through explicit message passing, not shared memory.
- You can scale, replace, or upgrade any one agent without disturbing the others.

## Common anti-patterns

- Building multi-purpose agents that combine disparate functions in one component, reducing the ability for independent scaling and widening the failure impact.
- Coupling agents through shared in-memory state rather than explicit message passing, so a crash in one process corrupts another.
- Designing agents as general-purpose processors with overlapping capabilities, making issue reproduction and remediation harder than it needs to be.

## Benefits of establishing this best practice

- A failure stays contained to the agent that encountered it, preserving overall workflow integrity.
- Single-responsibility agents are simpler to test deterministically because the input-output contract is small.
- Each agent scales, deploys, and is replaced on its own schedule, which keeps the rest of the system stable during change.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The actor model is a discipline, not a runtime feature. A managed runtime can give you isolated execution. [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) runs each agent in its own microVM with dedicated tool permissions. But whether your agents actually follow actor principles depends on how you scope the system prompt, how narrowly you define the tool set, and whether inter-agent calls go through messages or shared state.

Give each agent a single, well-scoped system prompt that constrains it to one domain. Use Strands Agents or another agentic framework, but the test is framework-independent. Can you describe the agent's job in a single sentence without using "and"? If not, the agent carries more than one responsibility and should be split.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp03.html#implementation-guidance)

### Implementation steps

1. **Decompose the workflow into specialized agents:** Define each agent around a single atomic function with explicit input and output schemas.
2. **Deploy each agent on AgentCore Runtime with a dedicated IAM role:** Run each agent on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) with an execution role scoped to only the resources required for that agent's function.
3. **Choose the inter-agent communication pattern:** Use [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) for loosely coupled tool-style invocation, or the [A2A protocol](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a.html) for peer-to-peer collaboration with richer interaction patterns.
4. **Monitor each agent independently:** Configure [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) with per-agent metrics and alarms so one agent's issues are not masked by fleet-level aggregates.

## Resources

**Related best practices:**

- [AGENTREL01-BP01 Implement a resilient messaging layer](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp01.html)
- [AGENTREL01-BP02 Establish modular, fault-isolated layers](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp02.html)
- [AGENTREL01-BP04 Standardize communication protocols](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp04.html)
- [AGENTSUS01-BP01 Design specialized agents with explicit resource boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
