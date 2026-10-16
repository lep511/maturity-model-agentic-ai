# AGENTSEC08-BP02 Output filtering for sensitive information

**Pillar:** Security · **Focus area:** AGENTSEC08 — Secure agent inputs and outputs · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC08-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Filtering user-facing responses leaves internal data paths (inter-agent messages, memory writes, audit logs) as open channels for PII and credentials to escape. Scanning every output path with a data classification policy keeps sensitive content inside the agent's authorized handling scope.

## Desired outcome

- You scan agent outputs for PII, credentials, and other sensitive data before returning them to users or downstream systems, with content masked or blocked based on data classification policies.
- Agent outputs containing credentials, private keys, or regulated PII are blocked or masked before they reach end users or external systems.
- You log output filtering decisions for compliance auditing.

## Common anti-patterns

- Relying on the model to self-censor sensitive information, when models do generate outputs containing PII or credentials (especially when that information is in the agent's context from tool outputs or retrieved documents).
- Applying output filtering only to user-facing responses while skipping filtering for outputs passed to other agents or stored in memory, creating data-leakage paths through internal communications.
- Using overly broad masking rules that mask legitimate content alongside sensitive data, degrading output quality to the point users work around the filter.

## Benefits of establishing this best practice

- Data classification enforcement at the agent boundary helps keep sensitive information within the agent's authorized data-handling scope regardless of what the model generates.
- Logged filtering decisions support compliance with data protection regulations.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Every output path is a potential exfiltration path. User-facing responses are the obvious one, but an agent also writes to memory, passes content to other agents, and emits logs. Filtering only the user-facing path leaves the others as open channels for sensitive data, and adversarial inputs designed to exfiltrate data don't consistently target the user-facing channel. The architectural requirement is that every output surface passes through the same filter, not just the ones users see.

[Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-info.html) sensitive information filters cover the data types relevant to most use cases:

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp02.html#implementation-guidance)

### Implementation steps

1. **Configure sensitive information filters:** Set up [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-info.html) with filters for all relevant PII and credential categories, choosing MASK or BLOCK per category based on data classification policy.
2. **Filter every output path:** Apply output filtering as a middleware layer for user-facing responses, inter-agent messages, memory writes, and audit logs.
3. **Filter before short-term memory writes when required:** For compliance requirements that prohibit PII in any stored form, apply Guardrails filtering before writing events to [Amazon Bedrock AgentCore Memory](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/best-practices.html) short-term storage.
4. **Extend with Amazon Comprehend custom entities:** Train Amazon Comprehend custom entity recognizers for organization-specific sensitive data types and integrate them into the filtering pipeline.
5. **Log and alarm on detections:** Log all output filtering decisions with data type, action, and destination metadata, and configure Amazon CloudWatch alarms for elevated sensitive data detection rates.
6. **Review configurations periodically:** Adjust output filtering to match evolving data classification policies and new regulated data types.

## Resources

**Related best practices:**

- [AGENTSEC05-BP01 Implement comprehensive logging and decision artifact storage](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05-bp01.html)
- [AGENTSEC08-BP01 Multi-layer input validation and prompt injection defense](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec08-bp01.html)

**Related services:**

- [Amazon Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Comprehend](https://aws.amazon.com/comprehend/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
