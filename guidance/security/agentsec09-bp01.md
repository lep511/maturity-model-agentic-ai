# AGENTSEC09-BP01 Integrate AI-powered vulnerability scanning across the development lifecycle

**Pillar:** Security · **Focus area:** AGENTSEC09 — Agent vulnerability scanning and penetration testing · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC09-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Pattern-matching scanners find common bugs but miss context-dependent flaws in agent orchestration, tool interactions, and authorization chains. AI-powered scanning that reasons about code and design documents the way a human security researcher does catches these issues at the phase when remediation is cheapest.

## Desired outcome

- Vulnerability scanning is embedded at every phase of the agentic AI development lifecycle, covering design documents, pull requests, and deployed applications.
- You review design documents for security risks before code is written, analyze pull requests for common and agent-specific vulnerabilities during development, and continually scan deployed applications for emerging threats.
- Findings carry severity ratings, confidence scores, and practical remediation guidance so teams can prioritize and fix issues efficiently.

## Common anti-patterns

- Relying on rule-based static analysis that matches known vulnerability patterns, missing context-dependent issues in agent orchestration logic, insecure tool parameter handling, or broken access control in multi-agent delegation chains.
- Performing security scanning only at deployment time rather than across design and development phases, letting vulnerabilities accumulate and making late-discovery remediation expensive.
- Treating AI-generated code the same as human-written code for security review, ignoring the distinct vulnerability patterns AI coding assistants introduce (hallucinated API calls, insecure default configurations, and outdated library usage).

## Benefits of establishing this best practice

- Design-phase security reviews identify architectural risks before code is written, reducing remediation cost and development delays.
- AI-powered scanning that reasons about application context and agent behavior catches complex vulnerabilities that pattern-matching tools miss.
- Automated scanning integrated into CI/CD pipelines scales security expertise across development teams without creating bottlenecks.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Pattern matching against known signatures isn't enough for agentic systems. A SQL injection signature doesn't catch a broken multi-agent authorization chain, and a missing-input-validation rule doesn't catch a tool parameter manipulated through a prompt injection. The scanning that reaches those issues has to reason about how components interact, trace data flows through the orchestration layer, and understand what the agent was actually intended to do. That is the capability AI-powered scanning adds, and why it is effective on agent-specific flaws.

Deploy scanning across the full lifecycle. At the design phase, use tools that analyze architecture documents, product specifications, and technical designs for security risks before code is written. During development, integrate scanning into code review workflows to analyze pull requests for both common vulnerabilities (SQL injection, missing input validation) and agent-specific issues (insecure tool invocations, insufficient permission scoping). At deployment, run on-demand scans against running applications to validate that security controls hold under realistic conditions.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp01.html#implementation-guidance)

### Implementation steps

1. **Codify security requirements centrally:** Define organizational security requirements (approved libraries, logging standards, data access policies) and configure them in [AWS Security Agent](https://aws.amazon.com/security-agent/) for automated enforcement across development teams.
2. **Run design-phase reviews:** Configure AWS Security Agent to analyze architecture documents and technical specifications before development begins.
3. **Enable PR-level code review:** Connect AWS Security Agent to your code repositories to cover both human-written and AI-generated code on every pull request.
4. **Configure multi-stage verification:** Set up AI-powered scanning with multi-stage verification to reduce false positives and assign severity ratings to validated findings.
5. **Triage and track to resolution:** Route validated vulnerabilities to the appropriate team with remediation guidance, and track findings through to resolution.

## Resources

**Related best practices:**

- [AGENTSEC07-BP05 Regular security assessments and red teaming](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec07-bp05.html)
- [AGENTSEC08-BP01 Multi-layer input validation and prompt injection defense](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp01.html)
- [AGENTSEC09-BP02 Conduct context-aware penetration testing with multi-agent attack simulation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec09-bp02.html)

**Related services:**

- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
- [Amazon CodeGuru Security](https://aws.amazon.com/codeguru/)
