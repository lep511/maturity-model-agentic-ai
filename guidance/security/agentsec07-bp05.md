# AGENTSEC07-BP05 Regular security assessments and red teaming

**Pillar:** Security · **Focus area:** AGENTSEC07 — Human oversight protection and agent containment · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC07-BP05](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp05.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Untested security controls degrade quietly as techniques evolve and configurations drift. A combination of continuous automated scanning and periodic human-led red team exercises validates that guardrails, detection rules, and response procedures still work against current attacks.

## Desired outcome

- You run automated security scanning continuously against agent deployments (on each deploy and on schedule) and conduct human-led red team exercises on a regular cadence with scenarios targeting agent manipulation, including prompt injection, goal hijacking, and tool misuse.
- You document findings, track them to remediation, and use them to update security controls and detection rules.

## Common anti-patterns

- Conducting generic application security assessments without agent-specific scenarios, missing prompt injection, memory poisoning, and multi-agent coordination issues that traditional testing doesn't cover.
- Performing red team exercises only at initial deployment without scheduling regular assessments, missing techniques that emerge as the threat environment evolves.
- Not tracking findings to remediation, letting identified issues persist so the assessment produces work but no posture improvement.
- Conducting red team and blue team activities in isolation without purple team collaboration, limiting the knowledge transfer that improves detection and response.

## Benefits of establishing this best practice

- Realistic testing confirms guardrails, detection rules, and response procedures work against current techniques.
- Assessment findings drive updates to guardrail configurations, permission boundaries, and detection rules in a continuous feedback loop.
- Purple team activities transfer knowledge from red to blue teams, improving the organization's ability to detect and respond to agent-specific issues.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

The assessment cadence needs to match the risk level of each agent deployment. Automated scanning runs continuously, and manual red team exercises run on a schedule. For automated agentic testing, [AWS Security Agent](https://aws.amazon.com/security-agent/) provides on-demand penetration testing that executes attack chains adapted to the target application, covering prompt injection, jailbreaking, goal hijacking, and related patterns (see AGENTSEC09-BP02 for integrating it into broader penetration testing workflows). Supplement automated testing with manual exercises that explore novel scenarios specific to your agent architecture.

Red team scenarios need structure. The [OWASP Top 10 for Agentic Applications (2026)](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) covers agent manipulation risks specifically, prompt injection, tool misuse, identity and privilege abuse, and agent behavior hijacking, and the [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) covers model-level risks that still apply. Build a scenario library that covers multi-agent coordination issues, memory poisoning, tool misuse, and human-in-the-loop bypass techniques, and document each scenario with description, expected detection mechanism, and success criteria.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp05.html#implementation-guidance)

### Implementation steps

1. **Establish an assessment schedule:** Set a cadence appropriate for each agent deployment's risk level.
2. **Build a scenario library:** Develop red team scenarios based on the OWASP Top 10 for Agentic Applications (primary) and the OWASP Top 10 for LLM Applications (supplementary), covering prompt injection, memory poisoning, tool misuse, and HITL bypass.
3. **Integrate automated agentic testing:** Deploy agentic AI red teaming tools and include them in the assessment workflow for automated coverage of common patterns.
4. **Measure quality impact before and after:** Run [Amazon Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/aws/amazon-bedrock-agentcore-adds-quality-evaluations-and-policy-controls-for-deploying-trusted-ai-agents/) before and after red team exercises to measure quality impact and refine evaluator configurations.
5. **Persist and map findings:** Store scenarios, results, and remediation tracking in durable, versioned storage (Amazon S3 with versioning enabled), and map findings to your compliance control framework for audit evidence.
6. **Run purple team sessions:** Update detection rules, guardrail configurations, and incident response runbooks based on each assessment cycle's findings.

## Resources

**Related best practices:**

- [AGENTSEC04-BP01 Implement guardrails and alignment controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp01.html)
- [AGENTSEC07-BP04 Behavioral anomaly detection and agent containment](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp04.html)
- [AGENTSEC08-BP01 Multi-layer input validation and prompt injection defense](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp01.html)

**Related services:**

- [Amazon S3](https://aws.amazon.com/s3/)
- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
