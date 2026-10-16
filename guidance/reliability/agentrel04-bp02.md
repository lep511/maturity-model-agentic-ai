# AGENTREL04-BP02 Classify agents with a comprehensive capability taxonomy

**Pillar:** Reliability · **Focus area:** AGENTREL04 — Multi-agent orchestration · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL04-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel04-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Orchestrators that pick agents by hardcoded identifiers can't adapt when the preferred agent is unavailable or when a new equivalent arrives. A structured capability taxonomy gives the orchestrator a basis for routing decisions, and substitution becomes automatic rather than a redeployment.

## Desired outcome

- You have every agent registered with capability categories, skills, input/output constraints, performance profiles, and dependencies.
- Your orchestrators consult the registry to select agents rather than hardcoding identifiers.
- You keep the registry current through the CI/CD pipeline so it reflects the deployed state.

## Common anti-patterns

- Hardcoding agent selection in orchestration logic without consulting a capability registry, reducing the risk of dynamic routing.
- Defining capabilities at too coarse a granularity, missing the nuances of skills, limitations, and resource requirements.
- Letting the capability registry drift from the deployed state when agents are updated.

## Benefits of establishing this best practice

- Deterministic task routing through structured capability matching rather than trial and error.
- Automatic agent substitution when preferred agents are unavailable, without manual reconfiguration.
- Fewer task failures from capability mismatches through precise capability-to-task matching.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

A capability registry is only useful if it stays current. To keep it current, integrate registration into the deployment pipeline. An agent reaches production by going through a step that also updates its entry in [Amazon Bedrock AgentCore Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html). Skip that step and the registry becomes a documentation artifact that diverges from reality within weeks.

AgentCore Registry's semantic capability search makes the registry useful at runtime. Orchestrators discover agents through natural language queries that match task requirements to agent capabilities without hardcoded routing logic. The quality of search results depends heavily on the quality of the record descriptions. Descriptions that explain what each agent does and the problems it solves in plain language produce good matches. Descriptions that read like function signatures produce poor matches.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel04-bp02.html#implementation-guidance)

### Implementation steps

1. **Register every agent in AgentCore Registry:** Populate [Amazon Bedrock AgentCore Registry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html) with capability categories, skills, constraints, and performance profiles for each agent.
2. **Automate registration in the CI/CD pipeline:** Make the deployment step that updates production also update the registry so the two stay in sync.
3. **Use AgentCore Registry's hybrid search to match tasks to agents:** Write record descriptions in natural language that explain what each agent does and the problems it solves, so semantic search produces accurate matches.
4. **Configure orchestrators to consult the registry:** Replace hardcoded agent identifiers with registry lookups.
5. **Monitor routing effectiveness:** Use [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) to find capability mismatches and gaps.

## Resources

**Related best practices:**

- [AGENTREL04-BP01 Implement the arbiter agent pattern for coordinated multi-agent systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel04-bp01.html)
- [AGENTREL04-BP03 Implement fallback mechanisms and graceful degradation for collaborative workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel04-bp03.html)
- [AGENTREL04-BP04 Implement resilient control planes for agent coordination](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel04-bp04.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
