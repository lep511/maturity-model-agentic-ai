# AGENTOPS07-BP04 Implement break-glass operational runbooks

**Pillar:** Operational excellence · **Focus area:** AGENTOPS07 — Operational recovery and consumption monitoring · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS07-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Write and test emergency runbooks before they are needed. Rehearsed manual fallback procedures, accessible escalation paths, and current contact information turn a complete agent failure into a brief manual period rather than a prolonged outage.

## Desired outcome

- When agents fail completely or behave unexpectedly, human operators execute well-documented manual procedures that maintain business continuity.
- Break-glass runbooks are tested regularly, and operators are trained and confident in the manual procedures.
- Escalation paths and contact information stay current.
- Emergency response times meet defined objectives because procedures are documented, accessible, and practiced.

## Common anti-patterns

- Assuming agent systems will always be available and not documenting manual fallback procedures, leaving operators without guidance when agents fail during critical business operations.
- Creating break-glass runbooks once and never testing or updating them, resulting in procedures that reference outdated systems, incorrect contacts, or steps that no longer work.
- Storing emergency procedures in locations inaccessible during the outage scenarios they are designed to address (for example, in systems that depend on the failing agent infrastructure).
- Designing manual fallback processes that require specialized knowledge held by only one or two team members, creating single points of failure in emergency response.
- Failing to define clear triggers for when break-glass procedures should be activated, causing delays as operators debate whether the situation warrants manual intervention.

## Benefits of establishing this best practice

- Documented break-glass procedures support consistent emergency responses regardless of who is on call.
- Break-glass runbooks formalize the transition from automated agent operations to human-driven processes, keeping business continuity intact when agent systems can't function.
- Regular drills keep procedures current and operators ready, so response quality doesn't depend on which person happens to be on call.
- Clear activation triggers remove hesitation that delays response.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Inventory your system by identifying every critical business process that depends on agent systems and assess the impact of agent unavailability for each. The output is a ranked list of processes that need break-glass coverage, from brief inconveniences to service-stopping issues. Processes at the top of the list get runbooks first.

Each runbook should cover trigger conditions, step-by-step manual execution instructions, required access credentials, escalation contacts with primary and backup personnel, expected completion times, and criteria for returning to automated operations. The most common failure mode, and the most dangerous, is runbooks stored in systems that depend on the very infrastructure they are designed to work around. An emergency runbook stored in a wiki that depends on the same agent infrastructure is a runbook you can't read during the outage. Store runbooks in a highly available, agent-independent location, with offline copies accessible to on-call operators.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp04.html#implementation-guidance)

### Implementation steps

1. **Inventory critical business processes:** Assess the impact of agent unavailability for each to produce a ranked list.
2. **Document manual fallback procedures:** Cover each critical process assuming no agent system availability, with step-by-step instructions.
3. **Establish escalation paths:** Include primary and backup contacts, with a process for keeping contact information current.
4. **Store runbooks independently:** Use a highly available, agent-independent location with offline copies accessible to on-call operators.
5. **Define clear activation triggers:** Configure automated alerts that notify operators when trigger conditions are met.
6. **Conduct exercises on a cadence:** Run tabletop exercises quarterly and full drills semi-annually, and update procedures based on findings.

## Resources

**Related best practices:**

- [AGENTOPS07-BP01 Implement automated response and recovery mechanisms](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp01.xml.html)
- [AGENTOPS07-BP02 Establish operational knowledge management systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp02.xml.html)
- [AGENTOPS07-BP03 Augment change management to accommodate technical improvements and business requirements](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp03.xml.html)
- [AGENTOPS04-BP03 Develop fallback behavior and error handling for tool invocations](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/../agentops04/agentops04-bp03.xml.html)
- [AGENTREL07-BP02 Enable automatic recovery from agent execution failures](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/../../reliability-pillar/agentrel07/agentrel07-bp02.xml.html)

**Related services:**

- [Amazon S3](https://aws.amazon.com/s3/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
