# AGENTSEC06-BP02 Implement workflow orchestration security controls

**Pillar:** Security · **Focus area:** AGENTSEC06 — Secure multi-agent orchestration · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC06-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

The orchestration layer is where a single weak check cascades into a system-wide failure. Access controls on state machines, input validation on transitions, and circuit breakers on agent tasks keep multi-agent workflows on approved execution paths instead of unexpected ones.

## Desired outcome

- The workflow orchestration layer enforces strict access controls that help prevent unauthorized modification of workflow definitions or execution state.
- State machine validation helps keep workflows on expected execution patterns, and circuit breakers are designed to stop failures in one agent from cascading through the entire workflow.
- You log all workflow executions with enough detail to reconstruct the execution path for security investigations.

## Common anti-patterns

- Granting broad IAM permissions to start, stop, or modify Step Functions workflows without restricting access to specific state machines, letting any principal with workflow permissions modify or trigger any workflow in the account.
- Not implementing input validation in state machine definitions, letting crafted input payloads direct workflows into unexpected execution paths.
- Failing to implement circuit breakers, so a single failing agent cascades failures through the entire workflow with no automatic mechanism to stop retrying a broken step.
- Using overly permissive retry configurations, letting an agent repeatedly attempt the same operation before any circuit breaker triggers and potentially amplifying the original issue.

## Benefits of establishing this best practice

- State validation and input schema enforcement keep workflows within defined boundaries.
- Circuit breakers automatically stop cascading failures and route affected executions to quarantine paths for investigation.
- AWS Step Functions logging captures every state transition, input, output, and error event for full execution reconstructability.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Two orchestration patterns are in scope here. AWS Step Functions state machines handle deterministic workflows where the execution path is defined in JSON and the orchestrator enforces sequencing. [Amazon Bedrock AgentCore Runtime](https://aws.amazon.com/blogs/machine-learning/introducing-agent-to-agent-protocol-support-in-amazon-bedrock-agentcore-runtime/) with the A2A protocol handles agent-delegated workflows where an orchestrator agent dynamically decides which sub-agents to invoke. Most of the controls below apply to both, and the differences are called out inline.

Start with IAM. Configure policies for AWS Step Functions that restrict workflow start, stop, and modification permissions to specific principals and state machines, use resource-based policies on state machine definitions to help prevent unauthorized modification, and implement IAM Conditions that restrict execution to approved input schemas. Manage state machine definitions as infrastructure as code through AWS CloudFormation or AWS CDK, which helps prevent informal modifications and provides version-controlled change history.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp02.html#implementation-guidance)

### Implementation steps

1. **Scope Step Functions IAM to specific state machines:** Configure IAM policies with least-privilege access scoped to specific state machines and execution operations.
2. **Manage state machines as IaC:** Use AWS CloudFormation or AWS CDK for state machine definitions to help prevent unauthorized modifications and keep version history.
3. **Validate inputs inside state machines:** Implement input validation in state machine definitions using JSONPath filtering and AWS Lambda validation functions, rejecting inputs that deviate from expected schemas.
4. **Configure circuit breakers with catch states:** Set conservative retry limits and implement catch states that route failures to quarantine paths rather than retrying indefinitely.
5. **Log every execution at the ALL level:** Enable Step Functions execution logging to Amazon CloudWatch Logs at the ALL level with retention policies aligned to compliance requirements.
6. **Alarm on circuit breaker events:** Create Amazon CloudWatch alarms for circuit breaker triggers and Amazon EventBridge rules to route workflow security events to the monitoring pipeline.

## Resources

**Related best practices:**

- [AGENTSEC04-BP02 Human-in-the-loop for critical decisions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html)
- [AGENTSEC06-BP01 Encrypt and sign inter-agent messages](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp01.html)
- [AGENTSEC06-BP03 Establish trust boundaries between agents](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp03.html)
- [AGENTREL07-BP01 Design workflows in stages with incremental recovery](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp01.html)
- [AGENTREL07-BP02 Enable automatic recovery from agent execution failures](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel07-bp02.html)

**Related services:**

- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [AWS Identity and Access Management](https://aws.amazon.com/iam/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
