# AGENTSEC07-BP03 Multiple reviewers for critical operations

**Pillar:** Security · **Focus area:** AGENTSEC07 — Human oversight protection and agent containment · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC07-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

A single reviewer is a single point of failure, both for honest errors and for social engineering. Independent, blind reviews for high-risk decisions are the defense-in-depth pattern, well known as the four-eyes principle, that keeps unilateral approval off the path.

## Desired outcome

- High-risk agent decisions receive independent review from multiple qualified reviewers, with blind review processes helping prevent anchoring bias.
- You resolve disagreements through escalation rather than defaulting to approval.
- You log all review decisions with reviewer identities and timestamps for audit purposes.

## Common anti-patterns

- Showing each reviewer the previous reviewer's decision before they submit their own, introducing anchoring bias that undermines independence.
- Defaulting to approval when reviewers disagree, letting a single approving reviewer effectively override a blocking reviewer.
- Assigning multiple reviews to reviewers from the same team or reporting chain, reducing the independence of the process.

## Benefits of establishing this best practice

- Multiple independent reviews provide defense-in-depth for human oversight, removing the single point of failure in the review process.
- Logged individual reviewer decisions, identities, and timestamps support compliance and enable investigation of approval anomalies.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Parallel execution orchestrates multi-reviewer workflows well. AWS Step Functions parallel execution branches send an independent review request to a different reviewer through Amazon SNS, and the workflow waits for all branches to complete before evaluating consensus. Blind review comes from not including previous reviewer decisions in the notification content, so each reviewer evaluates the decision independently.

Consensus logic belongs in an AWS Lambda function that evaluates the collected decisions. Two-reviewer workflows require unanimous approval. Three or more reviewers use majority rules with escalation for split decisions, and escalation paths route disagreements to a senior reviewer with full visibility into individual decisions and their rationale.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp03.html#implementation-guidance)

### Implementation steps

1. **Orchestrate blind parallel reviews:** Design multi-reviewer workflows in AWS Step Functions with parallel branches, one per reviewer, that send independent blind review requests through Amazon SNS.
2. **Implement consensus and escalation:** Evaluate collected decisions in an AWS Lambda function, unanimous for two-reviewer flows, majority rules with escalation for three or more.
3. **Route split decisions to senior reviewers:** Configure escalation paths that give senior reviewers visibility into the individual decisions and rationale.
4. **Select reviewers from different teams:** Use AWS IAM Identity Center to manage reviewer identities and track assignments, and draw reviewers from different organizational units.
5. **Persist decisions to S3:** Store all review decisions in Amazon S3 with reviewer identity, timestamp, and decision rationale, tagging records with the agent operation ID for correlation with execution logs.

## Resources

**Related best practices:**

- [AGENTSEC04-BP02 Human-in-the-loop for critical decisions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html)
- [AGENTSEC07-BP01 Implement cognitive load management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp01.html)
- [AGENTSEC07-BP04 Behavioral anomaly detection and agent containment](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp04.html)

**Related services:**

- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon SNS](https://aws.amazon.com/sns/)
- [Amazon S3](https://aws.amazon.com/s3/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [AWS IAM Identity Center](https://aws.amazon.com/iam/identity-center/)
