# AGENTSEC04-BP02 Human-in-the-loop for critical decisions

**Pillar:** Security · **Focus area:** AGENTSEC04 — Agent goal alignment and manipulation prevention · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC04-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Routing every agent action through human review produces rubber-stamp approvals. Routing none produces unbounded autonomy. Risk-tiered approval pauses agents only for the decisions where human judgment actually changes the outcome, with enough context to make those decisions meaningful.

## Desired outcome

- You pause high-risk agent operations for human review before execution, and reviewers receive enough context to make informed decisions within a defined time window.
- Escalation paths handle cases where primary reviewers are unavailable.
- You log human approval decisions with timestamps and reviewer identities, creating an auditable record of human oversight for compliance purposes.

## Common anti-patterns

- Routing all agent actions through human review regardless of risk level, creating reviewer fatigue and rubber-stamp approvals.
- Providing reviewers with insufficient context (the proposed action only, without the reasoning chain, data sources, or potential consequences), turning review into a formality.
- Implementing approval workflows without timeout policies or escalation paths, so agent execution stalls indefinitely when reviewers are unavailable.

## Benefits of establishing this best practice

- Risk-tiered approval workflows focus reviewer attention on the decisions where human judgment matters most.
- Logged approval decisions with reviewer identity and timestamps produce an auditable record that satisfies compliance requirements.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

A risk classification framework is what lets human attention go where it adds value. Combine static properties of the operation (what kind of action, against what resource) with dynamic signals about the request (frequency, time of day, source location, recent anomalies). Risk classification itself can't rely on an LLM exposed to the same untrusted content as the request being evaluated, because adversarial content could influence the classifier into marking the request as low-risk. Use deterministic logic (policy engines, rule-based classifiers) as the authoritative signal, with LLM-assisted classification as an optional input that a deterministic layer re-checks. As a baseline: read-only operations proceed autonomously, low-risk writes require single-reviewer approval, and higher-risk operations (financial transactions, data deletion, external communications) require stricter approval, which can be single-reviewer, multi-reviewer, or out-of-band depending on your risk policy. For established risk framing approaches to adapt, see the [AWS Agentic AI Security Scoping Matrix](https://aws.amazon.com/ai/security/agentic-ai-scoping-matrix/) and [this guide to building AI agents in GxP environments](https://aws.amazon.com/blogs/machine-learning/a-guide-to-building-ai-agents-in-gxp-environments/).

Persistent trust grants, where a reviewer approves a specific operation pattern once and future operations matching the pattern proceed without re-approval, are a useful escape valve for genuinely routine operations, but they shift where human judgment is applied from moment-to-moment to at-grant time. If you implement persistent trust, bound each grant to a specific command, parameter shape, or resource. Tier grants by risk so higher-risk operations are ineligible for persistent trust or require re-confirmation at a defined cadence, and make grants themselves auditable and revocable. Wildcard trust grants (approving all future operations of a given type with no parameter scoping) effectively remove human oversight from an entire class of operations and should not be issued.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html#implementation-guidance)

### Implementation steps

1. **Define a deterministic risk classifier:** Map agent operation types to approval tier requirements (autonomous, single-reviewer, multi-reviewer), combine static classification with dynamic request-time signals, and implement the classifier as deterministic logic rather than an LLM.
2. **Match approval mechanism to execution environment:** Use [AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html) callbacks for step-function-driven agents, [Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html) user confirmation or return-of-control for agents on Amazon Bedrock Agents, and [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-long-run.html) async tasks for agents that need long-running approval processing, and implement the corresponding pattern for each tier that requires human approval.
3. **Bound any persistent trust grants:** Scope each grant narrowly (specific command, parameter shape, or resource), tier grants by risk, and make them auditable and revocable.
4. **Store decision context durably:** Write full decision context to Amazon S3 before sending approval notifications, and make the context available through the authenticated approval interface or through short-lived presigned URLs when that isn't possible.
5. **Configure timeouts with safe fallbacks:** Implement timeout policies and escalation paths for each approval mechanism, with safe fallback actions (typically blocking the operation) when no reviewer responds in the defined window.
6. **Log every approval:** Capture reviewer identity, timestamps, operation under review, decision, and escalation events, aligned with AGENTSEC05-BP01 retention and compliance requirements.
7. **Review workflow metrics periodically:** Look for patterns that suggest reviewer fatigue or process inefficiencies and adjust risk-tier thresholds accordingly.

## Resources

**Related best practices:**

- [AGENTSEC04-BP01 Implement guardrails and alignment controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp01.html)
- [AGENTSEC07-BP01 Implement cognitive load management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp01.html)
- [AGENTSEC07-BP03 Multiple reviewers for critical operations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp03.html)

**Related services:**

- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon SNS](https://aws.amazon.com/sns/)
- [Amazon SES](https://aws.amazon.com/ses/)
- [Amazon S3](https://aws.amazon.com/s3/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
