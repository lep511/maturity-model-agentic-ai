# AGENTOPS06-BP02 Evaluate and track ongoing agent performance

**Pillar:** Operational excellence · **Focus area:** AGENTOPS06 — Testing, evaluation, and validation frameworks · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS06-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Pre-deployment evaluation validates that an agent is ready to ship. Post-deployment evaluation validates that it still works. Without continuous assessment, gradual quality degradation from data drift, model updates, and shifting user patterns goes unnoticed until it is expensive to fix.

## Desired outcome

- Agent performance is continually evaluated against defined quality benchmarks.
- Automated pipelines detect degradation in output quality, reasoning accuracy, and business outcome alignment.
- Teams have clear visibility into performance trends over time and can correlate quality changes with specific configuration, model, or data updates.
- Evaluation results drive prioritized improvement actions and provide objective evidence for stakeholder reporting.

## Common anti-patterns

- Evaluating agent performance only at deployment time without continuous post-deployment assessment, missing gradual degradation from data drift, model updates, or changing user patterns.
- Relying solely on automated metrics without periodic human evaluation, missing quality dimensions that automated metrics can't fully capture (like nuance, appropriateness, and business context alignment).
- Using generic evaluation criteria across all agents without tailoring metrics to each agent's specific use case and business objectives, producing evaluation results that don't reflect actual value.
- Treating evaluation as separate from operations rather than integrating it into the operational workflow, creating evaluation debt that accumulates over time.

## Benefits of establishing this best practice

- Continuous evaluation provides an empirical foundation for evidence-based improvement, identifying which agents need attention and which changes produce measurable gains.
- Performance trend tracking reveals patterns that inform systematic improvement, turning evaluation data into practical insights.
- Multi-dimensional scoring catches quality issues that a single metric would miss.
- Correlation between quality shifts and configuration changes compresses root-cause analysis.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

[Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) is an evaluation service for continuous assessment. Its on-demand mode runs benchmarks during development, and its online mode samples and evaluates live interactions in production without requiring manual triggers. Thirteen built-in evaluators cover correctness, helpfulness, safety, and tool selection accuracy, with custom evaluators available for business-specific requirements. [Amazon Bedrock Evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html) supplements this with model-level assessment, and periodic human evaluation covers the dimensions automated metrics miss.

Evaluation frameworks need multiple dimensions because a single metric misses too much. For example:

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp02.html#implementation-guidance)

### Implementation steps

1. **Configure [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html):** Use on-demand mode for development benchmarking and online mode for continuous production monitoring.
2. **Define a multi-dimensional evaluation framework:** Apply use-case-specific weighting across quality, safety, efficiency, and business alignment.
3. **Implement LLM-as-judge patterns:** Use multiple evaluator prompts and supplement with periodic human evaluation.
4. **Build evaluation dashboards:** Show trends over time with alerting for threshold violations and persistent negative trends.
5. **Correlate evaluation results with change events:** Tag deployments, configuration updates, and model changes so quality shifts can be attributed quickly.

## Resources

**Related best practices:**

- [AGENTOPS06-BP01 Design multi-layered testing frameworks](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp01.html)
- [AGENTOPS06-BP03 Establish SME-driven validation and business approval workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp03.html)
- [AGENTOPS02-BP04 Maintain feedback control loops for continuous improvement](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp04.html)
- [AGENTOPS05-BP04 Define and track KPIs for agent workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp04.html)
- [AGENTPERF01-BP01 Define performance-aligned success criteria for agent workloads](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
