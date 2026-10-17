# AGENTSUS01-BP03 Optimize resource utilization through shared services

**Pillar:** Sustainability · **Focus area:** AGENTSUS01 — Resource reusability · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS01-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Every agent that provisions its own connection pool, cache, or processing queue pays the cost of infrastructure nobody else in the fleet benefits from. Shared services turn those duplications into one piece of infrastructure that every agent uses, so infrastructure scales with organizational demand rather than agent count.

## Desired outcome

- You have common infrastructure, connection pools, caches, and processing queues, consolidated into shared service layers that every agent invokes rather than duplicates.
- Agents consume shared services through a tool abstraction, so implementations can change without coupling to the callers.
- Shared caching and pooling reduce the total number of redundant calls to external systems.
- Utilization of shared services is monitored so capacity scales with actual demand rather than theoretical peaks.

## Common anti-patterns

- Deploying a separate cache, connection pool, and queue per agent, so infrastructure cost scales linearly with agent count.
- Letting each agent open its own connections to external services and fetch the same reference data repeatedly, producing redundant network traffic and wasted compute.
- Treating each agent workflow as an isolated system, missing opportunities to consolidate common functions like authentication, logging, or queuing into a shared layer.
- Maintaining static allocations regardless of actual demand, so shared infrastructure carries peak capacity even during low-utilization periods.

## Benefits of establishing this best practice

- A single optimization to shared infrastructure improves every agent that uses it, amortizing operational work across the fleet.
- Infrastructure investment grows with organizational demand rather than proportional to agent count.
- Dynamic scaling on shared components contracts resources when demand is low, which is hard to do when each agent runs its own isolated stack.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The infrastructure agents need is more repetitive than the work they do. Authentication, caching, queuing, connection pooling, and cross-agent retrieval all look the same no matter which agent is calling them. When every agent provisions its own copy of this plumbing, the organization pays for the same infrastructure N times and optimizes it one team at a time. Consolidating into shared layers reverses this. Infrastructure is optimized once and every caller benefits.

A shared cache that agents call directly by host name creates tight coupling. Swapping the implementation means updating every caller. Exposing shared services through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) MCP server capabilities puts a stable interface in front of the implementation. The cache tier, queue backend, or connection pool can change without the agents noticing. [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) centralizes authentication so individual agents don't manage credentials independently, which is the simplest form of shared infrastructure with immediate return.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp03.html#implementation-guidance)

### Implementation steps

1. **Identify common infrastructure needs:** List the plumbing duplicated across current deployments and consolidate each into a shared service layer: connection pools, caches, queues, authentication.
2. **Deploy shared caching:** Provision [Amazon ElastiCache](https://docs.aws.amazon.com/AmazonElastiCache/latest/UserGuide/BestPractices.html) for general-purpose hot data or [Amazon DynamoDB Accelerator (DAX)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html) for DynamoDB-backed state, so frequently accessed data is read from one cache rather than refetched per agent.
3. **Expose shared services through a stable interface:** Publish shared infrastructure as MCP tools through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) so agents consume it without coupling to the implementation.
4. **Centralize authentication:** Use [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) to manage credentials once rather than having every agent manage its own.
5. **Distribute model inference:** Turn on [Amazon Bedrock cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) so foundation model capacity is pooled across Regions for availability.
6. **Track utilization and scale on data:** Monitor the following through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html), and adjust capacity based on observed usage rather than worst-case estimates: cache hit rates, queue depth, invocation patterns.

## Resources

**Related best practices:**

- [AGENTSUS01-BP01 Design specialized agents with explicit resource boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp01.html)
- [AGENTSUS01-BP02 Implement reusable workflow patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp02.html)
- [SUS03-BP02 Remove or refactor workload components with low or no use](https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sus_sus_software_a3.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon ElastiCache](https://aws.amazon.com/elasticache/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
