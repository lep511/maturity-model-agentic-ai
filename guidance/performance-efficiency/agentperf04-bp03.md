# AGENTPERF04-BP03 Design high-performing event-driven integration patterns

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF04 — Communication and protocol efficiency · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF04-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents that react to events in real time, data changes, user actions, and system alerts deliver faster business outcomes than agents that poll for work. Overly broad event subscriptions trigger agents for irrelevant events, missing filtering causes agents to process and discard events they don't need. Inefficient routing adds delays that push response time past user expectations.

## Desired outcome

- You have agent workflows triggered by precisely filtered events that match their processing requirements, with minimal latency between event emission and agent invocation.
- You have efficient event schemas that include only routing metadata, with agents retrieving full context on demand.
- You have event-driven patterns that support both real-time and batch processing modes.

## Common anti-patterns

- Subscribing agents to broad event streams without filtering, forcing agents to receive and process events they immediately discard and wasting compute resources.
- Using polling-based event detection instead of push-based event delivery, adding latency and consuming compute during idle periods.
- Including full data payloads in events rather than event references, inflating event size and network transfer time when most consumers only need a subset.

## Benefits of establishing this best practice

- Push-based delivery reduces latency between event occurrence and agent invocation.
- Filtering at the event bus reduces compute waste by invoking agents only for relevant events.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Use [Amazon EventBridge](https://aws.amazon.com/eventbridge/) as the primary event bus for agent workflow triggers, with content-based filtering rules that route events to specific agents based on event attributes. For high-throughput streams, [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/) with Lambda event source mappings supports batch processing without forcing agents into per-event invocation. Event payloads should carry metadata, identifiers, and routing information, the full data belongs in [Amazon S3](https://aws.amazon.com/s3/) or [Amazon DynamoDB](https://aws.amazon.com/dynamodb/), with references in the event. EventBridge Schema Registry standardizes event formats across the organization so consumers can generate code bindings from the schema rather than parsing one-time JSON.

For agents that need to react to database changes, [Amazon DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html) triggers agents directly from data changes without polling. Event deduplication using idempotency keys helps prevent agents from processing the same event twice, relevant whenever at-least-once delivery is the default. For complex event processing that requires correlation of multiple events before triggering an agent, [AWS Step Functions](https://aws.amazon.com/step-functions/) or [EventBridge Pipes](https://aws.amazon.com/eventbridge/pipes/) aggregate and transform events before agent invocation.

### Implementation steps

1. **Configure EventBridge rules with content-based filtering to route events to specific agents:** Use content-based filtering on [Amazon EventBridge](https://aws.amazon.com/eventbridge/) so agents receive only the events whose attributes match their responsibilities.
2. **Design minimal event schemas with references rather than full payloads, registered in EventBridge Schema Registry:** Keep event payloads to routing metadata and identifiers, store full data in S3 or DynamoDB, and register schemas in EventBridge Schema Registry so consumers can generate bindings.
3. **Implement DynamoDB Streams for data-change-driven agent triggers:** Use [Amazon DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html) to trigger agents directly from data changes without polling.
4. **Implement idempotency keys for event deduplication in agent processing logic:** Apply idempotency keys so agents don't process the same event twice under at-least-once delivery.
5. **Monitor event processing metrics: event-to-invocation latency, filter efficiency, and throughput:** Publish these metrics to CloudWatch so filtering and routing can be tuned from measured behavior.

## Resources

**Related best practices:**

- [AGENTPERF04-BP01 Optimize asynchronous message handling patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp01.html)
- [AGENTPERF05-BP01 Design efficient workflow orchestration patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp01.html)
- [AGENTPERF01-BP03 Profile end-to-end agent latency and identify optimization targets](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp03.html)

**Related services:**

- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
