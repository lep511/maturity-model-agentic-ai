# AGENTPERF04-BP02 Implement efficient protocol-based agent communications

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF04 — Communication and protocol efficiency · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF04-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Standardized protocols such as the Model Context Protocol (MCP) and agent-to-agent (A2A) give agents a consistent way to communicate with tools and each other, reducing per-interaction overhead and enabling interoperability. Different protocols have different performance profiles, connection establishment, serialization, streaming, multiplexing, which makes protocol selection a meaningful performance decision for high-frequency agent communication.

## Desired outcome

- You use MCP for tool integration, A2A for agent-to-agent coordination, and streaming protocols for real-time agent-user interactions.
- You have protocol overhead minimized through connection reuse and efficient serialization.
- You have documented protocol selection guidelines for the organization.

## Common anti-patterns

- Using HTTP or REST APIs with JSON serialization for all agent communications regardless of interaction pattern, paying connection establishment and verbose serialization overhead for high-frequency internal communications.
- Implementing custom communication protocols instead of adopting standards like MCP and A2A, creating maintenance burden and blocking interoperability with the broader agent ecosystem.
- Establishing new connections for every agent interaction rather than pooling and reusing them, adding unnecessary handshake latency.

## Benefits of establishing this best practice

- Protocol-appropriate connection management reduces per-interaction overhead.
- Standard protocols open interoperability with the broader agent ecosystem.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Adopt MCP as the standard protocol for agent-to-tool communication. [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) exposes tools as MCP-compatible endpoints that agents discover and invoke through a consistent interface. For agent-to-agent communication, the A2A protocol supported by AgentCore Runtime provides structured inter-agent coordination with agent card discovery, task delegation, and result collection. Frameworks such as Strands Agents and LangGraph provide MCP and A2A support.

For real-time agent-user interactions that need streaming, WebSocket connections through [Amazon API Gateway](https://aws.amazon.com/api-gateway/) keep a persistent channel open rather than reestablishing connections per turn. Connection pooling belongs on every protocol path, and protocol-level compression pays off once payloads exceed a few kilobytes.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp02.html#implementation-guidance)

### Implementation steps

1. **Adopt MCP for agent-to-tool communications through AgentCore Gateway:** Expose tools as MCP-compatible endpoints through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) so agents discover and invoke tools through a consistent interface.
2. **Use A2A protocol through AgentCore Runtime for agent-to-agent coordination:** Use the A2A protocol supported by AgentCore Runtime for agent-to-agent coordination, with agent card discovery, task delegation, and result collection.
3. **Implement WebSocket connections through API Gateway for real-time streaming agent-user interactions:** Use WebSocket connections through [Amazon API Gateway](https://aws.amazon.com/api-gateway/) for real-time streaming so the channel stays open rather than reestablishing on each turn.
4. **Enable connection pooling and protocol-level compression for all communications:** Pool connections on every protocol path and enable compression once payloads exceed a few kilobytes.
5. **Budget for authentication overhead and implement token caching through AgentCore Identity:** Use AgentCore Identity with token caching for agent authentication, and use AWS IAM roles for service-to-service calls so credential exchange isn't on the critical path.

## Resources

**Related best practices:**

- [AGENTPERF04-BP01 Optimize asynchronous message handling patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp01.html)
- [AGENTPERF06-BP01 Design optimized tool integration strategies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf06-bp01.html)
- [AGENTPERF05-BP02 Implement optimized multi-agent collaboration models](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp02.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
