# AGENTCOST01-BP01 Use the reflection pattern to design efficient agent reasoning loops

**Pillar:** Cost optimization · **Focus area:** AGENTCOST01 — Reasoning and execution cost optimization · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST01-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Unbounded reasoning loops consume tokens unpredictably and can result in higher than expected token consumption for routine tasks. A bounded reflection pattern gives you predictable token budgets and preserves decision quality.

## Desired outcome

- You have explicit termination conditions for every agent: a maximum iteration count, a confidence threshold, and a per-session token budget.
- You apply reflection selectively, triggering full self-correction only when initial output quality falls below a threshold.
- You track per-cycle token consumption and decision quality so termination parameters can be tuned from data rather than guesswork.

## Common anti-patterns

- Running agents without iteration limits or cost caps, allowing indefinite token consumption without progress toward the task.
- Applying expensive reflection and self-correction to every output, regardless of whether the initial answer was already good.
- Operating without per-cycle token instrumentation, so no one can tell which reasoning phase drives cost.
- Using fixed iteration counts instead of confidence thresholds, which either wastes tokens on unnecessary iterations or cuts off complex reasoning prematurely.
- Building reflection patterns without budget guardrails, so unbounded loops consume tokens before alerts fire.

## Benefits of establishing this best practice

- Predictable token consumption through bounded reasoning cycles with explicit termination conditions.
- Selective reflection preserves decision quality for ambiguous cases while reducing token waste on straightforward tasks.
- Cost-quality baselines reveal which reasoning patterns deliver the best trade-offs, enabling data-driven tuning of thresholds.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Every reflection loop assumes that another iteration will improve the answer more than it costs, which works with ambiguous tasks but often loses value on straightforward ones. Without that contract, agents reflect on every output regardless of whether reflection improves quality. The discipline is to emit a structured confidence signal alongside each action, inspect it in the orchestration layer, and short-circuit the loop when confidence clears a threshold. Otherwise the loop runs until it hits a hard iteration ceiling, which is both the slowest and most expensive outcome for the common case.

Enforcement matters as much as the contract. Iteration caps expressed only in the system prompt can drift past under adversarial inputs or prompt injections. [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) applies Cedar policies at the [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) boundary, so iteration and token limits are rejected at the traffic layer rather than noticed after they're exceeded. [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) provides session-isolated execution and consumption-based pricing, so each session carries its own budget and one runaway session doesn't corrupt accounting for others.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp01.html#implementation-guidance)

### Implementation steps

1. **Define explicit termination conditions per agent:** Set a maximum iteration count, a confidence threshold, and a per-session token budget, and enforce them through [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) Cedar policies at the AgentCore Gateway boundary so enforcement happens at the traffic layer rather than in application code.
2. **Instrument per-cycle token consumption:** Enable [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to capture per-session token counts through OpenTelemetry, and configure Amazon CloudWatch alarms on anomalous per-cycle patterns.
3. **Establish objective confidence thresholds:** Configure [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) to score decision quality through LLM-as-a-Judge, and anchor early-termination thresholds to measured quality rather than self-reported confidence.
4. **Gate reflection on initial output quality:** Score each initial output with a lightweight rubric and trigger the full reflection pass only when the score falls below a configurable threshold, keeping reflection overhead off the straightforward cases.
5. **Recalibrate thresholds on a cadence:** Review cost-quality baselines monthly (or quarterly for stable workloads) and adjust confidence thresholds, iteration limits, and reflection triggers based on the distribution of observed outcomes.

## Resources

**Related best practices:**

- [AGENTCOST01-BP02 Optimize multi-agent collaboration cost through efficient handoff patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp02.html)
- [AGENTCOST01-BP03 Implement cost-effective patterns like hybrid supervisor for multi-agent coordination](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp03.html)
- [AGENTCOST02-BP01 Architect tiered model selection for cost-performance optimization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html)
- [AGENTCOST07-BP01 Implement automated cost controls with intelligent cutoffs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost07-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
