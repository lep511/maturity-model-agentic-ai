# AGENTSEC05-BP01 Implement comprehensive logging and decision artifact storage

**Pillar:** Security · **Focus area:** AGENTSEC05 — Agent observability and non-repudiation · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC05-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agent decisions are only auditable if the reasoning behind them is captured, preserved intact, and reachable at the speed investigations actually move. Tamper-evident artifact storage, attribution to the original trigger, and a queryable index turn raw log volume into forensic capability.

## Desired outcome

- You capture every agent decision, action, and reasoning step in tamper-evident, queryable storage, producing a complete and verifiable record of agent behavior.
- Each logged action includes attribution to the initiating source (a human user session, an upstream event, a schedule, or another agent), so logged actions can typically be traced back to what triggered them.
- You can reconstruct the full decision-making process for any agent action from stored artifacts, independent of the agent's own account of its reasoning.
- Cryptographic validation verifies log integrity, the agent's operational IAM role can't modify or delete its own decision history, and sensitive data (PII, secrets, regulated fields) is masked or redacted before logs are written to long-term storage.

## Common anti-patterns

- Logging only final agent outputs without intermediate reasoning, tool invocations, or decision points, making incident reconstruction impossible.
- Storing logs and decision artifacts in mutable storage without write-once protection, so logs can be deleted or modified after the fact.
- Storing decision artifacts in the same account and with the same permissions as the agent's operational resources, letting an affected agent modify or delete its own history.
- Retaining artifacts without a queryable index, so scanning raw S3 objects becomes impractical during time-sensitive investigations.

## Benefits of establishing this best practice

- Detailed logging of reasoning chains, tool invocations, and intermediate steps, stored independently from the agent's operational resources, supports reconstruction of agent behavior during investigations.
- Amazon S3 Object Lock and AWS CloudTrail log file validation provide cryptographic proof of log integrity for compliance and forensic purposes.
- Queryable artifact stores support retrospective behavioral analysis that surfaces patterns missed by real-time alerts.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Logging for agents has three hard requirements that ordinary application logging doesn't:

Each of those requirements shapes a different piece of the architecture.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html#implementation-guidance)

### Implementation steps

1. **Enable Amazon Bedrock model invocation logging:** Turn on Amazon Bedrock model invocation logging and deliver to both Amazon CloudWatch Logs and Amazon S3.
2. **Mask sensitive data before it lands in long-term storage:** Configure Amazon CloudWatch Logs data protection policies, verify masking behavior across every logging destination in use, and add write-time masking in agent code where the destination doesn't mask on its own.
3. **Create a dedicated, append-only artifact bucket in a Log Archive account:** Create an Amazon S3 bucket in a separate Log Archive account, aligned with the [AWS Security Reference Architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture/welcome.html), with versioning enabled and cross-account access controls that allow agent write access but deny delete and overwrite operations.
4. **Choose a retention-protection model:** Default to bucket-policy-based protection (deny delete, deny overwrite, MFA delete, versioning). Evaluate Amazon S3 Object Lock in governance mode where compliance requires stronger guarantees, and reserve compliance mode for cases where there is a specific regulatory requirement for it after validating the retention scope and duration against representative test data.
5. **Capture full traces through AgentCore Observability:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-telemetry.html) to capture full agent execution traces, and for artifacts needing longer retention or compliance controls, write the full decision context to the dedicated S3 artifact store at each significant decision point.
6. **Record initiator attributes on every artifact:** Capture human session, event source and event ID, alarm ARN, schedule rule ARN, calling agent ID, and similar identifiers as structured fields on decision artifacts and log entries.
7. **Apply a consistent artifact key schema:** Use `agentId`, `sessionId`, `timestamp`, and `decisionType` as the key schema for efficient retrieval during investigations.
8. **Deploy AgentCore Evaluations with drift alarms:** Deploy [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) with built-in and custom evaluators, publish results to Amazon CloudWatch, and configure alarms on evaluation scores to detect behavioral drift.
9. **Enable CloudTrail log file validation:** Turn on AWS CloudTrail with log file validation across all accounts and regions, storing logs in a dedicated S3 bucket with cross-account access controls.
10. **Make artifacts queryable with Athena and AWS Glue:** Set up an AWS Glue crawler to scan the S3 artifact bucket and create tables in the Data Catalog, use Amazon Athena to query artifacts directly in S3, and document standard investigation queries for common security scenarios.
11. **Implement tiered retention with automation:** Define retention tiers (CloudWatch Logs for operational monitoring, S3 Standard for medium-term, Amazon Glacier for long-term compliance) with automated lifecycle transitions and data classification tagging.
12. **Encrypt all log and artifact storage:** Use customer-managed AWS KMS keys with key rotation enabled on every logging destination.

## Resources

**Related best practices:**

- [AGENTSEC03-BP02 Separate agent and human user permission](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp02.html)
- [AGENTSEC04-BP02 Human-in-the-loop for critical decisions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html)
- [AGENTSEC05-BP02 Implement distributed tracing for agent interactions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp02.html)
- [AGENTREL07-BP03 Implement distributed tracing to track system dependencies and facilitate recovery](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS CloudTrail](https://aws.amazon.com/cloudtrail/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon S3](https://aws.amazon.com/s3/)
- [Amazon Athena](https://aws.amazon.com/athena/)
- [AWS Glue](https://aws.amazon.com/glue/)
- [AWS Key Management Service](https://aws.amazon.com/kms/)
