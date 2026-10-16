# AGENTSEC02-BP03 Maintain approved tool registry with security assessments

**Pillar:** Security · **Focus area:** AGENTSEC02 — Secure agent tool usage · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC02-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Every tool an agent can reach is part of its effective privilege surface. A version-controlled registry with documented security boundaries, enforced at invocation time, keeps unvetted or deprecated tools off the agent's call path.

## Desired outcome

- You maintain a centralized, version-controlled registry of approved tools, each with documented security boundaries, required permissions, data classification levels, and a current vulnerability assessment.
- Agents can access only tools present in the registry, and unapproved tools are blocked by default.
- You continually validate the registry for compliance, and deprecated tools are removed from agent access automatically.

## Common anti-patterns

- Allowing agents to discover and invoke any available tool or MCP server without prior security review and registry approval.
- Maintaining the tool registry as a static document rather than an enforced control, so agents can bypass it and invoke unapproved tools directly.
- Failing to distinguish between locally hosted tools and remote MCP servers in the risk assessment, underestimating the expanded scope from external network connectivity.
- Skipping version pinning for approved tools, so agents pick up new versions that have not undergone security review.

## Benefits of establishing this best practice

- A deny-by-default posture constrains agent capabilities to a pre-approved, security-reviewed set of tools and operations.
- Version control helps prevent agents from using tool versions that have not been reviewed and provides an audit trail of which versions were approved and when.
- Automated compliance checks detect drift from the approved registry and trigger remediation workflows.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

A tool registry must be enforced at runtime to be effective. Document approved tools in a registry and configure the invocation path to refuse tools that are not on the list. The design pattern is a registry that agents can't bypass: tools reachable only through a gateway target, agents authorized only through a policy engine with default-deny semantics, and an out-of-band compliance process that detects drift between the registry and what is actually configured.

[Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-gateway.html) provides the consolidation point for agent-to-tool traffic. Each gateway target represents a backend service or group of APIs exposed as tools to agents, with defined tool schemas, authentication configurations, and access controls. Gateway alone isn't deny-by-default, however: adding a target makes it immediately accessible as an MCP tool to any agent that reaches the gateway endpoint. To restrict which agents can invoke which tools, layer [Policy in Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-policy-in-amazon-bedrock-agentcore/) Cedar policies with a default-deny posture, Gateway Interceptor for custom Lambda-based access logic, or both. The policy layer is what turns a populated registry into enforced authorization.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp03.html#implementation-guidance)

### Implementation steps

1. **Build the structured registry:** Create a tool registry in Parameter Store, a capability of AWS Systems Manager or AWS AppConfig with entries for each approved tool covering version, permissions, data classification, and review metadata.
2. **Add approved tools as Gateway targets:** For agent-to-tool traffic, register approved tools as [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-gateway.html) targets with defined tool schemas, outbound authentication configurations, and access controls. Group targets by business domain, authorization requirements, and API type.
3. **Publish an MCP registry for development:** Create an MCP registry JSON file that follows the [MCP Registry open standard](https://github.com/modelcontextprotocol/registry), host it on an HTTPS endpoint, and configure it in your organization's admin settings with version pinning for each server entry.
4. **Define the security review process:** Establish a review covering API specification scanning, permission assessment, data flow mapping, and authentication mechanism validation, with findings documented in the registry entry and a review expiration date.
5. **Build a centralized hub at enterprise scale:** For multi-LOB deployments, implement a centralized MCP server hub with an Amazon DynamoDB-backed discovery API, network-level access through AWS PrivateLink and VPC endpoints, and isolated container hosting on Amazon ECS with AWS Fargate.
6. **Enforce default-deny through Policy:** Configure Cedar policies in AgentCore Policy so only explicitly permitted tools can be invoked, providing a second enforcement layer beyond Gateway target configuration.
7. **Apply heightened review to remote MCP servers:** Assess network exposure and external authentication, and apply VPC endpoints and security groups to restrict connectivity.
8. **Detect registry drift continually:** Deploy AWS Config rules to detect agent configurations referencing unapproved tools, and trigger Amazon EventBridge notifications for remediation.
9. **Automate deprecation:** Expire tools past their review date, remove them from Gateway targets and the MCP registry, and update agent configurations to help prevent continued use.

## Resources

**Related best practices:**

- [AGENTSEC02-BP01 Implement tool authorization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp01.html)
- [AGENTSEC02-BP02 Validate tool inputs and outputs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp02.html)
- [AGENTSEC03-BP03 Implement least privilege with dynamic boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Systems Manager](https://aws.amazon.com/systems-manager/)
- [AWS Config](https://aws.amazon.com/config/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [AWS AppConfig](https://aws.amazon.com/systems-manager/features/appconfig/)
- [Amazon ECS](https://aws.amazon.com/ecs/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
