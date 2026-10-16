# AGENTSEC09-BP02 Conduct context-aware penetration testing with multi-agent attack simulation

**Pillar:** Security · **Focus area:** AGENTSEC09 — Agent vulnerability scanning and penetration testing · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC09-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Generic scanners miss vulnerabilities that only surface in agent orchestration, tool parameter construction, and inter-agent delegation. Context-aware testing driven by specialized attacker agents that adapt to what the application reveals finds the chained exploits that static scripts can't reach.

## Desired outcome

- You use context-aware, multi-agent attack simulation for penetration testing that adapts to the specific application under test.
- The testing system develops deep understanding of the application's architecture, data flows, and agent interactions, then executes sophisticated attack chains combining multiple vulnerability types.
- Findings are validated through actual exploitation, prioritized by real-world exploitability, and documented with reproducible attack paths and ready-to-implement fixes.

## Common anti-patterns

- Running generic vulnerability scanners against agentic AI systems without adapting test scenarios to the agent's specific capabilities and tool integrations, missing tool parameter injection, memory poisoning, and delegation-chain privilege escalation.
- Testing individual agent components in isolation without exercising multi-agent coordination paths, missing trust boundary violations and cascading failures from a compromised agent in an orchestration chain.
- Relying on predefined test scripts that don't adapt based on application responses, missing vulnerabilities that require dynamic exploration because agentic systems behave differently based on context and prior interactions.

## Benefits of establishing this best practice

- Context-aware testing adapts to the specific application, discovering vulnerabilities that static test scripts and generic scanners miss.
- Actual exploitation validates findings, reducing false positives and letting teams prioritize based on real risk.
- Specialized agents collaborate on reconnaissance, vulnerability analysis, exploit validation, and finding prioritization, identifying chained vulnerabilities that combine information disclosure with privilege escalation.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Penetration testing that chases agent vulnerabilities has to look like the attack it is simulating. Attacker agents don't run the same script on every target. They map the surface, probe for weaknesses, adapt to responses, and chain findings. Testing tools need to do the same or they miss exactly the scenarios that matter most for agentic systems.

A multi-agent penetration testing system orchestrates specialized security agents collaboratively. The system begins with baseline scanning to establish coverage, then conducts broad reconnaissance to map the application surface and identify initial attack vectors. Building on these findings, it dynamically generates focused test tasks tailored to the specific application context, reasoning about discovered endpoints, business logic patterns, and potential vulnerability chains.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp02.html#implementation-guidance)

### Implementation steps

1. **Provide application context to the testing agent:** Configure [AWS Security Agent](https://aws.amazon.com/security-agent/) with target application details including URLs, authentication credentials (stored in AWS Secrets Manager), source code, and architecture documentation.
2. **Run tests across the full surface:** Execute on-demand penetration tests that exercise agent orchestration endpoints, tool invocation paths, and multi-agent communication channels.
3. **Triage validated findings by exploitability:** Review findings with reproducible attack paths, impact analysis, and suggested code fixes, and prioritize remediation based on CVSS scores and actual exploitability.
4. **Add agent-specific scenarios manually:** Supplement automated testing with scenarios targeting prompt injection chains, tool parameter manipulation, and multi-agent trust boundary violations.
5. **Track posture over time:** Store penetration test results and compare them across test cycles to measure security posture improvement.

## Resources

**Related best practices:**

- [AGENTSEC07-BP05 Regular security assessments and red teaming](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp05.html)
- [AGENTSEC02-BP02 Validate tool inputs and outputs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp02.html)
- [AGENTSEC09-BP01 Integrate AI-powered vulnerability scanning across the development lifecycle](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp01.html)

**Related services:**

- [AWS Security Agent](https://aws.amazon.com/security-agent/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
