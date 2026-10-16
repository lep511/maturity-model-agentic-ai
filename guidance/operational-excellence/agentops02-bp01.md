# AGENTOPS02-BP01 Evolve agent prompts, tool calls, and configurations to reflect evolving business needs

**Pillar:** Operational excellence · **Focus area:** AGENTOPS02 — Prompt and configuration lifecycle management · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS02-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

A prompt shapes agent behavior more directly than almost any other configuration artifact. Create a prompt lifecycle that applies code-grade discipline, versioning, review, evaluation, and rollback to prompts, which helps avoid unnoticed prompt drift and degraded decisions in agent interactions.

## Desired outcome

- You manage agent prompts through a defined lifecycle: authoring, review, testing, deployment, monitoring, and retirement.
- Every production prompt has a documented version history, an evaluation record, and a clear owner.
- You deploy prompt updates independently of application code and roll back to a previous version within minutes.
- You track the performance impact of each prompt change over time and can attribute quality shifts to specific versions.

## Common anti-patterns

- Hardcoding prompts directly in application code, making it impossible to update agent behavior without a full code deployment and blocking independent prompt iteration.
- Deploying prompt changes directly to production without evaluation against quality benchmarks, discovering regressions only after users report them.
- Operating without prompt version history, making it impossible to determine which prompt change caused a behavioral regression or to roll back to a known-good version.
- Treating prompt changes as too small to require review, letting ad-hoc edits accumulate into drift that no one owns.

## Benefits of establishing this best practice

- Behavioral changes follow a consistent, auditable path from authoring to deployment, reducing operational risk and enabling reliable rollback.
- Prompt performance tracking and evaluation create an empirical basis for iteration. Each update is validated against measurable quality criteria before reaching production.
- Teams can deploy prompt changes independently of application code, shortening the feedback loop between business need and runtime behavior.
- Failed prompt updates revert in minutes rather than requiring an incident response.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Treat prompts as first-class operational artifacts with the same discipline applied to application code. Application code moves through version control, code review, automated tests, staged deployment, and documented rollback. Most organizations apply none of these to prompts, which can result in agent behavior drifts. Apply the same lifecycle to prompts as you do to code, where you name the stages explicitly and require changes to follow them.

[Amazon Bedrock Prompt Management](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management.html) provides versioning, metadata, and integration with [Amazon Bedrock Evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html). For no-code paths built with [Amazon Quick Suite](https://aws.amazon.com/quicksuite/), the same stages apply through the identity and instructions configuration. A four-stage lifecycle works for most teams:

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp01.html#implementation-guidance)

### Implementation steps

1. **Stand up the central prompt repository:** Configure [Amazon Bedrock Prompt Management](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management.html) with four lifecycle stages (draft, review, active, archived) and required metadata fields (purpose, target agent, expected behavior, evaluation criteria, owner).
2. **Define prompt authoring standards:** Specify required metadata, formatting conventions, and documentation requirements. Apply them through shared templates or steering files so they are enforced during development.
3. **Build versioned evaluation datasets:** Create datasets for each agent's primary use cases and store them with versioning enabled so evaluation results are reproducible.
4. **Gate transitions on automated evaluation:** Configure an [Amazon Bedrock Evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html) pipeline that runs on every transition from draft to review, with minimum quality thresholds.
5. **Enforce lifecycle stages in CI/CD:** Use [AWS CodePipeline](https://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html) to block promotion to active without approval and evaluation threshold checks.
6. **Reference prompts by ID, not by value:** Deploy agents with parameterized references to the prompt repository rather than hardcoded strings, so prompts evolve independently of application code.
7. **Monitor active prompts in production:** Publish quality metrics to [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html), build dashboards per agent, and configure alarms that trigger review workflows when thresholds are exceeded.

## Resources

**Related best practices:**

- [AGENTOPS01-BP03 Develop test scenarios that accurately capture failures of dependent components, orchestration protocols, and business processes](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp03.html)
- [AGENTOPS02-BP03 Implement agent behavior versioning and rollback capabilities](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp03.html)
- [AGENTOPS06-BP01 Design multi-layered testing frameworks](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp01.html)
- [AGENTREL02-BP04 Develop clear instruction protocols for agents](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp04.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [AWS CodePipeline](https://aws.amazon.com/codepipeline/)
- [Amazon S3](https://aws.amazon.com/s3/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
