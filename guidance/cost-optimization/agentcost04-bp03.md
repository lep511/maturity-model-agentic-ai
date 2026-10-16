# AGENTCOST04-BP03 Implement intelligent caching and failure handling for tool results

**Pillar:** Cost optimization · **Focus area:** AGENTCOST04 — Agent tool serving cost optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST04-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Tool costs can be unpredictable when agents repeat identical or equivalent calls, and they can spike sharply when retries run unbounded through a service outage. Two-layer caching, schema validation, and automatic cutoffs convert those failure modes into predictable, bounded costs.

## Desired outcome

- You have session-scoped and cross-session semantic caches reducing redundant tool invocations.
- You validate tool inputs against JSON Schema before invocation to help prevent wasted calls on malformed requests.
- You have automatic cutoffs that halt retries when failure rates exceed thresholds, with automatic fallback to alternative tools.
- You track cache hit rates and retry costs as distinct metrics.

## Common anti-patterns

- Not caching frequently used tool results, making repeated identical calls within the same session that waste compute and external API costs.
- Using only exact-match caching when agents phrase the same request differently, missing cache hits for semantically identical calls.
- Retrying failed tool invocations indefinitely without automatic cutoffs, multiplying cost during service degradation without resolving the underlying issue.
- Not validating tool input schemas before invocation, allowing malformed calls to waste invocation cost without producing usable results.

## Benefits of establishing this best practice

- Two-layer caching reduces redundant tool invocations and external API charges.
- Automatic cutoffs halt retries when failure rates exceed thresholds, helping prevent expensive retry storms.
- Event-driven cache invalidation supports aggressive caching of volatile data by purging stale results promptly when source data changes.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Tool caching has to work at two scopes to cover both obvious and non-obvious repetition. The session-scoped layer works through [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) and catches duplicate calls within a single agent session, which is a common failure mode when agents revisit a reasoning branch. The cross-session layer uses [Amazon OpenSearch Service Serverless](https://aws.amazon.com/opensearch-service/features/serverless/) for semantic caching: generate embeddings of tool parameters and query for similar prior calls above a cosine similarity threshold before invoking the tool. Each cache entry's TTL should be calibrated to the underlying data's volatility. For example, a weather API's freshness requirement is minutes, while a static reference knowledge base tolerates hours or days.

Schema validation can help prevent waste. Agents sometimes generate tool calls with incorrect parameter types, missing required fields, or invalid enum values, and those calls pay tool-serving and external API costs for a response that can't be used. JSON schema validation in the action group Lambda function rejects malformed requests before they reach external APIs and returns a validation error to the agent for correction.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp03.html#implementation-guidance)

### Implementation steps

1. **Deploy two-layer caching:** Implement a session-scoped in-process cache on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) and an [Amazon OpenSearch Service Serverless](https://aws.amazon.com/opensearch-service/features/serverless/) semantic cache for cross-session reuse, with TTLs calibrated per tool (short for volatile data, long for static reference data).
2. **Deploy semantic caching:** Generate parameter embeddings and query OpenSearch Serverless for similar prior calls above a cosine similarity threshold before invoking the tool.
3. **Validate tool inputs:** Implement JSON Schema validation in action group Lambda functions to reject malformed requests before they reach external APIs, returning validation errors for the agent to correct.
4. **Enforce cutoffs and fallback tools:** Configure [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) Cedar policies for automatic cutoffs, wire automatic fallback to alternative tools when cutoffs activate, and set retry budgets per reasoning session.
5. **Monitor cache and retry metrics:** Create Amazon CloudWatch metrics for cache hit rates, cutoff transitions, and retry costs using [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html), with alarms for degraded performance.

## Resources

**Related best practices:**

- [AGENTCOST02-BP03 Use intelligent caching to reduce redundant model invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html)
- [AGENTCOST04-BP01 Design cost effective tool selection to minimize unnecessary invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp01.html)
- [AGENTCOST04-BP02 Cost optimize tool serving through serverless and resource sharing](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost04-bp02.html)
- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
