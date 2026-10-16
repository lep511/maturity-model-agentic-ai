# AGENTOPS03-BP02 Implement CI/CD pipelines tailored to agentic system deployment (AgentOps)

**Pillar:** Operational excellence · **Focus area:** AGENTOPS03 — Agent lifecycle and deployment processes · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS03-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Manual agent deployments and informal testing can keep a project stuck in the pilot phase. An agent-aware pipeline, with behavioral evaluation gates, staged rollout, and automated rollback can help your organization realize the goal of daily deployment of behavioral improvements.

## Desired outcome

- Agent deployments run fully through CI/CD with agent-specific validation gates for prompt quality, tool integration correctness, behavioral regression, and security.
- Deployment strategies (blue/green, canary) limit the scope of impact when a regression does slip through.
- Automated rollback restores the previous version within minutes if quality thresholds are exceeded.
- Infrastructure is defined as code so deployments are reproducible and environments stay consistent.

## Common anti-patterns

- Deploying agent changes through manual console clicks or one-off scripts without automated validation gates, making deployments inconsistent and error-prone.
- Running only traditional unit tests without agent-specific behavioral evaluation (prompt quality, tool selection accuracy, hallucination rate), missing regressions that unit tests can't detect.
- Deploying directly to production without staged rollout (canary, blue/green), maximizing the scope of impact of any regression.
- Treating rollback as a theoretical capability that has never been exercised, so the first time anyone uses it is during an incident.

## Benefits of establishing this best practice

- Automated pipelines help every deployment follow the same validated path regardless of who starts it, reducing deployment inconsistency.
- Behavioral validation gates provide empirical evidence that each deployment meets quality standards before reaching production.
- Staged rollout and automated rollback compress incident response time from hours to minutes when regressions appear.
- Infrastructure as code makes deployments reproducible across environments, removing a common source of failures.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Agent CI/CD shares most of its structure with software CI/CD, with one substantive addition: behavioral evaluation. The stages that fit most agent workloads are:

Task completion accuracy, hallucination rate, and tool selection accuracy need explicit thresholds that block promotion when exceeded. Thresholds that are set too loose produce false passes, but thresholds that are set too tight block legitimate iteration. To calibrate, start with thresholds tuned to the current baseline, then tighten them as the agent's quality track record grows.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp02.html#implementation-guidance)

### Implementation steps

1. **Build the pipeline stages:** Configure source, build, behavioral evaluation, security scan, and production deployment stages with the appropriate tools for each.
2. **Set behavioral evaluation as a gate:** Integrate [Amazon Bedrock Evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html) with task completion accuracy and hallucination rate thresholds that block promotion when exceeded.
3. **Deploy to [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html):** Use built-in versioning and endpoint-based weighted routing for blue/green or canary rollouts.
4. **Automate rollback on quality threshold exceedance:** Wire [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html) alarms to revert-deployment workflows so quality threshold violations trigger immediate revert.
5. **Version all deployment artifacts:** Tag each artifact set with the pipeline run ID for traceability, and store in a durable versioned store.
6. **Validate the full pipeline:** Deliberately trigger a rollback during pipeline validation to confirm revert procedures work before they are needed for real.

## Resources

**Related best practices:**

- [AGENTOPS03-BP01 Define an agent lifecycle with clear SME ownership, testing, and governance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp01.html)
- [AGENTOPS02-BP03 Implement agent behavior versioning and rollback capabilities](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp03.html)
- [AGENTOPS06-BP03 Establish SME-driven validation and business approval workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp03.html)
- [AGENTCOST06-BP02 Cost optimize versioning and deployment through efficient artifact management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost06-bp02.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Cloud Development Kit (AWS CDK)](https://aws.amazon.com/cdk/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
