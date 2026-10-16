# AGENTCOST02-BP02 Cost optimize token consumption through efficient prompt engineering

**Pillar:** Cost optimization · **Focus area:** AGENTCOST02 — Model invocation and token cost optimization · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST02-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Every token in a system prompt is paid for on every invocation, so prompt bloat compounds linearly with traffic. Compressing system prompts, tool descriptions, and output formats makes the fixed cost of each agent call proportional to the decision it has to make, not the verbosity of its instructions.

## Desired outcome

- You have agent system prompts compressed to the minimum tokens needed for accurate task completion.
- You have tool descriptions presented dynamically based on the current task rather than transmitted in full on every call.
- You constrain output length explicitly so verbose responses don't compound across multi-turn reasoning.
- You version prompts and track cost-per-task per version so efficiency changes are measurable over time.

## Common anti-patterns

- Writing verbose system prompts with lengthy persona descriptions and redundant explanations, inflating the fixed token cost on every invocation.
- Including every tool description in every invocation regardless of task relevance, which inflates input tokens when only a subset of tools applies.
- Allowing unconstrained output length without formatting directives, enabling verbose responses that compound across multi-turn reasoning cycles.
- Treating prompts as uncontrolled strings rather than versioned artifacts, so regressions in token efficiency go unnoticed until a billing review.

## Benefits of establishing this best practice

- Fixed-cost reductions from prompt compression compound across every agent invocation in high-volume deployments.
- Dynamic tool loading transmits only task-relevant tools, reducing tool description overhead in proportion to catalog size.
- Prompt versioning with token tracking makes compression an ongoing, measurable practice rather than a one-off cleanup.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The system prompt is the largest fixed cost in every model invocation, which means every unnecessary sentence is paid for again each time the agent is called. Start by auditing prompts with [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to measure token footprints, then compress systematically. Replace verbose instructions with structured directives, tighten role definitions, and remove redundant explanations.

Tool descriptions behave the same way. If the prompt carries the full tool catalog even when only three tools are relevant, you are paying for the rest of the catalog on every call. [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) uses MCP-based Semantic Tool Selection to present only the tools relevant to the current intent, and [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) manages conversation state across multi-turn sessions so you don't pay for manual history concatenation.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp02.html#implementation-guidance)

### Implementation steps

1. **Audit and compress system prompts:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to measure token footprints for every prompt, then apply compression to minimize prompt size while maintaining decision accuracy.
2. **Present tools dynamically through Gateway:** Use [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) Semantic Tool Selection to present only relevant tools per invocation, and compress tool descriptions to tool name, one-sentence description, and concise parameter schema.
3. **Constrain output length:** Add explicit output formatting directives to the system prompt and configure model-specific token limit parameters to enforce hard caps on response size.
4. **Use managed memory for multi-turn context:** Configure [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) so conversation state is maintained automatically instead of re-transmitted as full history.
5. **Reduce few-shot example overhead:** Evaluate whether each agent task needs examples at all, then reduce to the minimum effective count of two to three. Load examples dynamically from an Amazon S3-hosted library using semantic similarity retrieval.
6. **Version prompts and track efficiency:** Record token count and task success rate per prompt version, and establish a monthly optimization review cadence that tracks cumulative savings against cost-per-task targets.

## Resources

**Related best practices:**

- [AGENTCOST01-BP01 Use the reflection pattern to design efficient agent reasoning loops](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp01.html)
- [AGENTCOST02-BP01 Architect tiered model selection for cost-performance optimization](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html)
- [AGENTCOST02-BP03 Use intelligent caching to reduce redundant model invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
