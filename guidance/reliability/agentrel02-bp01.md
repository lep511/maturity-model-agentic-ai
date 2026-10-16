# AGENTREL02-BP01 Design agents for specific and atomic tasks

**Pillar:** Reliability · **Focus area:** AGENTREL02 — Predictable task execution · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL02-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

LLM outputs are stochastic, so the scope of an agent's responsibility is also the scope of that stochasticity. Narrow, atomic agents with explicit input contracts and structured output schemas make the unpredictable parts of the model more observable, testable, and containable.

## Desired outcome

- You have each agent scoped to one atomic function with explicit input validation and a structured output schema.
- Your agents are tested with deterministic, representative inputs before deployment.
- You track per-agent quality metrics (schema compliance rate and task completion rate) so regressions appear before users see them.

## Common anti-patterns

- Building multi-purpose agents that combine disparate functions, widening the surface area for unpredictable model behavior.
- Skipping explicit input contracts and output schemas, allowing ambiguous data flows that amplify LLM stochasticity.
- Treating agents as general-purpose processors without discrete responsibilities, making issue reproduction hard.

## Benefits of establishing this best practice

- Constrained scope shrinks the surface for unpredictable behavior.
- Composable units can be independently validated with deterministic test cases.
- Clear operational boundaries speed up issue identification and remediation.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Atomic design starts with the prompt. A single, well-defined system prompt that describes exactly one capability is the easiest constraint to enforce and the hardest to violate silently. Pair it with explicit input validation that rejects out-of-scope requests before the LLM is invoked, and a structured output schema that constrains the response format. Amazon Bedrock's tool use (function calling) limits the model's action space to operations relevant to the agent's function. Amazon Bedrock's [structured output](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html) feature enforces JSON schema compliance at the model level to reduce output validation failures.

Deployment reinforces the atomic boundary. Each agent runs on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) with its own execution context and dedicated tool permissions, so a misconfigured or compromised agent can't reach beyond its scope. This gives you a physical boundary that matches the logical one you defined in the prompt.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp01.html#implementation-guidance)

### Implementation steps

1. **Decompose workflows into atomic agents:** Give each agent a single system prompt, a constrained tool set, and explicit input/output schemas.
2. **Deploy on AgentCore Runtime with structured output enforcement:** Run each agent on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) with dedicated tool permissions and [Bedrock structured output](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html) enforcement.
3. **Implement input validation that rejects out-of-scope requests:** Validate inputs before the LLM is called so malformed or out-of-scope requests don't reach the model.
4. **Validate behavior with AgentCore Evaluations:** Use [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) with representative inputs and golden-path test cases, asserting semantic correctness rather than exact strings.
5. **Monitor per-agent quality metrics:** Track schema compliance rate and task completion rate through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) with alarms for baseline deviations.

## Resources

**Related best practices:**

- [AGENTREL01-BP03 Design specialized agents following actor model principles](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp03.html)
- [AGENTREL02-BP02 Limit agent permissions to minimum required access](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp02.html)
- [AGENTREL02-BP03 Implement behavioral anomaly detection and monitoring](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp03.html)
- [AGENTREL02-BP04 Develop clear instruction protocols for agents](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp04.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
