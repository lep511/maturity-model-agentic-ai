# AGENTSUS01-BP01 Design specialized agents with explicit resource boundaries

**Pillar:** Sustainability · **Focus area:** AGENTSUS01 — Resource reusability · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS01-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Monolithic agents that over-provision for worst-case inputs waste compute without reliable audit trails to track consumption. To make consumption traceable at every layer, use specialized agents with single atomic capabilities and explicit resource boundaries. Give each agent a timeout, a memory ceiling, and a token budget. Each unit of resource spend then maps back to the task that caused it.

## Desired outcome

- You have decomposed workflows into specialized agents, each responsible for one atomic capability with declared resource limits.
- Parent agents cascade resource budgets to child agents through the orchestration layer, so delegation has predictable compute and token costs.
- You track resource consumption for each agent (duration, tokens, and error rates) across delegation chains so over-provisioning is visible.
- Reusable specialized agents are exposed through a shared tool layer, so one well-bounded agent serves many parent workflows.

## Common anti-patterns

- Provisioning compute and memory for worst-case inputs regardless of actual task requirements, producing low utilization and unnecessary cost.
- Delegating from parent agents to child agents without passing timeout, retry, or token budgets, so downstream work has no enforceable cost ceiling.
- Deploying monolithic agents that bundle multiple capabilities in one process, which prevents independent scaling and makes per-capability cost attribution infeasible.
- Duplicating implementations of a capability (validation, extraction, or transformation) across workflows because no shared agent exists with known resource bounds.

## Benefits of establishing this best practice

- Resource consumption stays proportional to the task, because each agent runs within bounds appropriate to its single capability.
- Cost attribution is visible at the agent level. Over-provisioned or underperforming agents are straightforward to identify and right-size.
- Specialized agents amortize their development cost across many parent workflows when exposed as reusable tools.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

The right unit of resource accountability is the capability, not the deployment. When a single process handles validation, enrichment, extraction, and decision-making, the only safe way to size it is to assume every call does all four. Splitting those capabilities into separate agents lets each one carry the timeout, memory ceiling, and token budget that fit its actual work. Right-sizing becomes a question about each capability rather than a compromise across the whole workflow.

Budgets stop being useful the moment a delegation crosses a boundary without carrying them along. The orchestration layer has to propagate remaining time, remaining tokens, and retry budget into every child invocation. In [AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-nested-workflows.html), that means setting TimeoutSeconds and retry counts on each nested state. In a Strands-based orchestrator, it means passing the remaining budget as part of the child invocation parameters. Without that cascade, total workflow cost is unbounded regardless of what the top-level agent promises.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp01.html#implementation-guidance)

### Implementation steps

1. **Decompose workflows into single-capability agents:** Identify atomic functions in each workflow and deploy each as its own agent on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime.html) with explicit timeout, memory, and token limits. Common atomic functions include:
2. **Cascade budgets across delegation boundaries:** Configure the orchestration layer ([AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-nested-workflows.html) or a Strands-based orchestrator) to pass the following into every child invocation so downstream work inherits the parent's cost ceiling:
3. **Expose specialized agents as reusable tools:** Publish agents through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) MCP server capabilities so parent workflows invoke them without each embedding its own copy.
4. **Enforce limits at the traffic layer:** Apply [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) Cedar rules at the Gateway boundary to reject invocations that exceed declared resource limits before they consume capacity.
5. **Instrument consumption and review monthly:** Turn on [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to capture the following for each agent: Review utilization in Amazon CloudWatch each month to right-size boundaries against actual usage.

## Resources

**Related best practices:**

- [AGENTSUS01-BP02 Implement reusable workflow patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp02.html)
- [AGENTSUS01-BP03 Optimize resource utilization through shared services](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp03.html)
- [SUS03-BP01 Optimize software and architecture for asynchronous and scheduled jobs](https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sus_sus_software_a2.html)
- [COST09-BP03 Supply resources dynamically](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/cost_manage_demand_resources_dynamic.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
