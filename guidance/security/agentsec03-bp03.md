# AGENTSEC03-BP03 Implement least privilege with dynamic boundaries

**Pillar:** Security · **Focus area:** AGENTSEC03 — Agent identity and permission management · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC03-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Broad permissions grant an affected agent access well beyond the task it was asked to do. Scoping privilege at each identity layer, backing it with temporary credentials, and layering contextual IAM conditions limits the scope of any single compromised or misprompted call.

## Desired outcome

- Agents operate with the minimum permissions required to complete their defined tasks, with temporary credentials that expire automatically and dynamic permission boundaries that tighten when handling sensitive data or high-risk operations.
- Just-in-time access patterns help limit elevated permissions to the duration of the operation that requires them.
- You continually validate policy scoping as workloads evolve, removing drift before it accumulates.

## Common anti-patterns

- Assigning broad IAM policies (for example, s3:\* or \*) to agent roles for convenience, granting far more access than any individual task requires.
- Using long-lived static credentials instead of temporary credentials from AWS STS, extending the window of exposure if credentials are inadvertently disclosed.
- Failing to implement IAM permission boundaries, allowing agents to create or modify IAM policies and escalate their own privileges.
- Expanding agent permissions in response to access errors without investigating whether the access pattern is legitimate, accumulating excessive permissions through reactive grants that are never revoked.

## Benefits of establishing this best practice

- Least-privilege IAM roles limit an affected agent to only the resources required for its current task.
- Temporary AWS STS credentials with short session durations reduce the risk of long-lived credential exposure.
- IAM Conditions on region, resource tags, time windows, and source network add defense-in-depth that limits the impact of credential exposure.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

An agent operates under multiple identity layers, and each is a separate place to apply scoping. The **agent identity** is what this specific agent is as an entity in your directory (for example, an AgentCore Workload Identity with a unique ARN). The **service identity** is what the agent runs as when it invokes AWS services (for AgentCore Runtime. This is the IAM execution role assumed by the Runtime process). The **transaction identity** is the per-invocation context carried with a single agent call, typically expressed through AWS STS session credentials with session tags and session policies. When an agent acts on behalf of a user, a **user identity** is additionally carried in the call context as token claims propagated through the agent's call chain. Permission scoping applies differently at each layer:

At the service identity layer, design agent IAM roles using the principle of least privilege, starting with no permissions and adding only what is required for each specific task. AWS IAM Access Analyzer generates least-privilege policies based on actual access patterns observed in AWS CloudTrail logs, giving you a data-driven baseline for scoping. IAM permission boundaries on all agent roles establish a maximum permission ceiling that can't be exceeded even if the agent's policies are modified, which matters because it is the control that helps prevent privilege escalation when something about the policy itself changes.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html#implementation-guidance)

### Implementation steps

1. **Generate least-privilege policies from usage data:** Audit existing agent IAM roles with AWS IAM Access Analyzer to identify overly permissive policies and generate least-privilege recommendations based on actual access patterns in AWS CloudTrail logs.
2. **Apply permission boundaries:** Set IAM permission boundaries on all agent roles to establish a maximum permission ceiling that can't be exceeded even if the agent's task-level policies are modified.
3. **Scope the Gateway execution role:** Restrict the [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-gateway.html) execution role to only the actions and resources its targets require, configure target-specific outbound auth per target type, and use AgentCore Identity to propagate user context for downstream user-level enforcement.
4. **Issue temporary credentials with session policies:** Use AWS STS AssumeRole with session policies and short session durations (15 to 60 minutes) for all agent credential issuance.
5. **Add contextual IAM Conditions:** Restrict access by region (aws:RequestedRegion), resource tags (aws:ResourceTag), time windows (aws:CurrentTime), and source network (aws:SourceVpc).
6. **Deploy organization-wide SCPs:** Establish organization-wide guardrails through Service Control Policies in AWS Organizations that apply to all agent accounts.
7. **Implement just-in-time access for elevated permissions:** Use IAM Identity Center or custom Lambda-based access request workflows with automatic revocation when the operation completes or the session expires.
8. **Review IAM drift quarterly:** Schedule IAM Access Analyzer reviews every quarter to detect permission drift, identify unused access, and remove permissions that are no longer required.

## Resources

**Related best practices:**

- [AGENTSEC02-BP01 Implement tool authorization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp01.html)
- [AGENTSEC03-BP01 Implement strong authentication for agent identities](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp01.html)
- [AGENTSEC03-BP02 Separate agent and human user permission](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp02.html)
- [AGENTSEC03-BP04 Regular permission audits and access reviews](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp04.html)
- [AGENTREL02-BP02 Limit agent permissions to minimum required access](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp02.html)

**Related services:**

- [AWS Identity and Access Management](https://aws.amazon.com/iam/)
- [AWS IAM Access Analyzer](https://aws.amazon.com/iam/features/analyze-access/)
- [AWS Organizations](https://aws.amazon.com/organizations/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
