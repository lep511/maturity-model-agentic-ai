# AGENTCOST01-BP04 Design agent hierarchies and delegation patterns that reduce coordination overhead

**Pillar:** Cost optimization · **Focus area:** AGENTCOST01 — Reasoning and execution cost optimization · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST01-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Supervisor cost in agent hierarchies grows with the verbosity of capability descriptions and the frequency of check-ins. Compact manifests and autonomous workers keep coordination cost proportional to workflow complexity rather than step count.

## Desired outcome

- Your agent hierarchies use the shallowest orchestration structure capable of managing the workflow.
- You have supervisor agents operating on compressed capability manifests that minimize input tokens per routing decision.
- Your worker agents complete multi-step sub-tasks autonomously, escalating to supervisors only for task assignment and result validation.
- You track orchestrator cost as a distinct category with a target supervisor-to-worker cost ratio.

## Common anti-patterns

- Including verbose natural-language descriptions of every worker's capabilities in routing prompts, which inflates token cost that then scales linearly with worker count.
- Requiring supervisor check-ins after each sub-step, which multiplies coordination overhead when workers could complete multi-step work autonomously.
- Tracking only aggregate workflow cost without decomposing orchestrator compared to worker expense, so disproportionate coordination overhead hides in the total.

## Benefits of establishing this best practice

- Compressed capability manifests reduce supervisor input-token cost per routing decision.
- Autonomous workers remove supervisor round-trips for intermediate decisions.
- Per-tier cost attribution surfaces optimization opportunities where coordination overhead exceeds execution value.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Supervisor cost has two main drivers: how expensive each routing decision is and how many times routing happens.

The first is controlled by manifest size. Supervisors that describe workers in paragraphs of natural language pay for those paragraphs on every routing call, and that cost scales linearly with worker count. Short, structured capability manifests (description, input schema, output schema, under 200 tokens each) cut this cost without sacrificing routing quality, because the supervisor doesn't need prose to choose between workers that have distinct schemas.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp04.html#implementation-guidance)

### Implementation steps

1. **Compress worker capability descriptions:** Replace natural-language capability descriptions with structured manifests (description, input schema, output schema) under 200 tokens each, and use [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) runtime tool discovery to avoid listing tools in the supervisor prompt.
2. **Redesign workers for autonomous multi-step completion:** Give each worker sufficient tool autonomy and clear success criteria to complete its sub-task end-to-end, and require the worker to emit a confidence score in every response so the supervisor can make accept-or-reject decisions without re-reasoning.
3. **Apply policy and shared memory for direct context access:** Configure [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) through Gateway to enforce worker tool-access boundaries, and provision [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) so workers read shared context directly instead of receiving it relayed through the supervisor.
4. **Track supervisor-to-worker cost ratio:** Configure [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to attribute tokens per tier, build Amazon CloudWatch dashboards showing the supervisor-to-worker ratio per workflow, and alert when the ratio exceeds a 15% target.

## Resources

**Related best practices:**

- [AGENTCOST01-BP02 Optimize multi-agent collaboration cost through efficient handoff patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp02.html)
- [AGENTCOST01-BP03 Implement cost-effective patterns like hybrid supervisor for multi-agent coordination](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp03.html)
- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)
- [AGENTCOST05-BP02 Implement distributed cost tracing for multi-agent workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp02.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
