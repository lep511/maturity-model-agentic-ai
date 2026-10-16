# AGENTREL02-BP02 Limit agent permissions to minimum required access

**Pillar:** Reliability · **Focus area:** AGENTREL02 — Predictable task execution · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL02-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Broad permissions turn a misinterpreted instruction into a cascading incident. Least-privilege access keeps the scope of impact of unpredictable LLM behavior narrow and makes anomalous activity more visible against a well-defined baseline.

## Desired outcome

- You have each agent granted only the permissions required for its specific function.
- You apply runtime access boundaries at the gateway, so the LLM's reasoning can't widen the agent's reach.
- You audit agent policies continually and remove permissions that actual usage doesn't justify.

## Common anti-patterns

- Granting broad permissions beyond the agent's function, allowing unpredictable behavior to reach unauthorized systems.
- Writing coarse-grained policies that span multiple systems, so a single misstep has an outsized impact.
- Skipping audit and monitoring of agent access patterns, missing the signals that indicate permission misuse.

## Benefits of establishing this best practice

- The scope of impact stays contained when an agent makes an unexpected decision.
- Clear operational boundaries make agent behavior more predictable.
- Baseline access patterns make anomalies visible instead of lost in noise.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Defense-in-depth is the frame for agent authorization. No single control is enough. AgentCore Identity, AgentCore Policy, and IAM all have roles to play, and the combination helps prevent a gap in one layer from becoming an unchecked privilege in another. Use [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) to manage authentication for agent access to third-party services through OAuth and API key credentials. Use [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) to enforce runtime access boundaries through Cedar policies at the AgentCore Gateway boundary, independent of how the agent's LLM reasons.

For agents interacting with Amazon Bedrock models and Knowledge Bases, use IAM identity-based policies with condition keys to restrict which models each agent can invoke. Scope Memory access to designated namespaces using IAM policy conditions. Attach identity-based policies with Condition blocks that constrain access by namespace identifier and session context (e.g., bedrock:AgentId, bedrock:SessionId). With these conditions in place, agents operate within their designated memory boundaries without cross-namespace leakage. As AgentCore Memory's authorization model evolves, adopt resource-based policies when available to further simplify namespace-level grants. Avoid wildcard resources in agent IAM policies. The temptation to use \* for convenience is the single most common reason least-privilege quietly degrades into broad access over time.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp02.html#implementation-guidance)

### Implementation steps

1. **Configure AgentCore Identity and AgentCore Policy:** Use [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) for authentication and [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) with Cedar to enforce runtime access boundaries.
2. **Create dedicated IAM execution roles per agent:** Scope each role to specific resource ARNs and avoid wildcards.
3. **Restrict Amazon Bedrock model and Knowledge Base access with IAM condition keys:** Allow each agent only the models and knowledge bases its function requires.
4. **Audit policies with IAM Access Analyzer:** Use [AWS IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html) to generate least-privilege recommendations from CloudTrail data and remediate overly permissive policies.
5. **Monitor access patterns and automate response:** Watch access patterns through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) and configure automated permission revocation or quarantine when anomalies appear.

## Resources

**Related best practices:**

- [AGENTREL02-BP01 Design agents for specific and atomic tasks](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp01.html)
- [AGENTREL02-BP03 Implement behavioral anomaly detection and monitoring](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp03.html)
- [AGENTSEC03-BP01 Implement strong authentication for agent identities](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Identity and Access Management](https://aws.amazon.com/iam/)
