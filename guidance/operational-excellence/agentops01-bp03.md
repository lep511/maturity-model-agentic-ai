# AGENTOPS01-BP03 Develop test scenarios that accurately capture failures of dependent components, orchestration protocols, and business processes

**Pillar:** Operational excellence · **Focus area:** AGENTOPS01 — Operational practices for agentic AI systems · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS01-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Happy-path testing predicts how agents behave when everything works, while failure testing predicts how they behave in the event of unforeseen issues. A resilience posture built on injected failures, deadlock scenarios, and disrupted business processes is the difference between graceful degradation and an unexpected outage.

## Desired outcome

- You have a failure test suite for every agent covering dependent-component failures, orchestration breakdowns, and business-process disruptions.
- You can inject failures into agent workflows on demand and verify that error handling, graceful degradation, and escalation behave as designed.
- You maintain known failure patterns as regression tests that run automatically on every behavioral change.
- You track failure test pass rates over time as a visible resilience metric.

## Common anti-patterns

- Testing only the happy path without validating agent behavior when tools are unavailable, APIs time out, or data sources return errors.
- Running failure tests only in isolated unit environments without simulating multi-agent coordination failures such as deadlocks, message loss, or handoff timeouts.
- Treating failure test scenarios as a one-time exercise rather than a living regression suite that grows with each production incident.
- Skipping tests for business-process disruptions, upstream format changes, delayed approvals, and downstream rejections, so agents fail silently when the real world shifts.

## Benefits of establishing this best practice

- Failure test suites become a stable benchmark for comparing agent resilience across iterations, providing the empirical basis for improvement decisions.
- Standardized testing helps assess every agent change for resilience impact the same way, regardless of who made the change or how urgent the timeline is.
- Known failure patterns captured as regression tests help prevent recurrence of previously diagnosed issues.
- Visible resilience trends give leadership and operators a shared view of whether the agent portfolio is getting more reliable or more fragile.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Failure modes cluster into three categories, and each requires a different testing posture.

Dependent-component failures are the most tractable. Tools return 5xx errors, APIs time out, knowledge bases return empty results, and model inference throttles or degrades. These map cleanly to agent evaluation and synthetic fault injection. [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) provides automated assessment of how agents handle edge cases and failure scenarios, using built-in and custom evaluators to score agent behavior against expected outcomes. For infrastructure-level fault injection such as network latency or capacity exhaustion, [AWS Fault Injection Service](https://aws.amazon.com/fis/) complements agent evaluations by validating that retry policies, fallbacks, and cutoffs behave as documented at the infrastructure layer.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp03.html#implementation-guidance)

### Implementation steps

1. **Catalog known failure modes per agent:** Organize by dependent-component failures, orchestration breakdowns, and business-process disruptions, with a named owner for each category.
2. **Create tests for dependent-component failures:** Simulate tool unavailability, API timeouts, data-source errors, and model inference degradation using [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) dataset evaluations and custom evaluators.
3. **Create tests for orchestration breakdowns:** Cover communication failures, deadlock conditions, handoff errors, and context-package corruption by simulating coordination failures in multi-agent workflows.
4. **Create tests for business-process disruptions:** Simulate upstream process changes, input format changes, and downstream system rejections, and verify graceful failure and meaningful escalation.
5. **Integrate infrastructure fault injection where appropriate:** Use [AWS Fault Injection Service](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html) for infrastructure-level failures (throttling, capacity exhaustion, network latency) that affect agent workflows.
6. **Gate deployments on failure-handling regression:** Make the evaluation suite a mandatory CI/CD stage that blocks promotion when resilience regressions appear.
7. **Maintain evaluation datasets as living regression suites:** Use [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) to track pass rates, and alert on degradation via [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html).
8. **Review and expand scenarios quarterly:** Incorporate failure patterns discovered in production incidents so the suite grows with the system.

## Resources

**Related best practices:**

- [AGENTOPS02-BP01 Evolve agent prompts, tool calls, and configurations to reflect evolving business needs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp01.html)
- [AGENTOPS04-BP03 Develop fallback behavior and error handling for tool invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops04-bp03.html)
- [AGENTOPS06-BP01 Design multi-layered testing frameworks](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp01.html)
- [AGENTPERF01-BP01 Define performance-aligned success criteria for agent workloads](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html)
- [AWS Fault Injection Service](https://aws.amazon.com/fis/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS CodePipeline](https://aws.amazon.com/codepipeline/)
