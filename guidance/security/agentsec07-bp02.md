# AGENTSEC07-BP02 Clear confidence indicators and manipulation warnings

**Pillar:** Security · **Focus area:** AGENTSEC07 — Human oversight protection and agent containment · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC07-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Workload-managed reviewers still make poor decisions when they lack the context to evaluate what the agent is recommending. Surfacing agent confidence, manipulation flags, and historical comparisons lets reviewers calibrate scrutiny to the actual risk of each decision.

## Desired outcome

- Human reviewers see agent confidence scores, uncertainty indicators, and manipulation warning flags alongside each decision, letting them calibrate scrutiny appropriately.
- Historical context and similar past decisions are surfaced so reviewers can identify when an agent is recommending an action that deviates from established patterns.

## Common anti-patterns

- Presenting agent decisions without confidence scores or uncertainty indicators, leaving reviewers unable to distinguish high-confidence recommendations from speculative outputs.
- Not surfacing historical context or similar past decisions, so every recommendation looks equally plausible without a baseline of "what normally happens here."
- Displaying confidence scores without explaining their meaning or limitations, leading reviewers to over-trust high-confidence outputs without appropriate skepticism.

## Benefits of establishing this best practice

- Confidence scores and historical context help reviewers calibrate scrutiny to the actual risk of each decision.
- Deviation flags draw reviewer attention to the decisions that most need it when an agent's recommendation differs from historical patterns.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Start with what the reviewer is being asked to decide. Two patterns are common and require different signals. In the **evaluator pattern**, the agent recommends an action and the reviewer decides whether the recommendation is correct. The useful signal is the agent's confidence in its own output (a low score suggests the recommendation may be wrong). In the **gate pattern**, the agent wants to perform a high-risk action and the reviewer is a policy gate deciding whether the action should be allowed. The agent's own confidence is less useful because the agent would not have proposed the action if it thought it was wrong. For gate-pattern reviews, the useful signal comes from systems independent of the agent: anomaly detection, policy checks, and manipulation-warning flags from the input-validation pipeline.

For evaluator-pattern reviews, configure [Amazon Bedrock Guardrails contextual grounding](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html) to generate a grounding score that checks whether the response is supported by the source material the agent was given. Surface that score alongside review notifications with plain-language explanations (for example, "the agent's response isn't well supported by the source material, and independent verification is recommended") so reviewers know what the score means rather than guessing. For gate-pattern reviews, draw from checks independent of the agent: anomaly detection (AGENTSEC07-BP04) evaluates whether the action deviates from baseline behavior, and manipulation-warning flags raised by the input-validation pipeline (AGENTSEC04-BP01 and AGENTSEC08-BP01) signal when the request itself looks adversarial. [Amazon Bedrock Guardrails automated reasoning](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-automated-reasoning-policy.html) provides a complementary deterministic check that validates agent outputs against a formally authored policy (for example, "users in region X can't perform operation Y"). It is most useful as context on the reviewer's screen ("this passed policy check X at Y time") rather than as the primary decision signal, because actions that pass automated reasoning typically don't need human gating unless the policy itself is known to have gaps or the action is irreversible enough to warrant redundant human sign-off. Surface each signal with the same plain-language framing so the reviewer knows what each number or flag means.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp02.html#implementation-guidance)

### Implementation steps

1. **Configure contextual grounding and automated reasoning:** Generate confidence scores for agent outputs through [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) contextual grounding and automated reasoning, and include plain-language explanations alongside numeric scores in review notifications.
2. **Store historical decisions for similarity lookup:** Persist decisions and confidence scores in Amazon DynamoDB and implement a similarity query that surfaces past decisions for the same operation type alongside each new review request.
3. **Flag deviations from historical patterns:** When a confidence score deviates significantly from the historical average for that operation type, highlight it for the reviewer.
4. **Surface AgentCore Evaluations trends:** Integrate [Amazon Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/aws/amazon-bedrock-agentcore-adds-quality-evaluations-and-policy-controls-for-deploying-trusted-ai-agents/) quality scores into the review context so reviewers can see whether overall agent quality is stable or declining.
5. **Build dashboards for systemic trends:** Create Amazon Quick dashboards that visualize decision patterns, confidence score distributions, and anomaly trends over time for security team review.

## Resources

**Related best practices:**

- [AGENTSEC04-BP01 Implement guardrails and alignment controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp01.html)
- [AGENTSEC07-BP01 Implement cognitive load management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp01.html)
- [AGENTSEC07-BP04 Behavioral anomaly detection and agent containment](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp04.html)

**Related services:**

- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [Amazon Quick](https://aws.amazon.com/quicksuite/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
