# AGENTOPS07-BP02 Establish operational knowledge management systems

**Pillar:** Operational excellence · **Focus area:** AGENTOPS07 — Operational recovery and consumption monitoring · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTOPS07-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Teams that capture what they learn from incidents build institutional memory that survives personnel changes. Teams that don't lose the insight the moment the person who had it leaves, and pay the same lesson twice.

## Desired outcome

- Operational knowledge about agent behavior, failure modes, and resolution procedures is captured systematically and accessible to all team members.
- Post-incident reviews consistently produce practical insights incorporated into runbooks and operational procedures.
- Institutional knowledge survives personnel changes, enabling new team members to become effective quickly.
- Knowledge about successful interventions is captured alongside failure modes, so what works is remembered as reliably as what failed.

## Common anti-patterns

- Relying on knowledge held by individual team members rather than documented operational knowledge, creating single points of failure when people leave.
- Conducting post-incident reviews that produce reports but don't result in practical changes to runbooks or procedures.
- Storing operational knowledge in team-specific repositories inaccessible to other teams, reducing the risk of sharing and creating duplicate effort.
- Treating knowledge management as a documentation exercise rather than an active operational practice, producing documents that are created once and never updated.
- Failing to capture knowledge about successful interventions alongside failure modes, missing the opportunity to document what works and why.

## Benefits of establishing this best practice

- A systematic knowledge management system captures individual operational experience as organizational learning, making the whole team more effective over time.
- Documented operational knowledge enables consistent responses to common scenarios, reducing variability in how team members handle similar situations.
- Semantic search exposes relevant knowledge even when users don't know exact document names or categories.
- Quarterly audits keep the knowledge base current as systems and procedures evolve.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

A centralized knowledge repository is the starting point, but the search experience decides whether anyone uses it. [Amazon Bedrock Knowledge Bases](https://aws.amazon.com/bedrock/knowledge-bases/) provides semantic search over operational documentation, so natural-language queries return relevant entries even when users don't know the exact title. Structure the knowledge base with categories for agent behavioral patterns, common failure modes and resolutions, operational procedures, and post-incident learnings. Amazon Bedrock retrieval-augmented generation turns the knowledge base into something queryable through natural language rather than keyword matching.

Structured, post-incident reviews that capture timeline, root cause, resolution steps, and preventive measures convert each significant incident into durable knowledge. Tie review outputs directly to knowledge base entries so that a new failure mode gets documented the same week it was diagnosed.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp02.html#implementation-guidance)

### Implementation steps

1. **Deploy a centralized knowledge repository:** Use [Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) for semantic search over operational documentation.
2. **Define categories and templates:** Cover behavioral patterns, failure modes, procedures, and post-incident learnings with consistent structure.
3. **Establish a post-incident review process:** Use structured templates that feed directly into the knowledge base so learning captured during review lands as durable knowledge.
4. **Implement contribution workflows:** Make it straightforward for team members to add and update entries without heavy process overhead.
5. **Audit quarterly:** Review accuracy, completeness, and relevance, and retire outdated entries.

## Resources

**Related best practices:**

- [AGENTOPS07-BP03 Augment change management to accommodate technical improvements and business requirements](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops07-bp03.xml.html)
- [AGENTOPS05-BP03 Implement structured logging and comprehensive audit trails](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/../agentops05/agentops05-bp03.xml.html)
- [AGENTOPS02-BP04 Maintain feedback control loops for continuous improvement](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/../agentops02/agentops02-bp04.xml.html)
- [AGENTCOST07-BP03 Create systematic optimization feedback loops for continuous improvement](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/../../cost-optimization-pillar/agentcost07/agentcost07-bp03.xml.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon S3](https://aws.amazon.com/s3/)
