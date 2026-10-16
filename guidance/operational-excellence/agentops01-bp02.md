# AGENTOPS01-BP02 Design multi-agent handoff procedures with human-in-the-loop escalation

**Pillar:** Operational excellence · **Focus area:** AGENTOPS01 — Operational practices for agentic AI systems · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS01-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Without a structured context package, the receiving agent re-derives work the previous agent already finished. Lacking a defined escalation path means that high-stakes or low-confidence decisions can slip past human review.

## Desired outcome

- You have documented handoff protocols that transfer tasks between agents with full context and clear accountability.
- You have escalation paths that route requests to the right agent or human reviewer when an agent reaches its capability limits.
- You detect deadlocks and timeouts automatically and resolve them through documented recovery procedures.
- You monitor handoff latency, context transfer completeness, and collaboration success rates as first-class operational metrics.

## Common anti-patterns

- Implementing agent-to-agent handoffs without structured context packages, forcing the receiving agent to re-derive context and repeat work the delegating agent already completed.
- Relying solely on agent-to-agent escalation without defining agent-to-human triggers, leaving high-stakes or low-confidence decisions without human oversight.
- Deploying multi-agent workflows without deadlock detection or timeout handling, allowing circular dependencies between agents to stall the workflow indefinitely.
- Treating handoff failures as rare events, so no one tracks success rates or context-transfer completeness until a customer incident forces the investigation.

## Benefits of establishing this best practice

- Documented handoff runbooks and escalation procedures create repeatable collaboration patterns that reduce operational complexity.
- Tasks requiring human judgment reliably reach human reviewers without creating bottlenecks in routine agent-to-agent work.
- Context-rich handoffs help prevent duplicate reasoning, cutting both latency and token cost in multi-agent workflows.
- Deadlock detection and timeout handling keep transient coordination failures from becoming workflow-level outages.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

A handoff is a data contract before it is a workflow step. The sending agent must know what to include in the payload, while the receiving agent must know what to expect. When that contract is missing, each handoff becomes an improvised negotiation where the receiver either asks for more information (adding round trips) or guesses (adding errors). Standardized protocols such as Model Context Protocol (MCP) and agent-to-agent (A2A) communication give agents built on different frameworks a shared vocabulary for task description, completed work, memory artifacts, and handoff reason, so the contract stays stable across technology choices.

Discovery should be a part of the data contract. Agents need to know which peers exist, what they can do, and whether they are accepting work right now. [AWS Agent Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html) provides a centralized catalog that captures capabilities, availability, and metadata for agents and tools, making intelligent routing possible instead of hardcoded. [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) then gives the workflow secure connectivity and tool invocation across agents, with every interaction auditable.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp02.html#implementation-guidance)

### Implementation steps

1. **Document handoff runbooks:** Cover the top five agent-to-agent collaboration scenarios, specifying context package format, acceptance criteria, and expected outcomes.
2. **Define a structured context package schema:** Include task description, completed work, memory artifacts, and handoff reason. Version the schema so receivers can reject malformed handoffs.
3. **Deploy an agent registry:** Catalog agent capabilities, availability status, and handoff acceptance criteria in [AWS Agent Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html) to enable runtime discovery and intelligent routing.
4. **Connect agents through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html):** Configure secure connectivity, tool invocation, and authorization across agents with auditable interaction records.
5. **Define escalation criteria:** Separate agent-to-agent triggers (capability mismatch) from agent-to-human triggers (confidence threshold, high-stakes decisions, retry budget exhaustion), and instrument each.
6. **Implement deadlock detection:** Configure alarms on workflow execution duration, and automate resolution through task reassignment and human notification.
7. **Monitor collaboration health:** Track success rates, handoff latency, and context-transfer completeness in [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/), with alerting on handoff failure rates.

## Resources

**Related best practices:**

- [AGENTOPS01-BP01 Establish well-defined agent roles, responsibilities, and success criteria](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp01.html)
- [AGENTOPS04-BP01 Implement tool registry and catalog management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops04-bp01.html)
- [AGENTOPS04-BP02 Establish standardized tool integration protocols (MCP, A2A)](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops04-bp02.html)
- [AGENTOPS05-BP01 Establish end-to-end tracing and telemetry for agent operations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp01.html)
- [AGENTPERF05-BP04 Implement efficient agent delegation and handoff patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp04.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Agent Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html)
- [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
