# AGENTPERF03-BP02 Optimize context window utilization and prompt management

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF03 — Memory, context, and RAG optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF03-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Every token sent to an LLM competes for the model's attention, consumes input-token cost, and adds inference latency, which makes prompt content a first-order performance lever. Effective context window management budgets tokens across prompt components, assembles only what the current task needs, and compresses or summarizes the rest. Without this discipline, conversation history and tool schemas crowd out reasoning capacity and inflate latency on every iteration.

## Desired outcome

- You have an explicit token budget allocated across prompt components, system instructions, conversation history, retrieved knowledge, and tool schemas, with per-component token usage measured on every request.
- You have context assembled dynamically per request, including only the tool definitions, retrieved passages, and conversation context relevant to the current task rather than a fixed maximal payload.
- You have conversation history bounded by summarization, sliding windows, or semantic compression so prompt size doesn't grow linearly with session length.
- You have prompt templates versioned and evaluated so changes to wording, ordering, or component composition are measured against quality and token-cost baselines before rollout.

## Common anti-patterns

- Including the full conversation history in every prompt without summarization or truncation, causing prompt size and inference latency to grow linearly with session length.
- Injecting the full tool catalog in every prompt regardless of task relevance, spending context budget on schemas the agent will not invoke for the current request.
- Passing RAG retrievals straight into the prompt without per-passage filtering or truncation, so low-relevance chunks displace more useful context.
- Treating the prompt as a single opaque string rather than a composition of components, making it impossible to attribute token consumption to system instructions, history, retrievals, or tool schemas.
- Shipping prompt changes without versioning or side-by-side evaluation, so quality or token-cost regressions are detected only after rollout.

## Benefits of establishing this best practice

- Removing tokens from the prompt can reduce request cost and shorten time-to-first-token on each iteration.
- Pruned, high-density context leaves more of the model's effective attention on the current task instead of parsing stale history or unused tool schemas.
- Summarization and sliding-window strategies decouple prompt size from conversation length, keeping per-turn latency and cost stable.
- Stable, component-structured prompts with invariant prefixes compose with prompt caching, turning a large portion of input tokens into cached reads at a fraction of standard input cost.
- Versioned templates with evaluation gates let prompt changes ship with quality and cost evidence rather than by guess.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Prompts behave as compositions of discrete components, system instructions, tool schemas, retrieved knowledge, conversation history, and the current user turn. Treating them as a single opaque string makes runaway growth impossible to attribute. Per-component token attribution on every request demystifies issues, such as a tool catalog that doubled when a new tool was registered. Component-level budgets that sum to the workload's input-length target make the trade-offs explicit: more budget for retrievals means less for history, and every reallocation becomes a deliberate decision.

The [Amazon Bedrock prompt design guidance](https://docs.aws.amazon.com/bedrock/latest/userguide/design-a-prompt.html) describes how clear instructions, output indicators, and question placement at the end of the prompt shape the system-instruction and user-turn components individually.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp02.html#implementation-guidance)

### Implementation steps

1. **Define the prompt component taxonomy and per-component token budget:** Decompose every prompt into a fixed set of components, system instructions, tool schemas, retrieved knowledge, conversation history, and the current user turn, and allocate a token budget to each that sums to the input-length target derived from the workload's latency and cost SLO. Apply the [Amazon Bedrock prompt design guidance](https://docs.aws.amazon.com/bedrock/latest/userguide/design-a-prompt.html) to keep the system-instruction component clear, concise, and consistent with the user query placed at the end of the prompt.
2. **Instrument per-component token usage on every request:** Emit token counts for each component as structured logs or CloudWatch metrics alongside the inputTokens and outputTokens returned by the [Amazon Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html), dimensioned by agent ID and task type. Include cacheReadInputTokens and cacheWriteInputTokens from the Converse response so cache effectiveness is measured alongside component growth, and alert when any component trends outside its budget before it impacts the end-to-end SLO.
3. **Assemble tool schemas dynamically with just-in-time selection:** Replace full-catalog injection with task-relevant selection so the prompt carries only the tools the agent might invoke for the current turn. For agents using [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-advanced-performance.html), enable semantic search by setting "searchType": "SEMANTIC" on the mcp protocol in the gateway's protocolConfiguration so tool retrieval narrows on user intent. Keep each tool's schema compact with clear parameter descriptions and required fields to reduce its per-invocation token weight.
4. **Bound conversation history with summarization and a sliding window:** Cap raw-turn retention and replace older turns with a running summary after the session exceeds a threshold expressed in turns or tokens. Configure the [SummaryMemoryStrategy in Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/long-term-configuring-built-in-strategies.html#long-term-session-summaries-strategy) with a namespaceTemplates entry such as /summaries/{actorId}/{sessionId}/ and inject the summary rather than the raw transcript into the prompt, paired with a small sliding window of recent turns to preserve near-term conversational detail.
5. **Filter and truncate retrieved passages before prompt assembly:** Apply a relevance threshold, a per-passage token cap, and a total retrieval budget so low-signal chunks can't displace higher-signal context. Rank passages by relevance score, drop any below the threshold, and truncate long passages to the per-passage cap before composing the retrieved-knowledge component.
6. **Structure prompts so they compose with prompt caching:** Order every prompt so invariant content (system instructions, stable tool definitions, pinned reference material) appears before variant content (user turn, per-request retrievals), then place [Amazon Bedrock prompt cache checkpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) in the system, tools, and messages fields at the boundary between static and dynamic content. For long-running or intermittent sessions on supported Claude models, set "ttl": "1h" on the cachePoint to extend the cache window beyond the 5-minute default, keeping the 1-hour entry ahead of any 5-minute entries in the same request.
7. **Version prompts and gate changes on evaluation:** Store prompts as versioned artifacts in [Amazon Bedrock Prompt management](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-create.html) with variables for dynamic inputs and inference configuration tied to the version, then use [Create version](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-version-create.html) to snapshot known-good drafts. Use the side-by-side variant comparison in the prompt builder to evaluate candidates against each other, and promote a new version only after it clears quality and token-cost baselines on a representative test set.
8. **Generate model-tuned rewrites with prompt optimization:** Run candidate prompts through [Amazon Bedrock Prompt Optimization](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-optimize.html) to produce model-specific rewrites, passing the target model through targetModelId when using the OptimizePrompt API. Treat the optimized output as a candidate variant rather than a drop-in replacement, and compare it against the original on the same evaluation set so token-count reductions are weighed against any quality impact before promotion.

## Resources

**Related best practices:**

- [AGENTPERF03-BP01 Implement tiered memory management systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp01.html)
- [AGENTPERF03-BP03 Optimize RAG retrieval pipelines for latency and precision](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp03.html)
- [AGENTPERF03-BP04 Establish efficient agent caching and data access patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf03-bp04.html)
- [AGENTPERF06-BP01 Design optimized tool integration strategies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf06-bp01.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
