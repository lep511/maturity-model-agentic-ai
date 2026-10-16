# AGENTSUS03-BP01 Maintain organizational skills and competencies

**Pillar:** Sustainability · **Focus area:** AGENTSUS03 — Agent governance · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS03-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Organizations that automate without deliberately preserving the human expertise behind the automation lose the capacity to train new staff, handle edge cases, and recover when automated systems reach their limits. Keeping a clear distinction between what agents handle autonomously and what stays with human experts sustains organizational capability across the whole lifetime of the deployment.

## Desired outcome

- You have a competency taxonomy that separates human-owned, agent-augmented, and fully automated tasks, with documented criteria for each tier.
- Routing in the agent layer escalates high-stakes, ambiguous, or edge-case decisions to human experts automatically.
- Rotation programs and workshops keep subject matter experts proficient with the workflows agents otherwise execute.
- You monitor escalation rates and expert task distribution to confirm critical competencies stay actively practiced.

## Common anti-patterns

- Automating domain workflows without maintaining documented runbooks or periodic manual execution exercises, reducing the organization's capacity to operate when agent systems are unavailable.
- Running agents without clear boundaries between autonomous action and human oversight, producing cases where agents make high-stakes decisions that should have routed to experts.
- Scaling agent adoption without workforce planning to preserve critical skills, so short-term productivity gains erode long-term organizational capacity.
- Treating escalation as an exception rather than an expected outcome, so the hand-off paths between agents and human experts are undertested and fail when they are needed most.

## Benefits of establishing this best practice

- The organization retains the capacity to operate manually when agent systems are unavailable or encounter situations beyond their training.
- Critical expertise stays available for onboarding, edge cases, and evolving business processes that automation has not caught up to.
- Adoption paces the organization's ability to maintain oversight, rather than outrunning it.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

The threshold question is which competencies must stay with humans and which can move to agents or automation. A three-tier taxonomy, human-owned, agent-augmented, and fully automated, gives teams a shared vocabulary for that decision. The categorization criteria matter more than the labels:

Categorization is reviewed as agent capabilities improve and as organizational priorities shift.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp01.html#implementation-guidance)

### Implementation steps

1. **Define a competency taxonomy:** Categorize organizational skills into human-owned, agent-augmented, and fully automated tiers with documented criteria and a review cadence.
2. **Configure automated escalation:** Use [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) Policies and [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) to route high-stakes, ambiguous, or low-confidence decisions to human experts.
3. **Establish rotation programs:** Assign subject matter experts to handle a defined percentage of cases manually each quarter for competencies critical to business resilience, and maintain runbooks for manual execution.
4. **Validate agent outputs against expert baselines:** Run [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) against baselines produced by subject matter experts to detect drift in categories that have been trusted to automation.
5. **Monitor escalation and task distribution:** Track escalation rates and expert task distribution through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to confirm that critical competencies remain actively practiced.

## Resources

**Related best practices:**

- [AGENTSUS03-BP02 Build agents to mirror your organizational skills and competencies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp02.html)
- [AGENTSUS03-BP03 Maintain comprehensive specifications for agents and agentic systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp03.html)
- [MLPERF06-BP01 Include human-in-the-loop monitoring](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/mlperf-06.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
