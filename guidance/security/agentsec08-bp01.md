# AGENTSEC08-BP01 Multi-layer input validation and prompt injection defense

**Pillar:** Security · **Focus area:** AGENTSEC08 — Secure agent inputs and outputs · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC08-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agents take input from many surfaces and only one needs to be unvalidated for adversarial content to reach the agent's reasoning process. A layered validation architecture covers every surface, and in particular catches the indirect prompt injection embedded in retrieved external content.

## Desired outcome

- Every input surface has a validation layer appropriate to its risk profile, and no input reaches the agent's reasoning process without passing through at least one validation control.
- You specifically address indirect prompt injection through retrieved external content, which is the surface most commonly missed when validation is applied only to direct user inputs.

## Common anti-patterns

- Applying input validation only to direct user inputs while skipping validation for data retrieved from external sources, letting embedded instructions in web pages, documents, and API responses bypass user-facing validation.
- Validating at one input surface but not others (for example, validating user inputs with Guardrails but not validating tool outputs before they enter the agent's context), creating gaps that can be targeted.
- Defining denied topics with vague or overly broad descriptions that generate false positives on legitimate content, eroding trust and prompting teams to weaken or disable guardrails entirely.

## Benefits of establishing this best practice

- Defense-in-depth architecture where each input surface has validation appropriate to its risk profile helps cover every surface.
- Validation of external content before it enters the agent's context closes the most commonly missed gap: indirect prompt injection.
- Confidence-based assessment modes let organizations tune validation strictness per filter category based on the likelihood and impact of each risk scenario.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Input surfaces to an agent are not one thing. Direct user messages, tool outputs, inter-agent messages, retrieved external content (web pages, documents, API responses), and memory reads are all paths by which data reaches the agent's context, and each needs a validation control. Surface-specific guidance lives in AGENTSEC01-BP02 (memory inputs), AGENTSEC02-BP02 (tool parameters), and AGENTSEC04-BP01 (goal alignment guardrails). This best practice is the architectural framing and focuses on the cross-cutting concern those others don't cover: indirect prompt injection through external content retrieval.

External content retrieval is the most commonly missed surface. When an agent uses RAG, web browsing, or API calls to gather information during task execution, the retrieved content becomes part of the agent's context, and adversarial instructions embedded in that content (indirect prompt injection) influence the agent's behavior as effectively as a direct user injection. Apply [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) with prompt attack detection to all retrieved content before it enters the agent's context, and implement content source validation that restricts the agent to retrieving content from approved domains or data sources where feasible.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp01.html#implementation-guidance)

### Implementation steps

1. **Map input surfaces and assign controls:** Identify all input surfaces for each agent and the validation control covering each surface, flagging any that are currently unvalidated.
2. **Validate retrieved external content:** Configure [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) with prompt attack detection and apply it to external content (RAG results, web content, API responses) before it enters the agent's context.
3. **Pick assessment mode by risk:** Use block mode for prompt attack detection filters and consider detect mode for content safety filters on lower-risk applications, implementing application-level logic to make risk-proportionate decisions based on returned confidence scores.
4. **Write precise denied topics:** Use the full 1,000-character limit for each denied topic definition and populate all five sample prompt fields with representative examples that illustrate the boundary between restricted and permitted content.
5. **Capture ApplyGuardrail telemetry:** Set outputScope to full on all ApplyGuardrail API calls and implement a telemetry pipeline to capture assessment outcomes, confidence scores, and blocked content in Amazon CloudWatch.
6. **Run the Guardrails Optimizer:** Run the Amazon Bedrock Guardrails Optimizer with an annotated test dataset during initial setup, then schedule periodic re-optimization (monthly or quarterly) using samples from production traffic.
7. **Restrict content sources where feasible:** Implement content source validation that restricts agents to retrieving content from approved domains or data sources.
8. **Verify surface-specific controls exist:** Confirm that the controls described in AGENTSEC01-BP02 (memory inputs), AGENTSEC02-BP02 (tool parameters), and AGENTSEC04-BP01 (goal alignment guardrails) are implemented for each applicable agent.
9. **Log and review blocked inputs:** Log all blocked inputs across surfaces and review patterns periodically to identify new techniques and surfaces that may need additional coverage.

## Resources

**Related best practices:**

- [AGENTSEC01-BP02 Validate and sanitize memory inputs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp02.html)
- [AGENTSEC02-BP02 Validate tool inputs and outputs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec02-bp02.html)
- [AGENTSEC04-BP01 Implement guardrails and alignment controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp01.html)
- [AGENTSEC08-BP02 Output filtering for sensitive information](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp02.html)

**Related services:**

- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
