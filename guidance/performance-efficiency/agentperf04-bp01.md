# AGENTPERF04-BP01 Optimize asynchronous message handling patterns

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF04 — Communication and protocol efficiency · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF04-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Asynchronous messaging lets agents operate independently at their optimal pace, with message queues absorbing throughput variations and leveling load across the workflow. Synchronous request-response patterns create tight coupling that makes a slow downstream agent block the entire upstream chain. Async decouples producers from consumers so fast agents are not held up by slow ones.

## Desired outcome

- You have agent-to-agent and agent-to-service communications using asynchronous patterns by default, with synchronous communication reserved for interactions that genuinely require immediate responses.
- You have compact message payloads that pass references rather than inline data.
- You have agents processing messages at their own pace without being overwhelmed by upstream producers.

## Common anti-patterns

- Using synchronous HTTP request-response for all agent communications, creating tight coupling where a slow downstream agent blocks the entire upstream chain.
- Including large payloads (like full documents or base64-encoded files) in messages rather than passing references (like S3 URIs or document IDs) and letting the consumer retrieve the data when needed.
- Skipping backpressure mechanisms, allowing fast-producing agents to overwhelm slow-consuming agents with messages that queue up and eventually cause timeouts.

## Benefits of establishing this best practice

- Decoupled agent execution helps prevent slow agents from blocking fast agents.
- Each agent scales independently based on its own queue depth and processing rate.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

For agents deployed on [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html), the runtime's built-in session management handles message passing and state management for agent-to-agent communication inside a workflow. For workflows that need custom messaging patterns or cross-system integration, [Amazon SQS](https://aws.amazon.com/sqs/) provides reliable point-to-point messaging and [Amazon SNS](https://aws.amazon.com/sns/) provides fan-out where a single agent event triggers multiple downstream agents. Message payloads should stay compact: pass S3 URIs, DynamoDB keys, or document IDs rather than inline data, and let the consumer retrieve the bytes on demand.

Dead letter queues (DLQs) capture messages that fail processing after retries, so failure analysis doesn't block the main flow. When consumer queues exceed depth thresholds, producers should be throttled or consumers scaled. Amazon CloudWatch alarms on queue depth are the signal that triggers either response. For high-volume workflows, SQS batch size and long polling let you balance latency and throughput, long polling reduces empty receives, and larger batch sizes amortize request overhead across more messages.

### Implementation steps

1. **Use AgentCore Runtime session management for agent-to-agent communication where possible, and use SQS or SNS for custom messaging patterns:** Let the runtime handle message passing and state inside a workflow, and fall back to Amazon SQS or Amazon SNS only for custom patterns or cross-system integration.
2. **Design compact message payloads using references rather than inline data:** Pass S3 URIs, DynamoDB keys, or document IDs in messages and let the consumer retrieve the full payload on demand.
3. **Implement dead letter queues for failed message processing with alerting on DLQ depth:** Route messages that fail after retries to a DLQ and alert when DLQ depth grows, so failure analysis happens off the main path.
4. **Add backpressure mechanisms that throttle producers when consumer queues exceed depth thresholds:** Use Amazon CloudWatch alarms on queue depth to trigger producer throttling or consumer scaling before queues reach timeout-triggering depths.
5. **Configure long polling and batch sizes for SQS consumers based on latency and throughput requirements:** Tune long polling and batch size on SQS consumers to balance empty-receive cost, per-message latency, and throughput.

## Resources

**Related best practices:**

- [AGENTPERF04-BP02 Implement efficient protocol-based agent communications](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp02.html)
- [AGENTPERF04-BP03 Design performant event-driven integration patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf04-bp03.html)
- [AGENTPERF05-BP01 Design efficient workflow orchestration patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf05-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore Runtime](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon SQS](https://aws.amazon.com/sqs/)
- [Amazon SNS](https://aws.amazon.com/sns/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
