# AGENTREL03-BP04 Implement graceful degradation for memory and state operations

**Pillar:** Reliability · **Focus area:** AGENTREL03 — Agent memory and state management · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL03-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Treating every memory failure as fatal turns recoverable issues into total outages. An explicit degradation hierarchy with documented modes and automatic recovery keeps agents partially useful and transparent about their reduced state.

## Desired outcome

- You have a memory degradation hierarchy with distinct operational modes and documented behaviors for each.
- You transition modes automatically based on memory health signals, and recover to full mode when stores return.
- You communicate degradation state to users and orchestration systems so they know what to expect.

## Common anti-patterns

- Treating all memory failures as fatal, producing complete unavailability for conditions that could be handled with reduced functionality.
- Failing to communicate degraded memory state to users, who then get confused when responses lack expected context.
- Implementing degradation without a recovery path, leaving agents in degraded mode indefinitely after primary stores return.

## Benefits of establishing this best practice

- Partial service availability persists through memory store failures instead of becoming a full outage.
- Users and orchestrators see transparent indications of current capability.
- Full capability returns automatically when memory stores come back online.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Start with the mode hierarchy. Three modes cover most agent workloads. Full mode has all memory tiers available. Session-only mode operates without long-term memory, using only session context. Stateless mode has both tiers unavailable and processes each request independently. For each mode, define the agent's behavior explicitly:

Without this definition, the fallback path is whatever the code happens to do, which is rarely what you want during an incident.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp04.html#implementation-guidance)

### Implementation steps

1. **Define a memory degradation hierarchy with documented modes:** Specify full, session-only, and stateless modes, with the agent behavior each mode dictates.
2. **Implement automated mode transitions:** Trigger transitions through health metrics from [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) and Amazon CloudWatch.
3. **Maintain in-process fallback caches for short-term memory:** Allow active sessions to continue when short-term memory degrades.
4. **Communicate degradation state to users:** Surface structured status indicators so users see the reduced capability instead of guessing.
5. **Configure automatic recovery detection:** Return agents to full mode when stores become available, without operator intervention.

## Resources

**Related best practices:**

- [AGENTREL03-BP01 Design an information classification model to identify short-term and long-term memories](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp01.html)
- [AGENTREL03-BP02 Architect fault-tolerant memory stores with redundancy and failover](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel03-bp02.html)
- [AGENTREL08-BP04 Track agent memory utilization metrics](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel08-bp04.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
