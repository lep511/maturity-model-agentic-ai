# AGENTOPS01-BP01 Establish well-defined agent roles, responsibilities, and success criteria

**Pillar:** Operational excellence · **Focus area:** AGENTOPS01 — Operational practices for agentic AI systems · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS01-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

An agent without a documented role can be difficult to evaluate and improve. Provide each agent a clear purpose, scope, autonomy level, and success criteria to change ambiguous behavior into something teams can observe, measure, and hold accountable for.

## Desired outcome

- Every agent has a documented job description specifying role, owned business outcomes, autonomy boundaries, and measurable success criteria.
- Teams can objectively assess whether an agent performs as intended, and stakeholders understand what value each agent delivers.
- Failure handling and escalation procedures are defined before deployment so out-of-scope requests and edge cases are handled predictably.
- Success criteria map to business outcomes (task resolution rate, customer satisfaction) alongside technical metrics.

## Common anti-patterns

- Deploying agents without documented scope boundaries, producing unpredictable behavior when the agent encounters requests outside its intended purpose.
- Defining success criteria using only technical metrics (latency, uptime) without mapping to business outcomes, making it impossible to assess whether the agent delivers value.
- Treating agent role definitions as one-time artifacts rather than living documents that evolve with business requirements.
- Skipping the identification of stakeholders who depend on the agent, so there is no clear owner when behavior needs adjustment.

## Benefits of establishing this best practice

- Documented intent and scope become the foundation for downstream controls. Guardrails, monitoring thresholds, and escalation paths all derive from the agent's stated purpose.
- Measurable success criteria enable data-driven evaluation, giving the team empirical evidence for iterative refinement and investment decisions.
- Out-of-scope requests and edge cases are handled gracefully because failure paths are defined before the agent ships.
- Stakeholders and operators share a common understanding of what the agent is supposed to do and who is accountable for its behavior.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

A written role definition is the simplest control an agent can have, and the one most often skipped. Without it, guardrails get tuned against assumed behavior, monitoring thresholds get set against assumed workloads, and escalation triggers fire against assumed failures. The document should name the agent's primary purpose, the business process it supports, the stakeholders who depend on it, and the outcomes it is accountable for. Keep the document current as requirements evolve.

An agent that observes and reports is a different operational commitment from one that takes autonomous action, and conflating these two roles can become an oversight. The maturity progression from observer to assistant to autonomous to orchestrator to innovator gives stakeholders a common vocabulary for talking about how much agency an agent has and how much human review it still needs. Set the expectation on the right rung of that progression, and the downstream controls follow.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp01.html#implementation-guidance)

### Implementation steps

1. **Create an agent job description template:** Include name and identifier, primary purpose, stakeholder list, autonomy level on the maturity model, success criteria with measurable targets, out-of-scope topics, and escalation procedures.
2. **Complete the job description for each agent:** Engage technical and business stakeholders together to validate scope and success-criteria alignment, and capture sign-off from both.
3. **Define measurable success criteria:** Combine business outcome metrics (task completion rate, escalation rate, user satisfaction) with technical metrics, and apply the SMART framework to each.
4. **Enforce scope at runtime with [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html):** Configure topic restrictions, content filters, and denied topics that reflect the agent's documented boundaries.
5. **Publish agent definitions to [AWS Agent Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html):** Register each agent's capabilities, scope, and metadata so operators and other agents can discover and route work appropriately.
6. **Define failure handling and escalation:** Document graceful degradation paths, confidence-based human escalation triggers, and structured logging requirements for out-of-scope requests.
7. **Establish a quarterly review cadence:** Update job descriptions as business requirements change, and treat them as living operational artifacts owned by a named individual.

## Resources

**Related best practices:**

- [AGENTOPS01-BP02 Design multi-agent handoff procedures with human-in-the-loop escalation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp02.html)
- [AGENTOPS02-BP01 Evolve agent prompts, tool calls, and configurations to reflect evolving business needs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp01.html)
- [AGENTOPS03-BP01 Define an agent lifecycle with clear SME ownership, testing, and governance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp01.html)
- [AGENTPERF01-BP01 Define performance-aligned success criteria for agent workloads](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html)

**Related services:**

- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
- [AWS Agent Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
