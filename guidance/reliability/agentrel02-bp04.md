# AGENTREL02-BP04 Develop clear instruction protocols for agents

**Pillar:** Reliability · **Focus area:** AGENTREL02 — Predictable task execution · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL02-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Ad-hoc prompts interpreted slightly differently by each model call produce unpredictable behavior, and the problem multiplies in multi-agent workflows. Standardized instruction templates, versioned prompts, and explicit handoff schemas reduce ambiguity and make regressions traceable to a specific version.

## Desired outcome

- You have a canonical system prompt template that every agent follows, covering role, capabilities, constraints, output format, and escalation behavior.
- You version prompt templates centrally and log the version used on every invocation.
- You have explicit handoff schemas for multi-agent delegation so receiving agents get unambiguous instructions.

## Common anti-patterns

- Running ad-hoc prompting without standardized formats, producing inconsistent interpretation of objectives across agents.
- Omitting explicit handoff procedures for multi-agent orchestration, leaving downstream agents to guess their role.
- Skipping prompt versioning, so rolling back a problematic change requires archaeology rather than a configuration flip.

## Benefits of establishing this best practice

- Predictable behavior through standardized instruction formats that reduce ambiguity.
- Reliable multi-agent orchestration through explicit handoff procedures and context preservation.
- Faster debugging and refinement through consistent patterns you can test systematically.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Define one structure that every system prompt follows. This structure should cover role definition, capability description, constraint specification, output format requirements, and escalation behavior. Make the template the starting point for any new agent. When every agent inherits the same structure, reviewers can check the important parts at a glance and regressions are more visible because the diffs are small.

Template storage is where versioning happens. Store prompts in a versioned configuration store so changes don't require redeployment. Assign version identifiers to every template and log the version used in every invocation through [Amazon Bedrock model invocation logging](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html). When a regression appears, the version ID on the failing trace tells you exactly which template is to blame.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp04.html#implementation-guidance)

### Implementation steps

1. **Define a canonical system prompt template:** Establish a common structure for role, capabilities, constraints, output format, and escalation behavior that every agent inherits.
2. **Store prompt templates in a versioned configuration store:** Centralize management so prompt updates don't require redeployment.
3. **Design explicit handoff message schemas:** Define a canonical handoff message format for multi-agent delegation with task identifiers, message bodies, and callback mechanisms.
4. **Use AgentCore Evaluations to compare prompt versions:** Run [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) on candidate versions before migrating production traffic.
5. **Run automated contract tests in CI/CD:** Include adversarial prompt injection detection so protocol regressions don't ship.

## Resources

**Related best practices:**

- [AGENTREL02-BP01 Design agents for specific and atomic tasks](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp01.html)
- [AGENTREL02-BP03 Implement behavioral anomaly detection and monitoring](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp03.html)
- [AGENTREL02-BP05 Establish tiered human oversight and approval workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02-bp05.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
