# AGENTSEC01-BP01 Implement memory isolation and integrity controls

**Pillar:** Security · **Focus area:** AGENTSEC01 — Secure agent memory and state · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC01-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Shared agent memory is the shortest path for a single affected session to contaminate every other one. Partitioning memory along the boundaries that matter for the workload, and verifying what comes back out, contains the scope of memory poisoning to the partition it touched.

## Desired outcome

- You partition agent memory along the isolation axes that match the workload (session, user, tenant, agent, or group), with no cross-contamination between contexts.
- You detect unauthorized modifications to stored memories through integrity checks and keep a tamper-evident history of state changes.
- You scope memory access per agent through least-privilege IAM policies, so each agent can read or write only the namespaces it is authorized for.

## Common anti-patterns

- Sharing memory across agents or sessions by default, so an affected session can read or overwrite another's context and poisoning spreads laterally.
- Storing agent memory in plaintext without encryption at rest, exposing reasoning context, intermediate tool results, and user data if the underlying storage is reached through a misconfigured IAM policy or storage exposure.
- Skipping integrity checks on memory reads, letting silently corrupted or injected memories influence decisions and compound across sessions.
- Granting every agent broad read/write access to the full memory store, producing a flat trust model where any affected agent reaches unrelated workflows.

## Benefits of establishing this best practice

- Per-session and per-agent memory partitioning contains the scope of any single affected agent.
- Cryptographic integrity verification on memory reads catches poisoning attempts before affected data influences decisions.
- IAM-scoped memory access limits each agent to only the partitions it requires, reducing lateral movement.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Memory poisoning is a lateral-movement problem. If every agent reads from the same pool, one affected write becomes every agent's input, and the cost of a single successful injection is the correctness of the entire system. The design shift is to treat memory like a tenant-aware data store from the start. Partition it along the boundaries that actually matter for the workload:

Make cross-partition access the exception you must explicitly grant, not the default you must explicitly prevent.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp01.html#implementation-guidance)

### Implementation steps

1. **Create the memory resource with customer-managed encryption:** Provision an [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) resource, specify encryptionKeyArn with a customer-managed AWS KMS key for sensitive workloads, and set eventExpiryDuration to match your data retention requirements.
2. **Design a hierarchical namespace schema:** Use dynamic placeholders ({actorId}, {sessionId}) to partition memory per user and per session automatically, for example /support-agent/{actorId}/preferences for user-scoped data and /support-agent/shared/product-knowledge for intentional shared context.
3. **Configure memory strategies at the correct isolation level:** Apply semantic, user preferences, summary, or custom strategies with namespaces scoped to the partition you want, and use custom strategy overrides where domain-specific extraction and consolidation prompts are needed.
4. **Scope IAM roles to authorized namespaces only:** Give each agent a dedicated IAM role with resource-based policies that allow only the namespace prefixes it requires, denying all other namespaces by default.
5. **Enforce namespace-scoped retrieval in agent code:** Call retrieve\_memory\_records and list\_events within the agent's authorized namespaces only, so cross-tenant data is blocked at the application layer as well as the authorization layer.
6. **Layer HMAC integrity verification on sensitive records:** For workloads that need tamper detection beyond the built-in audit trail, store a KMS-generated HMAC alongside each memory entry and verify it on read before the content influences agent decisions.
7. **Alarm on memory access anomalies:** Configure Amazon CloudWatch alarms for cross-namespace retrieval attempts, high-frequency writes from a single agent, and spikes in memory extraction failures, and route alerts through Amazon EventBridge for automated incident response.
8. **Audit strategies and run red-team exercises:** Periodically review extraction and consolidation patterns with list\_memories and retrieve\_memory\_records to verify strategies are capturing the right information and that PII filtering is working, and simulate memory poisoning scenarios to validate the isolation controls hold.

## Resources

**Related best practices:**

- [AGENTSEC01-BP02 Validate and sanitize memory inputs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp02.html)
- [AGENTSEC01-BP03 Monitor for hallucination propagation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp03.html)
- [AGENTSEC03-BP03 Implement least privilege with dynamic boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Key Management Service](https://aws.amazon.com/kms/)
- [AWS Identity and Access Management](https://aws.amazon.com/iam/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
