# AGENTPERF02-BP03 Optimize agent execution paths for reduced latency

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF02 — Core processing and reasoning pipeline optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF02-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Most of an agent request's total latency time is spent waiting on model inference, retrieval, tool invocations, and memory lookups rather than on CPU work inside the agent process. Executing independent operations concurrently, reusing warm connections and runtimes, and deduplicating repeated lookups within a single request cut total latency without changing models or prompts.

## Desired outcome

- You have independent operations within an agent request executed concurrently sequential execution is reserved for operations with genuine data dependencies.
- You have connections to downstream services, model endpoints, tool APIs, memory stores, vector indexes, pooled and reused across requests rather than reestablished per invocation.
- You have runtime cold starts removed from the critical path or bounded through provisioned capacity, pre-warming, or persistent execution environments.
- You have repeated lookups within a single request resolved from a request-scoped cache, so duplicate work isn't paid twice inside one invocation.

## Common anti-patterns

- Executing independent operations sequentially when they share no data dependencies, making total latency the sum of operation durations rather than the slowest operation.
- Establishing new connections to model endpoints, tool APIs, or data stores on every invocation, paying connection setup and TLS handshake costs on the critical path.
- Running agent code on compute that pays a cold-start penalty on the critical path without provisioned capacity, pre-warming, or a persistent runtime to absorb it.
- Re-executing the same lookup multiple times within a single request, for example, fetching the same knowledge base passage or user profile across consecutive reasoning steps, with no request-scoped cache to deduplicate the work.
- Introducing parallelism without respecting downstream rate limits or connection pool capacity, so concurrent calls throttle or queue and the intended latency win turns into added latency plus failures.

## Benefits of establishing this best practice

- Overlapping independent operations makes the critical path track the slowest operation rather than the sum of every operation.
- Amortizing connection setup and runtime initialization across requests avoids paying those costs on every invocation.
- Parallel calls that respect downstream capacity avoid the throttling and retry storms naive parallelism triggers.
- Overlapping I/O-bound waits, retrievals and tool calls, with compute-bound work such as inference and parsing keeps the agent productive during waits.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Most of an agent request's total latency time is spent waiting, on model inference, retrieval, tool invocations, and memory lookups, rather than on CPU work inside the agent process. The structure of how those waits are composed dominates total latency more than the speed of any single downstream dependency. Four structural decisions typically affect latency:

Each decision is independent of model and prompt choices, so the gains compound with the reasoning-loop and model-selection optimizations addressed elsewhere in this pillar.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp03.html#implementation-guidance)

### Implementation steps

1. **Profile the critical path to identify parallelizable operations:** Trace a representative sample of production requests with the performance telemetry already in place to decompose each invocation into per-operation durations and dependencies. Identify operations that share no data dependency, separate tool calls, independent retrievals, personalization lookups alongside knowledge queries, and flag the sequential segments where concurrency would collapse wall-clock latency onto the slowest operation. Revisit the inventory as prompts and tools change, because dependency graphs shift with them.
2. **Execute independent operations concurrently within downstream capacity limits:** Configure the agent framework to fan out independent tool calls and retrievals in the same reasoning step, Strands Agents, LangGraph, and similar frameworks expose this as a native primitive. Bound concurrency to the downstream service's capacity, [Amazon Bedrock service quotas](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html), tool-API rate limits, and database connection ceilings, so a step that fans out to 10 concurrent calls doesn't trigger throttling that costs more latency than it saves.
3. **Reuse connections to model endpoints and external APIs across invocations:** Configure the HTTP client's connection pool so TLS sessions to Amazon Bedrock and tool APIs persist across invocations rather than being reestablished per request. On runtimes that preserve memory across invocations, [AWS Lambda execution environments](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html), container-based services, and long-running services, initialize the client once per execution environment rather than per invocation so its connection pool survives across calls. A warm invocation should pay zero connection-setup latency on downstream calls.
4. **Pool database connections through a managed connection pool:** For agents that read from or write to relational data, front Aurora and RDS databases with [Amazon RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html) so serverless invocations share a bounded pool of database connections rather than opening a new connection each time. Without a pooler, concurrent agent invocations exhaust the database's connection ceiling and pay per-invocation setup latency on the critical path, both failure modes worsen as parallelism increases.
5. **Remove cold starts from the agent execution runtime:** Select a runtime that keeps the agent's execution environment warm on the critical path. [Amazon Bedrock AgentCore Runtime sessions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-sessions.html) reuse a dedicated microVM across invocations that share a session identifier, preserving in-memory state and avoiding per-invocation cold starts while the session is active. For Lambda-hosted agents, [Lambda provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html) pre-initializes execution environments and [Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html) restores from a cached snapshot on supported runtimes. Always-on container services such as Amazon ECS or Amazon EKS avoid cold starts entirely at the cost of continuous capacity. Choose based on traffic shape rather than runtime preference.
6. **Deduplicate repeated lookups within a single request using a request-scoped cache:** Add an in-memory cache scoped to the lifetime of the request or session that memoizes idempotent lookups, tool responses, retrieved passages, user-profile reads, keyed by input. A reasoning loop that calls the same tool twice or retrieves the same passage across successive steps resolves the second call from the cache, recovering that latency without the consistency complexity of a cross-invocation cache. The cache is discarded at the end of the request, so it can't serve stale data to a subsequent invocation.
7. **Re-measure the critical path after each structural change and as traffic grows:** After applying concurrency, pooling, cold-start, or caching changes, re-profile the critical path under representative production load to confirm the optimization held and did not introduce new failure modes such as throttling or connection-pool saturation. Repeat the measurement as traffic grows, because parallelism bounded correctly at launch frequently exceeds quotas at higher scale and the latency profile silently regresses before an SLO is exceeded.

## Resources

**Related best practices:**

- [AGENTPERF01-BP03 Profile end-to-end agent latency and identify optimization targets](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp03.html)
- [AGENTPERF02-BP02 Implement task-appropriate model selection strategies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp02.html)
- [AGENTPERF02-BP04 Optimize streaming responses and time-to-first-token for agent interactions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp04.html)
- [AGENTPERF03-BP04 Establish efficient agent caching and data access patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp04.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon RDS Proxy](https://aws.amazon.com/rds/proxy/)
