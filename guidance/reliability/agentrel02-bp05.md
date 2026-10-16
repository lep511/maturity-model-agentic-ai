# AGENTREL02-BP05 Establish tiered human oversight and approval workflows

**Pillar:** Reliability · **Focus area:** AGENTREL02 — Predictable task execution · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL02-BP05](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp05.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Uniform oversight either slows every routine action to a crawl or lets a high-consequence decision slip through unchecked. Tiering review to match the risk and reversibility of each action balances throughput with appropriate governance.

## Desired outcome

- You have agent actions classified into tiers (autonomous, notify, and approve) based on impact and reversibility.
- You have a first-pass automated review layer that filters policy-violating actions before human reviewers see them.
- You log every oversight decision with reviewer identity, rationale, and timestamp for compliance and governance reporting.

## Common anti-patterns

- Applying uniform oversight regardless of risk, creating bottlenecks for routine tasks or letting high-consequence actions slip through unchecked.
- Skipping clear escalation criteria, so some high-risk actions proceed autonomously while some low-risk actions queue for review.
- Running approval workflows without timeouts or fallback, causing agents to stall indefinitely when reviewers are unavailable.

## Benefits of establishing this best practice

- Appropriate governance for high-consequence actions without bottlenecks on routine work.
- Reduced risk from LLM stochasticity because irreversible or high-stakes decisions get human review.
- An audit trail for compliance through structured logging of oversight decisions.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Risk classification is the first design choice. Categorize agent actions into three tiers. Autonomous actions are low-risk and reversible. Notify actions are medium-risk and proceed with operator awareness. Approve actions are high-risk or irreversible and require explicit human approval. Encode the classification as Cedar policies through [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html), so tier enforcement happens at the gateway boundary before the agent can execute. Policy-based enforcement applies the classification at runtime rather than relying on reference documentation alone.

Automated first-pass review reduces the load on human reviewers. [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) intercepts agent outputs before they reach reviewers, filtering content that violates predefined policies. What reaches the human queue should be the genuinely ambiguous cases, with policy violations filtered automatically.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp05.html#implementation-guidance)

### Implementation steps

1. **Define a risk classification framework:** Categorize agent actions into autonomous, notify, and approve tiers based on impact and reversibility, and encode the classification as Cedar policies through [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html).
2. **Configure Amazon Bedrock Guardrails as the automated first-pass layer:** Use [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) to filter policy-violating actions before human escalation.
3. **Build structured approval workflows:** Pause execution and route review requests to reviewers. Each request should include the action description, agent reasoning, impact assessment, and execution history.
4. **Configure timeouts and escalation paths:** Handle reviewer unavailability without blocking indefinitely, with escalation to secondary reviewers or safe default fallbacks.
5. **Log every oversight decision:** Capture reviewer identity, rationale, and timestamp so the audit trail supports compliance and governance reporting.

## Resources

**Related best practices:**

- [AGENTREL02-BP03 Implement behavioral anomaly detection and monitoring](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp03.html)
- [AGENTREL02-BP04 Develop clear instruction protocols for agents](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp04.html)
- [AGENTSEC04-BP02 Human-in-the-loop for critical decisions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html)
- [AGENTSUS03-BP01 Maintain organizational skills and competencies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp01.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
