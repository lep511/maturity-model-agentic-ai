# AGENTSEC06-BP01 Encrypt and sign inter-agent messages

**Pillar:** Security · **Focus area:** AGENTSEC06 — Secure multi-agent orchestration · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC06-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Transport-level encryption stops protecting the payload the moment a message lands in a queue or event bus. Message-level signing and encryption keyed per trust zone gives receiving agents cryptographic proof of sender identity and content integrity no matter how many hops the message made.

## Desired outcome

- You protect inter-agent messages at the message level with encryption and signing, independent of transport-level security.
- Receiving agents verify message signatures before acting on instructions from other agents.
- Messages stored in queues or event buses are encrypted at rest with keys scoped to the appropriate trust zone.
- Agents can't forge messages that appear to originate from other agents in the coordination workflow.

## Common anti-patterns

- Relying solely on transport-level encryption (TLS) without message-level signing, so messages stored in queues or event buses can't be verified for tampering at consumption time.
- Using a single shared encryption key across all agents, so one key exposure affects every inter-agent message rather than only those in one trust zone.
- Not verifying message signatures before acting on inter-agent instructions, letting an agent act on forged or tampered instructions without any integrity check.

## Benefits of establishing this best practice

- Message-level integrity verification persists beyond the transport layer, so messages stored in queues or event buses can be verified at consumption time.
- Scoped key management limits the impact of a key exposure to a single trust zone rather than the entire multi-agent system.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Two distinct properties are at stake: who sent the message (covered by AGENTSEC03-BP01 for authentication) and whether the content is what the sender actually sent. Transport-level encryption provides the second property only while the message is in transit. The moment the message lands in an Amazon SQS queue, Amazon EventBridge bus, or AWS Step Functions state machine, there is no transport to protect it, and any modification between delivery and consumption is invisible. Message-level signing provides cryptographic proof that a specific message was sent by a specific agent and has not been modified, regardless of how many intermediary services it passed through.

Scope matters. For direct agent-to-agent communication within a single trust zone, the transport-level security and authentication provided by [Amazon Bedrock AgentCore Runtime](https://aws.amazon.com/blogs/machine-learning/introducing-agent-to-agent-protocol-support-in-amazon-bedrock-agentcore-runtime/) (TLS 1.2\+ with OAuth 2.0 or SigV4) is typically sufficient. Layer message signing on top when payload integrity needs to persist beyond the transport, or when a receiving agent needs cryptographic proof of which specific agent sent an instruction.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp01.html#implementation-guidance)

### Implementation steps

1. **Create trust-zone-scoped KMS key pairs:** Provision AWS KMS asymmetric key pairs for message signing, with separate keys for each agent trust zone.
2. **Sign messages on send:** Implement message signing in sending agents through the AWS KMS Sign API, attaching the signature as a message metadata attribute.
3. **Verify signatures on receive:** Implement signature verification in receiving agents through the AWS KMS Verify API, rejecting any message that fails verification before processing.
4. **Encrypt SQS queues with customer-managed keys:** Enable server-side encryption on Amazon SQS queues used for asynchronous inter-agent messaging, using customer-managed AWS KMS keys scoped per trust zone.
5. **Layer signing on top of A2A for cross-boundary traffic:** For agents on AgentCore Runtime using A2A, add message-level signing for communications that cross trust boundaries on top of the protocol's built-in authentication.
6. **Route through PrivateLink:** Configure AWS PrivateLink for inter-agent service communications to keep traffic on private network endpoints.
7. **Manage keys and alert on anomalies:** Store signing key ARNs in Parameter Store, a capability of AWS Systems Manager, configure automatic key rotation in AWS KMS, and set Amazon CloudWatch alarms for key usage anomalies.

## Resources

**Related best practices:**

- [AGENTSEC03-BP01 Implement strong authentication for agent identities](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp01.html)
- [AGENTSEC06-BP02 Implement workflow orchestration security controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp02.html)
- [AGENTSEC06-BP03 Establish trust boundaries between agents](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp03.html)

**Related services:**

- [AWS Key Management Service](https://aws.amazon.com/kms/)
- [Amazon SQS](https://aws.amazon.com/sqs/)
- [AWS Systems Manager](https://aws.amazon.com/systems-manager/)
- [AWS PrivateLink](https://aws.amazon.com/privatelink/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
