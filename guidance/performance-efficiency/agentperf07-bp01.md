# AGENTPERF07-BP01 Design efficient multitenant agent deployment models

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF07 — Multi-tenancy and resource optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF07-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf07-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Organizations that serve multiple tenants from a shared agent service get better resource efficiency and faster tenant onboarding when the deployment model delivers consistent performance for every tenant. Siloed deployments provide strong isolation at higher cost. Pooled deployments maximize efficiency but need mechanisms to help prevent noisy neighbor effects. Hybrid models combine both, using pooled resources for standard tenants and dedicated resources for premium tenants.

## Desired outcome

- You have multitenant agent deployments that use deployment models matched to tenant requirements.
- You have deployment models documented with clear performance characteristics and SLA commitments for each tier.
- You have a deployment model that supports efficient tenant onboarding through configuration rather than infrastructure provisioning.

## Common anti-patterns

- Deploying fully siloed infrastructure for every tenant regardless of their performance requirements, creating resource waste for tenants that would be well-served by pooled resources.
- Using a single pooled deployment without isolation mechanisms, allowing high-volume tenants to consume disproportionate resources and degrade performance for others.
- Skipping tenant tiers with different performance SLAs, treating all tenants identically regardless of business value.

## Benefits of establishing this best practice

- Resource investment stays proportional to tenant value and performance requirements.
- Appropriate isolation mechanisms deliver consistent performance for every tenant.
- Configuration-driven provisioning speeds tenant onboarding.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Define tenant tiers based on performance requirements and business value:

For pooled deployments, [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) provides session-isolated execution that naturally helps prevent cross-tenant interference at the agent execution level. For tenants that need custom container environments, deploy on [Amazon EKS](https://aws.amazon.com/eks/) or [Amazon ECS](https://aws.amazon.com/ecs/) with namespace-level or task-level isolation. For simpler tenant needs such as team-specific chat assistants or enterprise Q&A, [Amazon Quick Suite](https://aws.amazon.com/quicksuite/) provides a managed no-code option where business users create and deploy agents without custom infrastructure.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf07-bp01.html#implementation-guidance)

### Implementation steps

1. **Define tenant tiers with specific performance SLAs, isolation requirements, and pricing:** Define standard, premium, and optional enterprise tiers with explicit SLAs and isolation expectations.
2. **Design the deployment architecture for each tier:** Architect pooled (shared AgentCore Runtime, on-demand Amazon Bedrock), premium (dedicated resources, provisioned throughput), and enterprise (fully isolated) deployments.
3. **Implement tenant-aware routing using API Gateway with per-tenant usage plans and rate limits:** Use [Amazon API Gateway](https://aws.amazon.com/api-gateway/) usage plans with per-tenant rate and burst limits.
4. **Configure data isolation using DynamoDB tenant partition keys (pooled) or separate tables (siloed):** Enforce data isolation at the data layer with partition keys or separate tables as appropriate for the tier.
5. **Automate tenant onboarding for each tier using CDK/CloudFormation templates:** Template onboarding so new tenants are provisioned through configuration rather than manual infrastructure work.
6. **Monitor per-tenant performance metrics to validate SLA compliance:** Publish per-tenant metrics to CloudWatch and alert when observed performance drifts outside SLA.

## Resources

**Related best practices:**

- [AGENTPERF07-BP02 Implement tenant-aware performance isolation and throttling](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf07-bp02.html)
- [AGENTPERF02-BP01 Design efficient reasoning pipelines](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [Amazon EKS](https://aws.amazon.com/eks/)
- [AWS CDK](https://aws.amazon.com/cdk/)
