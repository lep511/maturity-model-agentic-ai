# AGENTREL05-BP02 Facilitate reliable adaptation through evaluation-driven improvement cycles

**Pillar:** Reliability · **Focus area:** AGENTREL05 — Agent cognition · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL05-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents degrade quietly when no one is watching, and runtime self-modification based on noisy feedback makes things worse. Structured feedback collection with offline evaluation and validated deployments keeps adaptation reliable because every change is measured before it reaches users.

## Desired outcome

- You collect action-level, task-level, and session-level feedback signals on every agent interaction.
- You run automated and LLM-as-a-judge evaluations periodically, comparing current behavior against golden-path examples.
- You validate prompt and configuration changes offline before deploying through gradual rollout.

## Common anti-patterns

- Deploying agents without feedback collection, missing the chance to identify systematic errors.
- Applying automated behavioral changes at runtime without offline validation, risking regression from noisy feedback.
- Skipping monitoring of the feedback loop itself, so silent pipeline failures block adaptation from happening.

## Benefits of establishing this best practice

- Task execution quality improves steadily through structured feedback collection and validated adjustments.
- Systematic errors get identified and corrected faster because automated analysis catches patterns humans miss.
- Manual intervention drops because evaluation-driven prompt optimization with controlled rollout replaces manual tuning.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Feedback is only useful at the granularity you collect it. Three tiers cover most of the signal. Action-level captures whether a tool call succeeded, task-level captures whether the agent completed the task correctly, and session-level captures whether the interaction achieved the user's goal. Action-level feedback tends to come from automated validators that compare outputs against expected schemas. Task-level feedback can be automated for deterministic success criteria and needs LLM-as-a-judge for subjective quality dimensions. Session-level feedback usually comes from users, either directly or through behavioral signals like follow-up questions.

[Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) runs the periodic quality assessments against representative task sets, comparing outputs against golden-path examples and flagging regressions. Store evaluation results alongside task records so the agent's performance over time becomes a labeled dataset you can query. When evaluations indicate systematic degradation, that is the signal to trigger an offline prompt optimization workflow, test alternative formulations against evaluation benchmarks and deploy the highest-performing version through gradual rollout.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp02.html#implementation-guidance)

### Implementation steps

1. **Implement multi-tier feedback collection:** Capture action-level, task-level, and session-level signals for every interaction.
2. **Deploy automated outcome validators for deterministic criteria:** Compare outputs against expected schemas where the success criteria are unambiguous.
3. **Use AgentCore Evaluations with LLM-as-a-judge for subjective quality:** Run [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) on a periodic schedule against golden-path examples.
4. **Trigger offline prompt optimization when evaluations show degradation:** Validate candidates against benchmarks offline, then deploy through gradual rollout rather than runtime self-modification.
5. **Monitor feedback loop health:** Track collection rates, processing latency, and evaluation frequency through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) with alarms for pipeline failures.

## Resources

**Related best practices:**

- [AGENTREL02-BP03 Implement behavioral anomaly detection and monitoring](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp03.html)
- [AGENTREL05-BP01 Design modular, fault-tolerant agentic reasoning components](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp01.html)
- [AGENTREL05-BP03 Ground agent cognition in real information](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel05-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
