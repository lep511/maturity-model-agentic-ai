# AGENTCOST01-BP03 Implement cost-effective patterns like hybrid supervisor for multi-agent coordination

**Pillar:** Cost optimization · **Focus area:** AGENTCOST01 — Reasoning and execution cost optimization · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST01-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Many multi-agent workflows pay for AI reasoning at the coordination layer for decisions that rules could make at no additional charge. Matching each orchestration decision to the cheapest mechanism capable of handling it removes that hidden cost.

## Desired outcome

- You select orchestration patterns from workflow determinism analysis rather than defaulting to AI supervision.
- You have deterministic routing running without model invocations, and AI supervisors reserved for genuinely ambiguous cases that need natural language understanding.
- You track orchestration cost separately from worker cost and maintain documented pattern-selection criteria.

## Common anti-patterns

- Using AI supervisors for deterministic workflows, invoking expensive foundation models for routing decisions that straightforward rules handle.
- Defaulting to AI supervision without evaluating whether the routing logic follows explicit rules.
- Tracking only aggregate workflow cost without decomposing orchestrator compared to worker spend, which hides disproportionate coordination overhead.

## Benefits of establishing this best practice

- Rule-based routing handles deterministic branches without model invocations, reducing per-routing-decision cost to near zero.
- Hybrid patterns match each routing decision to the cheapest capable mechanism.
- Documented pattern-selection criteria help prevent over-provisioning AI supervision for new workflows.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Workflow determinism is a property, not an assumption. At every orchestration point, the routing decision is either a selection across a finite, enumerable set of conditions (task type, output classification, error code) or a judgment call across an open-ended input space. The first class costs nothing to route with rules, and the second requires model reasoning. Most multi-agent workflows contain both, but teams often pay for AI supervision across the whole workflow because the pattern defaults that way. Conducting the determinism analysis up front is the difference between spending model tokens on routing that a conditional could handle and spending them only where the input genuinely demands natural-language interpretation.

Enforcement happens outside the agent code. [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) runs Cedar policies at the [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) boundary, applying deterministic routing rules based on task attributes, user identity, or tool requirements without invoking an inference. Worker agents deploy on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) at the leaf nodes where reasoning actually happens. Keeping routing and reasoning on separate rails lets each one evolve independently and be monitored on its own metrics.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp03.html#implementation-guidance)

### Implementation steps

1. **Conduct workflow determinism analysis:** At each orchestration point in the workflow, classify the routing decision as fully deterministic, partially deterministic, or open-ended, and record the rationale as an architectural decision record so downstream reviewers can audit why each pattern was chosen.
2. **Apply Cedar policies for deterministic routing:** Configure [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) with Cedar policies at [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) for every fully deterministic branch, so these routing decisions run without model invocations.
3. **Insert a lightweight classifier for partially deterministic routing:** Deploy a small model or rule-based heuristic that attempts rule-based routing first and escalates to a full AI supervisor only when its confidence falls below a configurable threshold, and log the escalation rate as a tuning signal.
4. **Separate orchestration cost from worker cost:** Configure [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to attribute tokens to orchestrator and worker tiers separately, calculate the orchestration overhead ratio per workflow, and alert when the ratio drifts above the baseline recorded for that pattern.

## Resources

**Related best practices:**

- [AGENTCOST01-BP01 Use the reflection pattern to design efficient agent reasoning loops](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp01.html)
- [AGENTCOST01-BP02 Optimize multi-agent collaboration cost through efficient handoff patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp02.html)
- [AGENTCOST01-BP04 Design agent hierarchies and delegation patterns that reduce coordination overhead](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp04.html)
- [AGENTCOST05-BP02 Implement distributed cost tracing for multi-agent workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp02.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
