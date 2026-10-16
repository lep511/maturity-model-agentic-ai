# AGENTREL07-BP01 Design workflows in stages with incremental recovery

**Pillar:** Reliability · **Focus area:** AGENTREL07 — Agent monitoring, management and recovery · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL07-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Monolithic workflows lose everything on a single failure. Explicit stage boundaries with persisted outputs contain failures to the affected stage and let recovery start from the last completed checkpoint rather than the beginning.

## Desired outcome

- You have workflows decomposed into discrete stages at natural checkpoints where completed work has independent value.
- You persist stage outputs durably so recovery resumes from the last completed stage.
- You validate stage outputs before advancing so errors don't propagate silently through subsequent stages.

## Common anti-patterns

- Running workflows as monolithic processes without stage boundaries, so any failure forces a complete restart.
- Defining stages at too coarse a granularity, losing large amounts of work within a stage when it fails.
- Skipping stage output validation, allowing errors to propagate through subsequent stages.

## Benefits of establishing this best practice

- Work loss stays minimal because recovery resumes from the last completed stage.
- Recovery is faster because redundant recomputation of completed stages is avoided.
- Stage boundaries contain failures, improving error isolation.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

[AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html) persists execution state at every state transition and enables recovery from the last completed step rather than restarting entirely. The built-in retry with exponential backoff handles transient errors within a step, and the redrive capability restarts the workflow from the point of failure without re-executing completed steps. This combination, persistence plus selective retry plus redrive, is what gives incremental recovery its teeth. [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html) provides the execution surface for individual agent steps within the workflow.

Place stage boundaries where completed work has independent value. A parsed document, a validated query, and a retrieved and summarized context are all natural boundaries. If a stage produces a half-built artifact that is useless on its own, the boundary is in the wrong place.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp01.html#implementation-guidance)

### Implementation steps

1. **Decompose workflows into discrete stages:** Place boundaries at natural checkpoints where completed work has independent value.
2. **Implement with Step Functions for durable state:** Use [AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html) with built-in retry and exponential backoff per step.
3. **Configure redrive for recovery from the point of failure:** Restart failed workflows without re-executing completed steps.
4. **Implement stage output validation:** Check schema conformance and quality thresholds between stages so errors don't propagate.
5. **Configure stage-level timeouts with recovery paths:** Handle stages that fail after exhausting retries.
6. **Monitor stage-level metrics:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to find stages that need optimization.

## Resources

**Related best practices:**

- [AGENTREL03-BP03 Implement comprehensive state management and checkpoint-based recovery](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp03.html)
- [AGENTREL07-BP02 Enable automatic recovery from agent execution failures](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp02.html)
- [AGENTREL07-BP03 Implement distributed tracing to track system dependencies and facilitate recovery](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp03.html)

**Related services:**

- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
