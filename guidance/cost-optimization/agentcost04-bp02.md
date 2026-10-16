# AGENTCOST04-BP02 Cost optimize tool serving through serverless and resource sharing

**Pillar:** Cost optimization · **Focus area:** AGENTCOST04 — Agent tool serving cost optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST04-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Tool infrastructure that runs constantly to serve unpredictable agent traffic carries the highest idle cost in an agent stack. Serverless tool serving with shared infrastructure across agents aligns spend with actual invocations and removes the fixed overhead of per-agent dedicated instances.

## Desired outcome

- You have tool-serving infrastructure that scales dynamically with agent usage and charges only for actual invocations.
- You share stateless tool services across agents while maintaining security isolation.
- You use private networking and compact serialization to reduce data transfer costs on high-frequency tool invocations.
- You track per-agent cost attribution for targeted optimization.

## Common anti-patterns

- Running persistent servers for tool serving that incur charges during hours or days when no agents invoke tools.
- Creating dedicated tool server instances per agent rather than shared stateless services, producing dozens of underutilized servers.
- Routing tool invocations through NAT Gateways when agents and tools live in the same VPC, incurring unnecessary per-GB data processing charges.

## Benefits of establishing this best practice

- Serverless tool serving scales to zero when agents are inactive, reducing idle costs through consumption-based pricing.
- Shared tool infrastructure spreads fixed hosting overhead across all agents while maintaining security isolation.
- VPC endpoints and compact serialization reduce data transfer costs for high-frequency tool invocations.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Agent tool traffic is inherently bursty. An agent fleet is active during business hours, idle overnight, and heavily uneven across agent types. Provisioned tool infrastructure pays for that shape by keeping compute warm through idle hours, which can be a significant hidden cost in agent stacks. [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) provides fully-managed, serverless tool serving that converts APIs and existing services into MCP-compatible tools without infrastructure management. AgentCore Gateway handles authentication, scales automatically, and combines multiple APIs into unified endpoints.

Because tools exposed through AgentCore Gateway are available to all authorized agents, one endpoint can serve an entire fleet rather than one endpoint per agent. [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) and [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) supply the fine-grained access control that keeps sharing safe.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp02.html#implementation-guidance)

### Implementation steps

1. **Expose tools through serverless Gateway:** Deploy agent tools through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) MCP server capabilities for serverless infrastructure with automatic scaling and shared access across agents.
2. **Apply fine-grained access control:** Configure [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) Cedar policies for per-agent tool access, preserving security isolation while sharing infrastructure.
3. **Attribute cost per agent:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) telemetry tags with agent ID and workflow ID, and generate periodic AWS Cost Explorer reports by agent and tool type.
4. **Monitor invocation patterns and cold starts:** Expose tool invocation patterns through AgentCore Observability, and set Amazon CloudWatch alarms for patterns that exceed expected bounds, including cold start frequency.

## Resources

**Related best practices:**

- [AGENTCOST04-BP01 Design cost effective tool selection to minimize unnecessary invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp01.html)
- [AGENTCOST04-BP03 Implement intelligent caching and failure handling for tool results](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp03.html)
- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
