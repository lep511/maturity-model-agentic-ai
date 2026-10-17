# AGENTSUS01-BP05 Adopt specification-driven tasks for frontier agents and long-running workflows

**Pillar:** Sustainability · **Focus area:** AGENTSUS01 — Resource reusability · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS01-BP05](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp05.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Long-running agents without explicit success criteria and resource budgets drift into exploration that never quite terminates, consuming compute hours on paths that don't deliver value. Specifications that declare acceptable outputs, cost ceilings, and termination conditions up front make extended execution a bounded investment rather than an open-ended one.

## Desired outcome

- You have specifications for each frontier agent declaring maximum execution duration, token budget, memory allocation, and termination triggers before deployment.
- Long-running workflows pause at defined checkpoints to evaluate progress against the specification, and decisions about continuing, modifying, or terminating are informed by that evaluation.
- Parent frontier agents cascade remaining budget and time to child agents they spawn, so delegation inherits the parent's ceiling.
- Specification compliance is monitored in production and feeds back into template refinement for future frontier workflows.

## Common anti-patterns

- Deploying long-running agents without explicit resource budgets or termination conditions, so unbounded exploration is structurally possible.
- Omitting success criteria and decision-making boundaries from frontier workflow configuration, producing wasteful execution patterns where compute is consumed without commensurate value.
- Running extended workflows without checkpoint-based evaluation, so nobody can make an informed decision about modifying or terminating a run in progress.
- Spawning child agents from frontier workflows without passing remaining budget downstream, breaking the cost ceiling at the first delegation.

## Benefits of establishing this best practice

- Extended workflows come with accountability, compute investment is matched against business value generated rather than consumed open-endedly.
- Checkpoint evaluations give operators a chance to redirect or halt work before it burns disproportionate infrastructure.
- Specification templates accumulate institutional knowledge about expected behavior for common frontier workload patterns.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Frontier agents, code writers, deep research agents, and autonomous planners, are open-ended by design. That makes them the place where resource discipline matters most, because the cost of an unbounded exploration is many orders of magnitude higher than the cost of a single misrouted call. A specification written before deployment gives the agent something to terminate against:

Without that contract, the agent runs until it happens to produce something or hits an infrastructure-imposed ceiling.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp05.html#implementation-guidance)

### Implementation steps

1. **Write specifications before deployment:** For each frontier agent, declare the following and record the success criteria that define done: maximum execution duration, token budget, memory allocation, termination triggers.
2. **Deliver specifications at invocation time:** Pass specifications into [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime.html) through [Strands Agents](https://strandsagents.com/) as first-class configuration, so the contract is part of the invocation rather than implicit in the agent code.
3. **Cascade budgets to child agents:** When a parent frontier agent delegates, pass the remaining duration, token budget, and memory budget into the child invocation through [AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-standard-vs-express.html) parameters or Strands orchestration, so the ceiling holds across delegation.
4. **Implement checkpoint-based evaluation:** Structure long-running workflows to pause at defined points, evaluate progress against the specification, and persist state in AgentCore Memory so the agent resumes from the checkpoint after a continue/modify/terminate decision.
5. **Monitor adherence and refine templates:** Track the following through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html), and feed the data back into specification templates for common frontier workload patterns: specification violations, checkpoint outcomes, budget utilization.

## Resources

**Related best practices:**

- [AGENTSUS01-BP01 Design specialized agents with explicit resource boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp01.html)
- [AGENTSUS01-BP04 Scale cognitive processing pathways appropriately](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp04.html)
- [SUS02-BP03 Stop the creation and maintenance of unused assets](https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sus_sus_software_a4.html)
- [COST02-BP02 Implement goals and targets](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/cost_govern_usage.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
