# AGENTOPS07-BP03 Augment change management to accommodate technical improvements and business requirements

**Pillar:** Operational excellence · **Focus area:** AGENTOPS07 — Operational recovery and consumption monitoring · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS07-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

A change management process built only for technical changes doesn't account for how agents actually evolve. Prompt tweaks, tool additions, and model upgrades all carry business implications that pure technical review doesn't catch. A process that engages both technical and business stakeholders, proportional to change scope, keeps agents aligned with the objectives they exist to serve.

## Desired outcome

- Every agent change, technical improvement or business requirement follows a documented change management process.
- Technical and business stakeholders are engaged appropriately based on change scope and impact.
- The business justification for each change is documented and traceable, so agent evolution is purposeful.
- Agents evolve in sync with organizational changes rather than drifting out of alignment.

## Common anti-patterns

- Managing agent changes through purely technical change management processes without business stakeholder involvement, allowing agents to drift out of alignment with business objectives.
- Treating all agent changes as technical changes without assessing business impact, missing changes that affect business processes, customer experience, or compliance requirements.
- Implementing change management processes so heavyweight that teams bypass them for urgent changes, creating an informal shadow process that lacks governance and traceability.
- Failing to synchronize agent changes with broader organizational changes (like process updates, policy changes, and regulatory updates), causing agents to operate based on outdated business rules.

## Benefits of establishing this best practice

- Documented change management with business justification creates an auditable record of purposeful, governed agent evolution.
- Change management captures business justification and impact assessment, creating a feedback loop that informs future prioritization.
- Two-dimensional classification (technical scope, business impact) helps the right stakeholders engage with the right changes rather than everyone reviewing everything.
- Synchronization with organizational changes helps prevent agents from operating under outdated business rules.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Classifying changes along two dimensions, technical scope and business impact, helps keep your processes proportional.

Technical scope captures what kind of change it is, like prompt update, tool change, model change, or architecture change. Business impact captures what it affects, like none, minor adjustment, significant process change, or compliance-affecting. The combination determines required approval workflows, documentation depth, and testing rigor. A prompt wording tweak with no business impact moves through the process quickly, while a new tool integration with compliance implications triggers the full review.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp03.html#implementation-guidance)

### Implementation steps

1. **Define a change classification matrix:** Map technical scope and business impact to required approvals and documentation.
2. **Implement change request workflows:** Use structured templates capturing both technical and business justification.
3. **Establish periodic business alignment reviews:** Validate that agent capabilities match current business processes, policies, and regulatory requirements.
4. **Maintain agent-to-business-process mappings:** Configure notifications when processes are updated so dependent agents can be reviewed.
5. **Track change management metrics:** Monitor change volume, approval cycle times, and alignment measures to keep the process proportional.

## Resources

**Related best practices:**

- [AGENTOPS07-BP01 Implement automated response and recovery mechanisms](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp01.xml.html)
- [AGENTOPS07-BP02 Establish operational knowledge management systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp02.xml.html)
- [AGENTOPS06-BP03 Establish SME-driven validation and business approval workflows](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/../agentops06/agentops06-bp03.xml.html)
- [AGENTOPS03-BP01 Define an agent lifecycle with clear SME ownership, testing, and governance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/../agentops03/agentops03-bp01.xml.html)

**Related services:**

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
