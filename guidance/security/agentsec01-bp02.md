# AGENTSEC01-BP02 Validate and sanitize memory inputs

**Pillar:** Security · **Focus area:** AGENTSEC01 — Secure agent memory and state · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC01-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Unvalidated writes into agent memory let adversarial content persist and influence every subsequent session that reads the same context. Layered validation at ingestion keeps the memory store free of injection payloads, policy-violating content, and context inconsistent with the current task.

## Desired outcome

- You validate all data entering agent memory for type, format, and content before storage, and reject or quarantine policy-violating inputs before they influence agent behavior.
- You detect and block injection attempts at the memory ingestion layer and route suspicious inputs to human review.
- Your memory store contains only schema-conformant, sanitized data that downstream agents can consume safely.

## Common anti-patterns

- Storing raw, unvalidated user inputs directly into agent memory, letting prompt injection payloads persist and influence future sessions as agents build reasoning chains on top of affected context.
- Validating only at the public API boundary while skipping validation for content that enters memory from other write paths, including tool outputs, inter-agent messages, and memory consolidation.
- Failing to scan for encoded or obfuscated injection payloads, missing base64-encoded instructions, Unicode homoglyph substitutions, and other obfuscation that bypasses keyword-based filters but is still interpreted by downstream models.

## Benefits of establishing this best practice

- Multi-layer validation catches issues at syntactic, semantic, and contextual levels before data reaches the memory store.
- Blocking adversarial content at the ingestion boundary helps prevent it from influencing agent reasoning or propagating to downstream agents.
- Validation metrics surface trends in rejection rates and issue patterns, turning ingestion controls into operational signal.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Every write into agent memory is a trust decision. Raw user inputs are the obvious write path, but they are not the only one. Tool outputs arrive from search APIs, databases, and third-party services the agent queries. Inter-agent messages carry content one agent wrote into another's scope, and memory consolidation generates long-term records by summarizing or merging existing events. Each of these is a distinct ingestion path, and each needs the same validation treatment. Validating only at the public API boundary leaves the other three open.

A layered pipeline gives each category of issue somewhere to be caught. Syntactic validation against a JSON Schema rejects wrong types, over-long strings, and missing fields before anything semantic happens. Semantic validation with [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) detects prompt injection attempts, denied topics, and content that violates organizational guidelines through the ApplyGuardrail API, which evaluates content independently of model invocations so you can run it at any point in the pipeline. Contextual validation checks whether an input is consistent with the current task and flags anomalies for review.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp02.html#implementation-guidance)

### Implementation steps

1. **Define JSON schemas for every memory input type:** Specify field types, length limits, allowed values, and required fields so the first validation layer can reject malformed inputs deterministically.
2. **Configure Guardrails for semantic validation:** Configure [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) with denied topics, word filters, and sensitive information filters tuned to your security policies, and use the ApplyGuardrail API so validation is independent of model invocations.
3. **Validate every write path, not just user input:** Apply Guardrails to tool outputs and inter-agent messages as well as user-provided content before any of them reach the memory store.
4. **Validate before create\_event:** Run validation on events before they enter [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html) short-term storage through create\_event, so harmful content doesn't enter the asynchronous long-term extraction pipeline.
5. **Add AWS WAF on API-fronted memory writes:** Deploy AWS WAF managed rule groups on Amazon API Gateway endpoints that accept memory inputs, enforcing network-layer injection filtering before requests reach application code.
6. **Quarantine ambiguous inputs for review:** Route failures into an Amazon SQS queue with agent ID, session ID, timestamp, and source, so humans can review without blocking the pipeline.
7. **Emit validation telemetry:** Publish Amazon CloudWatch metrics for every validation outcome (pass, block, or quarantine) and alarm on elevated rejection rates that suggest an active issue.
8. **Review quarantined inputs regularly:** Use the quarantine queue to identify new attack patterns, update Guardrail configurations, and refine validation rules over time.
9. **Test for injection continually:** Apply penetration testing, static code analysis, and dynamic application security testing (DAST) to the memory write paths as part of regular security validation.
10. **Enforce IAM conditions on CreateEvent:** Use IAM Access Analyzer to validate that memory resource policies follow least privilege, and add policy conditions that restrict which roles can call the CreateEvent API for specific AgentCore Memory resources.

## Resources

**Related best practices:**

- [AGENTSEC01-BP01 Implement memory isolation and integrity controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp01.html)
- [AGENTSEC01-BP03 Monitor for hallucination propagation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec01-bp03.html)
- [AGENTSEC08-BP01 Multi-layer input validation and prompt injection defense](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp01.html)

**Related services:**

- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS WAF](https://aws.amazon.com/waf/)
- [Amazon SQS](https://aws.amazon.com/sqs/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
