# AGENTSUS03-BP02 Build agents to mirror your organizational skills and competencies

**Pillar:** Sustainability · **Focus area:** AGENTSUS03 — Agent governance · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS03-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents built to codify proven workflows deliver immediate value. Agents built to automate processes the organization has not mastered itself usually waste resources learning what could have been documented first. Focusing automation on well-understood work is the difference between agent adoption that pays back quickly and adoption that consumes resources on untested methodology.

## Desired outcome

- You select processes for automation where steps, decision criteria, and success metrics are documented and consistently executed by human experts.
- Agents mirror the decision trees, validation checkpoints, and escalation paths that experts already use.
- Institutional knowledge is captured in knowledge bases that ground agent decisions, rather than relying solely on foundation model training data.
- Readiness criteria, minimum documentation maturity, gate agent development projects before resources are committed.

## Common anti-patterns

- Building agents to automate unfamiliar or poorly understood processes where steps, decision criteria, and success metrics are not documented, so the automation becomes an experiment rather than a productivity gain.
- Skipping the step of codifying expert practices before writing agent logic, missing the opportunity to replicate proven approaches.
- Generating agent code without understanding it, producing implementations the team can't maintain or evolve and accumulating technical debt.
- Automating processes that vary widely in execution across experts, so the agent picks one variant and discovers at runtime that the choice did not match the business context.

## Benefits of establishing this best practice

- Agent automation starts from proven practice, so the automation runs correctly at deployment instead of being debugged in production.
- Human expertise remains the source of truth and is amplified rather than replaced, preserving adaptation capacity.
- Development resources flow to workflows where ROI is defensible, rather than being spent on speculative automation.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The criterion for a good automation candidate is straightforward. The process is well understood, the steps are documented, the decision criteria are explicit, and multiple experts execute it the same way. Processes that fail that test should not be the first things an organization automates. The agent will replicate whichever variant the documentation captures, and if the documentation captures the wrong variant, every agent invocation reinforces the error. The documentation exercise itself is the first return on investment. Writing down what experts do encourages consistency even before any agent is built.

Once the documentation exists, the agent is a translation of it. You configure Amazon Bedrock AgentCore agents to follow the same decision trees, validation checkpoints, and escalation paths as human experts. This gives the automation the same runtime behavior as the manual process. [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) holds the documented expertise as a RAG source, which grounds agent decisions in institutional knowledge rather than leaving them to foundation model training data. [Amazon Bedrock AgentCore tools](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/tools.html) mirror the external systems experts use (the same APIs, the same data sources, and the same validation services), so the agent's view of the task matches the expert's.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp02.html#implementation-guidance)

### Implementation steps

1. **Document workflows before automating them:** Capture the following from subject matter experts before approving agent development:
2. **Store institutional knowledge as RAG sources:** Load documented expertise into [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) so agent decisions ground in the organization's knowledge rather than foundation model defaults.
3. **Mirror expert system access:** Configure [Amazon Bedrock AgentCore tools](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/tools.html) to give agents the same external systems and data sources human experts use.
4. **Route routine vs. complex work:** Use [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) to send routine tasks to full automation and escalate complex or ambiguous work to human experts.
5. **Validate behavior against expert baselines:** Run [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) against expert-generated baselines and monitor drift through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html).

## Resources

**Related best practices:**

- [AGENTSUS03-BP01 Maintain organizational skills and competencies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp01.html)
- [AGENTSUS03-BP03 Maintain comprehensive specifications for agents and agentic systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp03.html)
- [OPS08-BP01 Use runbooks to perform procedures](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/ops_ready_to_support_use_runbooks.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
