# AGENTCOST06-BP02 Cost optimize versioning and deployment through efficient artifact management

**Pillar:** Cost optimization · **Focus area:** AGENTCOST06 — Agent discovery and deployment cost optimization · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST06-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost06-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agent runtimes that create an immutable version on every configuration change accumulate hundreds of versions during normal development, each holding references to container images that can't be managed easily. Layered base images, endpoint-based traffic routing, and automated cleanup policies keep deployment cost proportional to real usage rather than to the number of past configurations.

## Desired outcome

- You have container layer deduplication storing shared dependencies once across agent versions.
- You use endpoint-based traffic routing for blue/green and canary deployments without duplicate running infrastructure.
- You have automated lifecycle policies that delete unused versions, helping prevent indefinite storage accumulation.
- You monitor version inventory and catch unused versions before they become a material cost.

## Common anti-patterns

- Retaining all agent versions indefinitely without lifecycle policies, accumulating storage costs for versions that receive zero invocations.
- Creating separate container images without sharing common base layers, multiplying storage costs across agent versions.
- Running full parallel environments for blue/green deployments instead of routing only test traffic percentages.
- Allowing unused agent versions to accumulate without monitoring, reducing the risk of automated cleanup and steadily increasing storage overhead without visibility into version invocation patterns.

## Benefits of establishing this best practice

- Container layer deduplication stores shared dependencies once, reducing storage costs proportionally to version reuse. Verify deduplication by comparing total repository storage in ECR (reported in CloudWatch metrics under RepositorySize) against the sum of individual image manifest sizes. Effective deduplication shows repository storage significantly smaller than the sum of manifests.
- Endpoint-based routing enables deployment transitions without duplicate running infrastructure.
- Automated cleanup deletes unused versions, helping prevent indefinite storage cost growth.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

[Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) creates an immutable version on every configuration update. The version itself is lightweight metadata (container image reference, protocol settings, and network configuration), but each version holds a reference to container images that [Amazon ECR](https://aws.amazon.com/ecr/) can't be managed until all references are removed. Updating an environment variable, changing a protocol setting, or modifying network configuration all trigger a new version. Without a cleanup policy, active development produces hundreds of versions, each anchoring its referenced images in place.

The first mitigation is layer structure. Build agent containers with a common base layer containing shared dependencies (runtime, SDK, common tools) and agent-specific layers on top. ECR automatically deduplicates identical layers across images, so agents that share most dependencies share most storage. The second mitigation is traffic routing. The AgentCore Runtime endpoint system supports blue/green and canary deployments without parallel infrastructure: create a production endpoint pointing to the stable version and use weighted routing to send a small traffic percentage to new versions during validation. [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) provides the per-version metrics (error rates, latency percentiles, cost-per-task-completion) that drive the promotion decision.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost06-bp02.html#implementation-guidance)

### Implementation steps

1. **Structure containers for layer sharing:** Build agent containers with common base layers and agent-specific layers so [Amazon ECR](https://aws.amazon.com/ecr/) layer deduplication is effective.
2. **Use endpoint-based traffic routing:** Deploy agents to [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) and configure custom endpoints for production traffic with weighted routing for blue/green and canary deployments.
3. **Include cost in promotion criteria:** Monitor deployment quality using [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) metrics before updating production endpoints, including cost-per-task-completion alongside error rates and latency.
4. **Set version retention policies:** Define a retention policy such as the last five versions plus active traffic, and configure [Amazon ECR lifecycle policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html) to delete unused images automatically.
5. **Monitor version inventory weekly:** Deploy a weekly version inventory function that queries AgentCore Runtime APIs for all agent versions, identifies versions with zero invocations through Amazon CloudWatch metrics, and stores the usage metadata for historical analysis before the ECR lifecycle policy deletes the images.

## Resources

**Related best practices:**

- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)
- [AGENTCOST06-BP01 Implement lightweight discovery and registry for cost-effective collaboration](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost06-bp01.html)
- [AGENTCOST06-BP03 Design cost-efficient initialization through warm pools and caching](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost06-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon ECR](https://aws.amazon.com/ecr/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
