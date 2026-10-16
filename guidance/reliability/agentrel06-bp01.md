# AGENTREL06-BP01 Develop agent-based integrations with existing or legacy systems

**Pillar:** Reliability · **Focus area:** AGENTREL06 — Legacy system integration · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL06-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Legacy systems expose interfaces built for synchronous, deterministic callers, while agents are asynchronous and probabilistic. Adapter layers translate between the two worlds so agents can use existing capabilities without the legacy side needing to change.

## Desired outcome

- You have integration adapters that expose MCP tool interfaces designed for agent consumption and translate to legacy protocols internally.
- You enforce canonical error handling that maps legacy error codes into types agents can interpret uniformly.
- You rate-limit at the adapter layer so agent-driven invocation speeds don't overwhelm legacy systems.

## Common anti-patterns

- Requiring legacy system modifications to support agent integration, adding deployment risk and organizational friction.
- Coupling agents directly to legacy interfaces without adapters, exposing agents to legacy-specific complexity.
- Skipping rate limiting on legacy system calls, producing overload that degrades performance for every consumer.

## Benefits of establishing this best practice

- Legacy system stability is preserved through adapter layers that shield it from agent interaction patterns.
- Agents and legacy systems evolve on independent schedules through abstraction interfaces.
- Agent adoption accelerates because integration doesn't require legacy modifications.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Adapters resolve the impedance mismatch between agent and legacy. Expose the legacy capability as an MCP tool with a schema an agent can reason about. Internally, translate to whatever the legacy system speaks: SOAP, screen scraping, database queries, or batch files. [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) registers adapters as discoverable tools with consistent authentication policies. Agents then invoke legacy capabilities through the same tool-call pattern they use for cloud-based capabilities. The [blog on uniting MCP servers through AgentCore Gateway](https://aws.amazon.com/blogs/machine-learning/transform-your-mcp-architecture-unite-mcp-servers-through-agentcore-gateway/) covers the pattern for unifying multiple adapters behind a single gateway interface.

Error mapping makes the adapter actually useful. Legacy systems emit error codes specific to their architecture, and exposing those codes directly forces every agent to understand every legacy system. A canonical error taxonomy (connection timeout, authentication failure, rate limit exceeded, and system unavailable) lets agents apply consistent handling logic without knowing the specifics of each legacy system. The translation from legacy code to canonical type happens inside the adapter.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp01.html#implementation-guidance)

### Implementation steps

1. **Implement integration adapters exposing MCP tool interfaces:** Translate to legacy protocols internally so agents see a uniform tool-call interface.
2. **Register adapters in AgentCore Gateway:** Expose adapters through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) with authentication and discovery for agent invocation.
3. **Implement canonical error mapping:** Translate legacy error codes into a consistent taxonomy agents can handle uniformly.
4. **Enforce access control and rate limiting:** Use [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) for access control and implement application-level rate limiting in the adapter to protect legacy systems.
5. **Monitor adapter health through AgentCore Observability:** Detect legacy integration reliability issues through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html).

## Resources

**Related best practices:**

- [AGENTREL06-BP02 Establish fallback mechanisms for legacy system degradation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp02.html)
- [AGENTREL06-BP03 Regularly test degraded system performance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp03.html)
- [AGENTREL06-BP04 Implement idempotent task execution patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp04.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
