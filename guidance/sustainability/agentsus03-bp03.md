# AGENTSUS03-BP03 Maintain comprehensive specifications for agents and agentic systems

**Pillar:** Sustainability · **Focus area:** AGENTSUS03 — Agent governance · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSUS03-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents without specifications become systems that only their original developers understand. Thorough documentation, purpose, boundaries, integration points, and decision logic keep institutional knowledge available to the whole team and verify that agent behavior is traceable as teams and business processes change.

## Desired outcome

- Each deployed agent has a specification covering business purpose, operational boundaries, decision criteria, and escalation paths.
- Specifications are stored in version-controlled artifacts alongside the agent implementation.
- A centralized agent catalog lets team members discover, review, and reuse agent capabilities.
- Runtime behavior is documented automatically and compared against design specifications to detect drift.
- Governance requires specification validation before agents reach production.

## Common anti-patterns

- Deploying agents without thorough documentation of purpose, boundaries, or decision-making logic, so institutional knowledge is held only by the original developers.
- Letting documentation fall out of date as agents evolve, producing specifications that describe yesterday's behavior rather than today's.
- Treating agent configuration as code only, without capturing the expert decision-making patterns and business logic rationale that informed the design.
- Skipping specification validation in the promotion path, so agents reach production with documentation that doesn't match their actual behavior.

## Benefits of establishing this best practice

- Institutional knowledge survives personnel changes and organizational restructuring, preserved in documentation rather than memory.
- Teams develop against specifications informed by business process, reducing the experimentation cost of each new agent.
- Documented decision logic and operational boundaries make oversight of automated processes tractable.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

A specification decouples the agent's behavior from its author. When the original developer moves on, the next maintainer picks up the system through the specification rather than through reverse engineering. Amazon Bedrock AgentCore enables declarative specifications that capture prompt templates, tool definitions, guardrail policies, and orchestration logic as version-controlled artifacts. The documentation and the configuration are the same artifact rather than two copies that drift.

Spec-driven development tools like Kiro extend the discipline into how agents get written in the first place. When specifications are the starting point rather than an afterthought, documentation is produced as a byproduct of development rather than a retrospective task. The upfront investment in writing the specification is recovered during code review, testing, and ongoing evolution, because every subsequent change happens against a clear baseline.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp03.html#implementation-guidance)

### Implementation steps

1. **Set documentation standards:** Require each agent to carry specifications using AgentCore's declarative configuration artifacts. Each specification must cover:
2. **Adopt spec-driven development:** Use Kiro or similar spec-driven tools so documentation is produced as a natural byproduct of the development process rather than a retrospective task.
3. **Register agents in a central catalog:** Record each agent in [Amazon Bedrock AgentCore Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html) with the following metadata:
4. **Generate runtime documentation:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to produce runtime documentation that can be compared against design specifications to detect drift.
5. **Gate promotion on specification validation:** Require documentation validation as part of the pipeline that promotes agents to production, so production agents always have current specifications.

## Resources

**Related best practices:**

- [AGENTSUS03-BP01 Maintain organizational skills and competencies](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp01.html)
- [AGENTSUS03-BP04 Decommission unused agents and prevent agent sprawl](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus03-bp04.html)
- [OPS11-BP01 Have a process for continuous improvement](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/ops_evolve_ops_process_cont_imp.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
