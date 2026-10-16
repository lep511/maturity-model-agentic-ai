# AGENTOPS02-BP04 Maintain feedback control loops for continuous improvement

**Pillar:** Operational excellence · **Focus area:** AGENTOPS02 — Prompt and configuration lifecycle management · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS02-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents that improve in step with real-world usage outperform agents frozen at deployment. A working feedback loop connects quality signals, user feedback, behavioral cues, and business outcomes to prioritized improvement actions.

## Desired outcome

- You collect and correlate agent performance data, user feedback, and business outcome metrics systematically, not through ad-hoc surveys.
- Feedback loops operate continually, detecting quality trends in near real time rather than through quarterly reviews.
- Improvement actions are tracked from identification through implementation and validation.
- Feedback signals are attributable to specific agent versions, so teams know which improvements are responding to which problems.

## Common anti-patterns

- Collecting user feedback (like thumbs up and down or ratings) without connecting it to specific agent behaviors or prompt versions, making it impossible to attribute quality changes to improvements.
- Relying solely on periodic manual reviews rather than continuous automated feedback processing, allowing quality degradation to persist for weeks before detection.
- Collecting feedback data without a defined process for turning insights into improvement actions, creating a growing backlog of signals that never translate into agent changes.
- Mixing signal types into a single bucket, so a surge in automated quality alerts drowns out a handful of high-severity user reports that deserve immediate attention.

## Benefits of establishing this best practice

- Structured feedback turns operational data into a continuous source of improvement signals, so agents evolve in response to real usage rather than staying static after deployment.
- Feedback-driven prioritization directs development effort toward changes with the greatest measurable impact.
- Trend tracking over time reveals patterns (data drift, concept drift, and scope drift) that inform targeted refinement rather than scattershot tweaking.
- Improvement validation gives the team evidence that each change delivered the expected gain.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Feedback loops should watch more than one signal to be truly useful.

Automated quality metrics from [Amazon Bedrock Evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html) and [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) show measurable shifts in output quality.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp04.html#implementation-guidance)

### Implementation steps

1. **Implement multi-channel feedback collection:** Cover automated quality metrics (through [Amazon Bedrock Evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html) and [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html)), explicit user feedback, implicit behavioral signals, and business outcome metrics.
2. **Classify feedback at ingestion:** Categorize by type (quality issue, capability gap, tool failure, behavioral misalignment), severity, and affected component.
3. **Store processed feedback for trend analysis:** Use [Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html) indexed by agent, feedback type, and time period.
4. **Route by severity:** Send high-severity feedback to immediate review queues through [Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html). Aggregate lower-severity items for batch review.
5. **Track improvements end to end:** Build a workflow that moves each item from identification through root-cause analysis, implementation, and validation, with metrics compared before and after.
6. **Build visibility into trends and outcomes:** Create dashboards that show feedback trends, improvement outcomes, and quality trajectory over time.

## Resources

**Related best practices:**

- [AGENTOPS02-BP01 Evolve agent prompts, tool calls, and configurations to reflect evolving business needs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp01.html)
- [AGENTOPS05-BP02 Monitor agent behavior patterns and detect anomalies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp02.html)
- [AGENTPERF01-BP01 Define performance-aligned success criteria for agent workloads](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
