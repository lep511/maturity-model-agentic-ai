# AGENTREL01-BP01 Implement a resilient messaging layer

**Pillar:** Reliability · **Focus area:** AGENTREL01 — Predictable agent behavior · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL01-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Direct agent-to-agent calls couple failure modes. When one agent fails, everything downstream fails with it. A messaging layer with persistence, retry, and dead-letter handling absorbs transient faults and lets workflows resume from where they stopped.

## Desired outcome

- Your agents communicate through an intermediary messaging layer with persistence, retry, and dead-letter handling rather than direct synchronous calls.
- You have durable workflow state that survives the restart or loss of any single component.
- You can trace every agent message across synchronous and asynchronous boundaries.

## Common anti-patterns

- Wiring agents together through direct synchronous calls, so a single failure cascades through every dependent agent.
- Running messaging infrastructure without persistence, making workflow recovery impossible after a component outage.
- Treating every interaction as synchronous, creating bottlenecks that block independent agent operation.

## Benefits of establishing this best practice

- Persistence and retry contain transient failures within the messaging layer instead of exposing them as agent outages.
- Dead-letter handling helps prevent poison messages from blocking healthy workflow execution.
- A durable messaging substrate is the foundation for advanced orchestration patterns including saga and arbiter.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Every agent-to-agent call is a coupling decision. Synchronous calls tie the caller's availability to the callee's availability. In a network of agents that multiplies quickly. Five agents with four synchronous dependencies, and the availability product drops below any single agent's SLA. A messaging layer breaks the coupling by buffering the call in durable infrastructure. The caller emits a message and moves on. The receiver processes it on its own schedule, with retries and dead-letter routing handled outside the agent's own code.

Pattern selection follows the interaction shape. Use [Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html) for content-based routing where a single event fans out to multiple consumers, with EventBridge Schema Registry documenting the contract between agents. Use [Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) for durable point-to-point delivery with configurable visibility timeouts and dead-letter queues. Use Amazon SNS for fan-out to multiple downstream consumers.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp01.html#implementation-guidance)

### Implementation steps

1. **Map every agent communication path and classify it:** Document each interaction as synchronous direct communication (A2A), loosely coupled tool invocation (MCP), or asynchronous event-driven through [Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html).
2. **Configure EventBridge rules and SQS queues:** Set up Amazon EventBridge content-based routing for event-driven paths and [Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) queues for durable point-to-point messaging.
3. **Define event schemas in EventBridge Schema Registry:** Register a schema for each agent message type so sender and receiver agree on the contract.
4. **Configure dead-letter queues with automated triage:** Route repeatedly failed messages to DLQs and wire Amazon CloudWatch alarms so operators see poison messages before they block traffic.
5. **Instrument the messaging layer with AgentCore Observability:** Enable [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) for distributed tracing so you can follow a message across EventBridge, SQS, and agent boundaries.

## Resources

**Related best practices:**

- [AGENTREL01-BP02 Establish modular, fault-isolated layers](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp02.html)
- [AGENTREL01-BP03 Design specialized agents following actor model principles](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp03.html)
- [AGENTREL01-BP04 Standardize communication protocols](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel01-bp04.html)

**Related services:**

- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [Amazon SQS](https://aws.amazon.com/sqs/)
- [Amazon SNS](https://aws.amazon.com/sns/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
