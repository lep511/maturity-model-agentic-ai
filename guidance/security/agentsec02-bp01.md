# AGENTSEC02-BP01 Implement tool authorization

**Pillar:** Security · **Focus area:** AGENTSEC02 — Secure agent tool usage · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC02-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

An agent with unconstrained tool access has no meaningful privilege boundary. Externally enforced authorization at the gateway, combined with identity propagation and human review for mutating operations, enforces bounded autonomy at the tool layer.

## Desired outcome

- You authorize every tool invocation against a defined policy before execution, with agent identity and user context propagated through the authorization chain.
- Agents can invoke only the tools within their approved scope, and attempts to access unauthorized tools are blocked and logged.
- Human-in-the-loop checkpoints intercept high-risk mutating operations so consequential actions receive review before execution.

## Common anti-patterns

- Granting agents blanket access to every available tool rather than scoping access to the tools each agent requires.
- Relying on the agent's own judgment to decide whether a tool invocation is appropriate, with no independent check at the tool or API layer.
- Failing to propagate user identity context through tool invocations, so downstream services can't enforce user-level access controls and every call runs with the agent's permissions.
- Skipping human-in-the-loop controls for mutating operations because they add latency, accepting unbounded risk for actions that are difficult or impossible to reverse.

## Benefits of establishing this best practice

- RBAC policies scope each agent to the tools its defined tasks require, implementing least-privilege tool access.
- Identity propagation lets downstream services enforce user-level access controls on resources reached through agent tool calls.
- Rate limiting and human-in-the-loop controls constrain autonomous execution to operations with acceptable risk profiles.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Authorization implemented only through prompt instructions is insufficient because prompts can be manipulated through adversarial phrasing or prompt injection. Implement authorization as an external, deterministic check that happens before the tool executes, regardless of how the agent arrived at the call. [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-gateway.html) is the enforcement point, and [Policy in Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-policy-in-amazon-bedrock-agentcore/) is the rules engine.

Gateway runs a dual-sided security model. On the inbound side, it follows the MCP authorization specification and acts as an OAuth resource server, working with Amazon Cognito, Okta, Auth0, or your own OAuth provider. You configure approved client IDs and audiences to control which applications and agents can reach your tools, and Gateway supports both authorization code flow (3LO) and client credentials flow (2LO) for service-to-service communication. On the outbound side, the authentication model depends on target type: AWS Lambda and Smithy model targets use IAM-based authorization through a role you configure with scoped permissions, and OpenAPI targets support API key or OAuth 2LO client credentials grant. [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-identity.html) resource credentials providers handle token caching and secure storage, and each target is associated with exactly one authentication configuration for clear boundaries and auditability.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp01.html#implementation-guidance)

### Implementation steps

1. **Configure Gateway inbound OAuth:** Create an [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-gateway.html) and wire inbound OAuth authorization to your identity provider (Amazon Cognito, Okta, Auth0, or your own OAuth provider), specifying approved client IDs and audiences.
2. **Add targets with scoped outbound credentials:** Register tool APIs as gateway targets, configuring IAM roles for Lambda and Smithy targets and API key or OAuth 2LO for OpenAPI targets, and manage outbound credentials through [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-identity.html) resource credentials providers.
3. **Author Cedar policies for authorization:** Create a policy engine in [Policy in Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-policy-in-amazon-bedrock-agentcore/) and define Cedar policies with identity-aware conditions on OAuth claims (user role, scopes, user ID) and tool input parameters. Author directly in Cedar or generate policies from natural language descriptions.
4. **Validate policies in LOG\_ONLY before enforcing:** Associate the policy engine with Gateway in LOG\_ONLY mode, review observability logs to confirm the policies produce the expected permit and deny decisions, then switch to enforce mode.
5. **Enable semantic tool discovery:** Opt in to the built-in x\_amz\_bedrock\_agentcore\_search tool so agents locate relevant tools through natural language queries rather than reasoning over the full inventory.
6. **Add human-in-the-loop approvals for mutating tools:** Wire AWS Step Functions callback patterns for high-risk tools, send approval requests through Amazon SNS or Amazon SES, and configure escalation paths for reviewer timeouts.
7. **Cap concurrency and request rates:** Enforce per-agent rate limits through Amazon API Gateway usage plans and cap parallel invocations with AWS Lambda reserved concurrency to help prevent resource exhaustion.
8. **Monitor authorization decisions:** Use Gateway's Amazon CloudWatch metrics and AWS CloudTrail integration to track tool invocations, authorization failures, and rate-limit events, and configure alarms for authorization-failure spikes.
9. **Review tool authorization quarterly:** Remove unused permissions and tighten access boundaries on a regular cadence as workloads and tools evolve.

## Resources

**Related best practices:**

- [AGENTSEC02-BP02 Validate tool inputs and outputs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp02.html)
- [AGENTSEC02-BP03 Maintain approved tool registry with security assessments](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp03.html)
- [AGENTSEC03-BP03 Implement least privilege with dynamic boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html)
- [AGENTREL02-BP02 Limit agent permissions to minimum required access](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp02.html)
- [AGENTCOST04-BP01 Design cost effective tool selection to minimize unnecessary invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS CloudTrail](https://aws.amazon.com/cloudtrail/)
