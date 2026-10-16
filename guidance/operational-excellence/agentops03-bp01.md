# AGENTOPS03-BP01 Define an agent lifecycle with clear SME ownership, testing, and governance

**Pillar:** Operational excellence · **Focus area:** AGENTOPS03 — Agent lifecycle and deployment processes · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS03-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

An agent portfolio without lifecycle discipline becomes a graveyard of undocumented services with forgotten owners. Explicit lifecycle stages, named SME ownership, and clean decommissioning keep the portfolio tractable as it grows from a handful of agents to dozens or hundreds.

## Desired outcome

- Every agent has a documented lifecycle state (development, pilot, production, deprecated, and decommissioned) with defined transition criteria.
- Onboarding follows a standardized provisioning process that configures required resources, permissions, and monitoring before an agent handles production traffic.
- Decommissioning cleanly removes retired agents, no orphaned resources, dangling permissions, or undocumented dependencies left behind.
- Each agent has a named SME owner accountable for its behavior, performance, and eventual retirement.

## Common anti-patterns

- Deploying agents to production without a defined lifecycle state or designated owner, so no one is accountable when behavior needs attention.
- Operating without decommissioning procedures, leaving retired agents running with active permissions and consuming resources long after they were replaced.
- Skipping the pilot stage and pushing agents from development directly to full production, missing the chance to validate behavior under real traffic with enhanced monitoring.
- Treating the agent registry as a one-time artifact that nobody updates once the agent is live.

## Benefits of establishing this best practice

- Standardized lifecycle procedures produce consistent provisioning, operation, and retirement, reducing operational complexity as the portfolio grows.
- Documented lifecycle states and transition criteria create an auditable record of each agent's history for compliance and governance.
- Named owners accelerate incident response. When an agent misbehaves, the team knows who to engage without a search.
- Clean decommissioning helps prevent the slow accumulation of abandoned resources that becomes a cost and security problem over time.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Five stages cover the operational arc of almost any agent:

Each transition should carry explicit criteria, required approvals, validation gates, and documentation requirements, so stage changes are decisions rather than drift.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp01.html#implementation-guidance)

### Implementation steps

1. **Document the five lifecycle stages:** Specify transition criteria, required approver roles, and validation gates for each stage.
2. **Build the agent registry:** Track agent ID, lifecycle state, owner, dependencies, capabilities, and operational metadata in a durable store.
3. **Automate lifecycle state transitions:** Validate criteria, trigger stage-specific actions, and record transitions with attribution, deployments, permission changes, monitoring setup, and decommissioning steps.
4. **Create standardized provisioning templates:** Configure required resources, permissions, and monitoring automatically so new agents enter production with a consistent baseline.
5. **Implement emergency termination switch and decommissioning runbooks:** Include dependency analysis before running so decommissioning doesn't break upstream consumers.
6. **Establish quarterly portfolio reviews:** Identify agents for deprecation or decommissioning, including those built with no-code platforms like [Amazon Quick](https://aws.amazon.com/quicksuite/).

## Resources

**Related best practices:**

- [AGENTOPS01-BP01 Establish well-defined agent roles, responsibilities, and success criteria](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp01.html)
- [AGENTOPS03-BP02 Implement CI/CD pipelines tailored to agentic system deployment (AgentOps)](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp02.html)
- [AGENTOPS03-BP03 Implement agent-specific scaling policies and capacity planning](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops03-bp03.html)
- [AGENTOPS02-BP02 Implement configuration drift detection and remediation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp02.html)
- [AGENTCOST06-BP02 Cost optimize versioning and deployment through efficient artifact management](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost06-bp02.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
