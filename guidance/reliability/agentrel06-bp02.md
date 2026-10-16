# AGENTREL06-BP02 Establish fallback mechanisms for legacy system degradation

**Pillar:** Reliability · **Focus area:** AGENTREL06 — Legacy system integration · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL06-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Legacy systems carry lower availability SLAs than cloud-based services, and their failure modes are often unpredictable. Health-aware fallback paths, caches for reference data, queues for transactions, graceful degradation for real-time, keep agent workflows running through legacy outages.

## Desired outcome

- You have health monitoring on every legacy integration with alarms that trigger fallback activation.
- You have cache-based fallbacks for reference data and queue-based fallbacks for transactional operations.
- You recover automatically when legacy systems return, with periodic probes deactivating the cutoff.

## Common anti-patterns

- Assuming legacy systems match cloud-based reliability, without implementing fallbacks for their actual SLAs.
- Deploying fallbacks that silently return stale or incorrect data without informing agents or users.
- Skipping legacy health monitoring, so outages become visible only when agent tasks fail.

## Benefits of establishing this best practice

- Agent functionality stays available during legacy outages through pre-defined fallback paths.
- Proactive fallback activation through health monitoring replaces reactive failure detection.
- Users and downstream systems see transparent indications of degraded capability.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Health monitoring is the prerequisite for any automatic fallback. Without a health signal, the only way to know the legacy system is down is to watch user-visible failures accumulate. Periodic probes through [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) and Amazon CloudWatch check endpoint availability and response time. Alarms on those probes trigger fallback activation before the first user-facing failure happens.

Fallback shape depends on the operation type. For reference data, product catalogs, configuration values, mostly-static lookups, cache-based fallbacks serve recently retrieved data during outages. The accuracy cost is low because the data doesn't change often. For transactional operations, queue-based fallbacks buffer requests for replay when the system recovers, preserving the intent of each operation without attempting it against an unreachable system. For real-time data that can't be cached or queued, live prices, current inventory, instantaneous system state, graceful degradation means informing the user the information is temporarily unavailable rather than returning a plausible-but-wrong answer.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp02.html#implementation-guidance)

### Implementation steps

1. **Implement health monitoring for each legacy integration:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) and Amazon CloudWatch probes to check endpoint availability and response time.
2. **Configure alarms that trigger fallback activation:** Alarm on health degradation so fallbacks activate before user-visible failures accumulate.
3. **Implement operation-appropriate fallbacks:** Cache-based fallbacks for reference data, queue-based fallbacks for transactional operations, and graceful degradation messages for real-time data.
4. **Deploy automatic cutoffs with recovery detection:** Use CloudWatch alarms to trigger [Amazon Bedrock AgentCore Policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) updates or circuit breaker logic, and run periodic probes to re-enable access when the system recovers.
5. **Monitor fallback activation frequency:** Use AgentCore Observability to identify legacy systems that consistently degrade, so modernization effort can be prioritized.

## Resources

**Related best practices:**

- [AGENTREL04-BP03 Implement fallback mechanisms and graceful degradation for collaborative workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel04-bp03.html)
- [AGENTREL06-BP01 Develop agent-based integrations with existing or legacy systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp01.html)
- [AGENTREL06-BP03 Regularly test degraded system performance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
