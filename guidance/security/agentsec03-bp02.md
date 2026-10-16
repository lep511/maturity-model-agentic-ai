# AGENTSEC03-BP02 Separate agent and human user permission

**Pillar:** Security · **Focus area:** AGENTSEC03 — Agent identity and permission management · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC03-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Identity propagation alone isn't enough when agents act on behalf of users. Distinct agent service identities, with hard trust boundaries helping prevent assumption of human-designated roles, keep audit attribution unambiguous and stop a misconfigured agent from escalating into a human identity space.

## Desired outcome

- Agent actions and human actions are distinguishable in audit logs, with separate identities that help prevent agents from inheriting or assuming human user permissions.
- Dedicated agent service identities are scoped to only the permissions required for automated operations, and audit logs attribute every action unambiguously to either an agent or a human actor.
- Trust policies help prevent agents from assuming human-designated identities, with organization-level guardrails providing a secondary boundary in multi-account environments.

## Common anti-patterns

- Reusing human user IAM credentials or roles for agent authentication, making it impossible to distinguish agent actions from human actions in audit logs.
- Allowing agents to assume human IAM roles through role chaining, enabling access to resources that should be restricted to human users and creating a privilege-escalation path.
- Using a single shared service account for multiple agents, reducing the risk of attribution of specific actions to individual agents and complicating incident response.
- Relying only on agent-level IAM policies without role trust policy restrictions or multi-account guardrails, leaving open the assumption path where an affected agent role could still assume a human role.

## Benefits of establishing this best practice

- Separate identities produce unambiguous audit attribution that clearly distinguishes agent actions from human actions.
- Trust policies refuse assumption by agent principals, with optional organization-level guardrails adding a multi-account ceiling.
- Consistent agent identity tagging and naming conventions enable filtering and analysis of agent activity patterns during incident investigations.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Two separations matter here and they are often collapsed in practice. Identity separation means the agent operates under a service identity distinct from any human identity, whether that human is an operator managing AWS resources or an application user interacting with the agent's service. Permission separation means the agent's identity carries only the permissions it needs for its tasks and never inherits the permissions of human identities. These apply to both patterns (agents acting autonomously and agents acting on behalf of a user), but the way user context flows through a call differs: autonomous agents operate under their service identity alone, while agents acting on behalf of a user carry that user's context forward as token claims without the agent ever assuming the user's credentials. Human operator identities (which authenticate through IAM Identity Center for AWS access) and application user identities (which authenticate through a separate customer-facing identity provider and have no AWS identity at all) are themselves distinct layers.

For agents that operate on AWS, create dedicated IAM roles for each agent type as the agent's service identity, with a naming convention (for example, agent-role-<agent-name>) that distinguishes them from human operator roles, and apply PrincipalType: Agent as a consistent tag. Principal tags surface in AWS CloudTrail events primarily for management-plane API calls made with session tags. For service-specific events that don't surface principal tags, filter by the agent role ARN naming convention as the primary signal and treat the tag as a secondary filter. Use AWS IAM Identity Center for all human operator access and migrate any human operators still using account-specific IAM users off those identities. Application users are typically outside this migration, they authenticate through the application's own identity provider, and their identity flows into agent calls as token claims. Configure Service Control Policies (SCPs) in AWS Organizations that explicitly deny agents (identified by tag) from assuming roles in the human operator identity boundary, for example denying sts:AssumeRole for any principal tagged as an agent attempting to assume roles tagged as human-operator.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp02.html#implementation-guidance)

### Implementation steps

1. **Audit and rename agent roles:** Identify any IAM roles shared between agents and human users, and create dedicated agent-specific roles with a consistent naming convention (for example, agent-role-<agent-name>).
2. **Tag agent roles consistently:** Apply PrincipalType: Agent and AgentName: <name> tags to every agent IAM role for filtering and monitoring.
3. **Move human operators to IAM Identity Center:** Configure AWS IAM Identity Center for all human operator access and migrate any operators still on account-specific IAM users.
4. **Enforce the agent-to-human boundary through SCPs:** Deploy Service Control Policies in AWS Organizations that deny agents (identified by tag) from assuming human-operator roles, creating a hard boundary between the identity spaces.
5. **Register Workload Identities for on-behalf-of flows:** Register agent Workload Identities in [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-identity.html) for agents that act on behalf of users, and use GetWorkloadAccessTokenForJWT to create agent-scoped tokens that embed user context as claims for downstream authorization.
6. **Enable CloudTrail with AgentCore data events:** Turn on advanced event selectors including AgentCore data events, and build Amazon CloudWatch Logs Insights queries filtered by agent role ARN patterns for dedicated agent activity dashboards.
7. **Analyze with Athena over time:** Deliver AWS CloudTrail logs to Amazon S3 and use Amazon Athena for SQL-based analysis of agent compared to human activity patterns over time for compliance reporting and long-term trend analysis.
8. **Name sessions for attribution:** Implement role session naming conventions that include agent identifiers (and parent agent identifiers for delegation chains) for clear attribution in multi-agent systems.

## Resources

**Related best practices:**

- [AGENTSEC03-BP01 Implement strong authentication for agent identities](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp01.html)
- [AGENTSEC03-BP03 Implement least privilege with dynamic boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html)
- [AGENTSEC05-BP01 Implement comprehensive logging and decision artifact storage](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html)

**Related services:**

- [AWS Identity and Access Management](https://aws.amazon.com/iam/)
- [AWS IAM Identity Center](https://aws.amazon.com/iam/identity-center/)
- [AWS CloudTrail](https://aws.amazon.com/cloudtrail/)
- [AWS Organizations](https://aws.amazon.com/organizations/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Cognito](https://aws.amazon.com/cognito/)
- [Amazon Verified Permissions](https://aws.amazon.com/verified-permissions/)
