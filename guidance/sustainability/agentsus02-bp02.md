# AGENTSUS02-BP02 Establish efficient agent caching strategies

**Pillar:** Sustainability · **Focus area:** AGENTSUS02 — Resource right-sizing · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS02-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Every duplicate model call, tool invocation, and memory lookup is work the agent fleet has already done once. Caching at each integration point turns repeated work into a one-time cost amortized across every caller, so resource efficiency improves as usage patterns stabilize rather than scaling linearly with traffic.

## Desired outcome

- You have caching applied at each integration point, prompt prefixes, tool results, memory lookups, and credential validation, with TTLs matched to data volatility.
- Cache layers are shared across the agent fleet so one agent's cached result benefits every other agent.
- Cache hit rates are tracked per integration point and improve as usage patterns stabilize.
- Invalidation policies help prevent stale responses where data volatility demands freshness.

## Common anti-patterns

- Making repeated calls to the same foundation model with the same stable prompt prefix instead of caching it, paying to reprocess the same tokens on every invocation.
- Caching tool results and model responses without invalidation or TTL policies, producing stale answers that appear fresh.
- Running caches isolated to each agent that don't share across the fleet, so each agent has to re-warm its own cache rather than benefiting from cached results elsewhere.
- Skipping cache instrumentation, so nobody knows which integration points have low hit rates and would benefit from a different caching strategy.

## Benefits of establishing this best practice

- Redundant processing, API calls, and network traffic are reduced at each integration point, so infrastructure cost grows sublinearly with agent usage.
- Shared cache layers mean adding agents to the fleet increases cache hit rate rather than cache pressure.
- Resource efficiency compounds over time as cache hit rates climb toward their steady-state maximum.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The sustainability view of prompt caching adds one additional consideration to this lens' existing performance and cost perspectives. The value of caching isn't just latency or cost for each call. It's cumulative compute and energy footprint across the lifetime of the fleet, and the way caching is shared determines how that cumulative footprint grows.

Caches isolated to each agent don't compound. If five agents each maintain their own cache, the fleet warms five caches instead of one, and cross-agent hits never happen. Shared cache layers exposed through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) MCP server capabilities reverse this. Every agent reads from and writes to the same cache tier, so one agent's tool result becomes the next agent's cache hit. The same principle applies at the authentication layer. [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) caches tokens so credential validation happens once per session across the fleet rather than once for each agent.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp02.html#implementation-guidance)

### Implementation steps

1. **Enable prompt caching for stable prefixes:** Turn on [Amazon Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) for stable system prompts following the patterns in [AGENTPERF03-BP04 Establish efficient agent caching and data access patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp04.html) and [AGENTCOST02-BP03 Leverage intelligent caching to reduce redundant model invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html).
2. **Share cache layers across the fleet:** Expose tool result and semantic caches through [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) MCP server capabilities so every agent reads from and writes to the same store.
3. **Cache credential validation:** Use [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) to cache tokens so authentication overhead happens once per session rather than once per agent invocation.
4. **Set TTLs based on data volatility:** Pick invalidation policies calibrated to how often the underlying data actually changes, shorter for live operational data, longer for stable reference material.
5. **Monitor and refine hit rates:** Track cache hit rates per integration point through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) and adjust strategies where hit rates are below expectations.

## Resources

**Related best practices:**

- [AGENTPERF03-BP04 Establish efficient agent caching and data access patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp04.html)
- [AGENTCOST02-BP03 Leverage intelligent caching to reduce redundant model invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html)
- [AGENTSUS02-BP01 Optimize context management and memory utilization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus02-bp01.html)
- [SUS03-BP03 Optimize areas of code that consume the most time or resources](https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sus_sus_software_a4.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
