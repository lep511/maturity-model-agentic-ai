# AGENTREL06-BP03 Regularly test degraded system performance

**Pillar:** Reliability · **Focus area:** AGENTREL06 — Legacy system integration · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTREL06-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Resilience claims that have never been tested under real failure conditions are just aspirations. Regular chaos engineering, fault injection, and load testing under constrained resources reveal the gaps in fallback coverage while the environment is safe to break.

## Desired outcome

- You have experiment templates for the failure scenarios most likely to affect agent reliability.
- You have documented acceptance criteria for each scenario, covering expected fallback activation, acceptable degradation, and recovery time.
- You run fault-injection experiments at least monthly and track findings through a resilience improvement backlog.

## Common anti-patterns

- Testing only happy-path scenarios, discovering resilience gaps only during production incidents.
- Running degraded testing infrequently, allowing resilience regressions to accumulate between cycles.
- Testing individual components in isolation without full-workflow failure scenarios.

## Benefits of establishing this best practice

- Resilience gaps get discovered before they reach production incidents.
- Fallback mechanisms are validated against real failure conditions rather than hypothetical ones.
- Resilience assurance keeps pace with system evolution through regular testing cycles.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

[AWS Fault Injection Service](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html) is the managed way to inject controlled failures into agent infrastructure, throttling, node failures, network partitions, and observe system behavior. The experiment is only as useful as the acceptance criteria it is compared against, so every scenario needs documented expectations. Define which fallback should activate, what capability degradation is acceptable, and how long recovery should take. Running the experiment without criteria gives you an interesting demo. Running it with criteria gives you a regression test.

Monthly is the minimum frequency that keeps resilience regressions from accumulating between cycles. Integrating degraded testing into CI/CD blocks production deployment when tests fail, which is where resilience assurance actually gets enforced. Run the experiments in non-production environments scoped tightly enough that you are not causing incidents you were trying to prevent.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp03.html#implementation-guidance)

### Implementation steps

1. **Create FIS experiment templates for high-risk scenarios:** Build [AWS Fault Injection Service](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html) templates for the failure modes most likely to affect agent reliability, scoped to non-production environments.
2. **Define acceptance criteria per scenario:** Document expected fallback activation, acceptable degradation, and recovery time so each experiment has a pass/fail bar.
3. **Integrate degraded testing into CI/CD:** Block production deployment when tests fail so resilience assurance is enforced rather than aspirational.
4. **Run experiments at least monthly:** Schedule FIS experiments on a regular cadence and track results to detect resilience regressions.
5. **Run quarterly game days:** Exercise operational runbooks, alerting, and team response procedures under controlled but realistic failure conditions.

## Resources

**Related best practices:**

- [AGENTREL06-BP01 Develop agent-based integrations with existing or legacy systems](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp01.html)
- [AGENTREL06-BP02 Establish fallback mechanisms for legacy system degradation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp02.html)
- [AGENTREL06-BP04 Implement idempotent task execution patterns](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp04.html)

**Related services:**

- [AWS Fault Injection Service](https://aws.amazon.com/fis/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
