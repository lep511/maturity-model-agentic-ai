# AGENTSEC04-BP01 Implement guardrails and alignment controls

**Pillar:** Security · **Focus area:** AGENTSEC04 — Agent goal alignment and manipulation prevention · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC04-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Instruction-following alone doesn't provide reliable enforcement. Layered controls (deterministic where possible, probabilistic where necessary) help keep agents inside operational boundaries even when prompts are adversarial and model behavior is unpredictable.

## Desired outcome

- You define agent operational and policy boundaries up front and enforce them through layered controls, with deterministic controls (IAM, schema validation, technical policy checks) handling what is expressible deterministically and probabilistic controls (content filters, behavioral evaluation) handling what isn't.
- Multiple validation layers at different stages of the agent call chain can reduce the likelihood that a single control failure results in a boundary violation.
- You log, alert on, and periodically review guardrail interventions, policy violations, and behavioral evaluation results to tune the controls and surface emerging patterns.

## Common anti-patterns

- Relying on a single guardrail configuration for all agent use cases, applying the same constraints to low-risk informational agents and high-risk operational agents.
- Applying content filtering only to model outputs without validating inputs first, letting adversarial content reach the model before any check runs.
- Defining operational boundaries in natural-language system prompts alone, relying on the model's instruction-following as the sole constraint, which can be bypassed through prompt injection or adversarial framing.

## Benefits of establishing this best practice

- Deterministic technical controls (IAM, schema validation) combined with probabilistic content controls (Guardrails) at distinct stages reduce reliance on instruction-following alone.
- Layered validation catches policy violations at multiple stages, so a bypass at one layer is less likely to result in an unchecked boundary violation.
- Logged guardrail interventions and evaluation results feed policy updates as new patterns emerge, keeping boundaries current with evolving use cases.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Operational boundaries written only in system prompts typically don't provide reliable enforcement. A prompt can be overridden by adversarial framing, prompt injection, or the model's own creative reinterpretation, and none of those failure modes produces an audit signal before the boundary has already been crossed. The design pattern is layered. Express what can be expressed deterministically as hard checks:

Use probabilistic controls (content filters, behavioral evaluation) to cover the content-shaped risks that determinism can't reach.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp01.html#implementation-guidance)

### Implementation steps

1. **Map ethical constraints to guardrail categories:** Define organizational ethical constraints and operational boundaries per agent use case and map them to guardrail policy categories with risk-appropriate differentiation.
2. **Build tiered guardrail configurations:** Create base and use-case-specific [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) configurations, apply them to all deployments, and use versioning for rollback capability.
3. **Validate inputs before inference:** Call the ApplyGuardrail API on inputs before they reach the model, checking against denied topics, word filters, and sensitive information patterns.
4. **Alarm on intervention metrics:** Configure Amazon CloudWatch alarms on Guardrails metrics (especially InvocationsIntervened), route alerts through Amazon SNS, and enable Amazon Bedrock model invocation logging for detailed intervention records.
5. **Deploy AgentCore Evaluations with drift alarms:** Deploy [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) with built-in and custom evaluators, and configure Amazon CloudWatch alarms on evaluation scores to detect behavioral drift.
6. **Review intervention logs monthly:** Establish a monthly review of guardrail intervention logs to identify emerging patterns and update policies accordingly.

## Resources

**Related best practices:**

- [AGENTSEC04-BP02 Human-in-the-loop for critical decisions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html)
- [AGENTSEC05-BP01 Implement comprehensive logging and decision artifact storage](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html)
- [AGENTSEC08-BP01 Multi-layer input validation and prompt injection defense](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp01.html)

**Related services:**

- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon SNS](https://aws.amazon.com/sns/)
