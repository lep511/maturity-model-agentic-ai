# AGENTCOST02-BP01 Architect tiered model selection for cost-performance optimization

**Pillar:** Cost optimization · **Focus area:** AGENTCOST02 — Model invocation and token cost optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST02-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Running every agent task on the largest available model inflates inference cost by an order of magnitude for work that smaller models handle correctly. Match each task to the cheapest model capable of acceptable quality, and escalate only when confidence drops.

## Desired outcome

- You have agent tasks classified into complexity tiers, with a documented routing policy mapping each tier to a specific foundation model.
- You have cascading patterns that escalate to higher-cost models only when a lower tier's confidence falls below threshold.
- You track cost-per-correct-response across tiers and refresh routing decisions with the data rather than with intuition.

## Common anti-patterns

- Using the largest available model for all agent tasks without assessing task complexity, inflating inference costs for routine operations.
- Hard-coding static model assignments without confidence-based escalation, which either over-provisions routine tasks or under-provisions complex edge cases.
- Tracking aggregate costs without decomposing agent performance by model tier, hiding opportunities to shift workloads to cheaper models.
- Failing to monitor customized model performance after switching to a smaller tier, allowing cost savings to mask hidden quality degradation.

## Benefits of establishing this best practice

- Tiered selection reserves expensive models for genuinely complex reasoning and routes routine tasks to cost-effective alternatives.
- Model cascading minimizes premium model invocations through confidence-based escalation.
- Specialized models for domain-specific tasks deliver higher accuracy at lower cost than general-purpose alternatives.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Task complexity is an important property to measure. At every agent invocation, the reasoning you need is either lightweight (classification, format conversion, intent extraction), moderate (multi-step reasoning, summarization), or genuinely complex (open-ended analysis, multi-constraint optimization). These three classes map to different price points across the [Amazon Bedrock](https://aws.amazon.com/bedrock/) model catalog, and treating them identically means you pay the complex-class price for every low-complexity task. Classifying upfront and routing accordingly is where most of the cost headroom sits.

A lightweight pre-classifier gives you that routing decision without invoking the main model first. Rule-based heuristics or a small model can analyze request characteristics like input length, structured or unstructured format, constraint count, and reasoning depth, assigning scores that map to tier thresholds (for example, below 0.3 for simple, 0.3 to 0.7 for moderate, above 0.7 for complex). The pre-classifier must cost less than the tier price differential to produce net savings on first-attempt routing. For multimodal tasks the principle extends further. Route document extraction to Amazon Bedrock Data Automation and audio interactions to Amazon Nova Sonic rather than sending raw images or audio through expensive general-purpose vision models.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html#implementation-guidance)

### Implementation steps

1. **Classify agent tasks into complexity tiers:** Document a model routing policy mapping each tier (simple, moderate, and complex) to a specific [Amazon Bedrock](https://aws.amazon.com/bedrock/) model, and commit the policy as an architectural decision record so downstream reviewers can audit the rationale.
2. **Select pricing tier per environment:** Use Flex for development and testing, Standard for production, and Priority only for latency-sensitive user-facing agents, and evaluate [Amazon Bedrock Reserved Tier](https://docs.aws.amazon.com/bedrock/latest/userguide/capacity-limits-cost-optimization.html) commitments for consistent high-volume workloads.
3. **Insert a task complexity pre-classifier:** Deploy rule-based heuristics or a small-model call that scores each request on input length, structure, constraint count, and reasoning depth before the main invocation, and make sure the classifier costs less than the tier price differential.
4. **Implement model cascading on confidence:** Have each lower-tier response include a self-assessed confidence score, and escalate to the next tier when confidence falls below the configured threshold rather than retrying at the same tier.
5. **Configure fallback chains per task category:** Define primary, secondary, and tertiary model options, with automatic escalation on timeout or failure instead of retry, so transient failures move up a tier rather than repeating the same cost.
6. **Route non-time-sensitive tasks to batch inference:** Use [Amazon Bedrock batch inference](https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference.html) for report generation, data enrichment, and offline evaluation to capture up to 50% savings over on-demand pricing.
7. **Benchmark specialized compared to general-purpose models:** Run [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) on your actual task distribution, measuring cost-per-correct-response so routing choices are grounded in outcome data.
8. **Review routing policies quarterly:** Use AWS Cost Explorer and Amazon CloudWatch dashboards to inspect observed escalation rates, and adjust tier assignments when cascade escalation patterns indicate mis-tuned thresholds.

## Resources

**Related best practices:**

- [AGENTCOST01-BP01 Use the reflection pattern to design efficient agent reasoning loops](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp01.html)
- [AGENTCOST01-BP04 Design agent hierarchies and delegation patterns that reduce coordination overhead](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01-bp04.html)
- [AGENTCOST02-BP02 Cost optimize token consumption through efficient prompt engineering](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp02.html)
- [AGENTCOST02-BP04 Implement model customization for long-term cost reduction](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp04.html)
- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
