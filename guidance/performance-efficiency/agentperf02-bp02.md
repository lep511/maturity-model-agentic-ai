# AGENTPERF02-BP02 Implement task-appropriate model selection strategies

**Pillar:** Performance efficiency · **Focus area:** AGENTPERF02 — Core processing and reasoning pipeline optimization · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTPERF02-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp02.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Agent tasks vary widely in the reasoning they require, but default routing often sends every task to the same large model, paying the latency cost of a heavyweight model even for work a smaller one resolves as well. Matching model capability to task demand is one of the highest-use performance decisions in an agent system, because inference latency and throughput scale directly with model size. Done systematically, model selection reduces per-task latency without sacrificing quality on complex reasoning.

## Desired outcome

- You have agent tasks classified by reasoning complexity, with each class mapped to the smallest model that meets its quality bar.
- You have routing logic that directs each request to its assigned model at runtime, with a cascading fallback to a more capable model when the assigned model produces low-confidence or failed outputs.
- You have model assignments validated against benchmarked quality and latency on the workload's own task distribution rather than on generic leaderboard rankings.
- You have model selection treated as a runtime-configurable parameter so new model releases can be evaluated and rolled out without redeploying the agent.
- You have inference latency and task quality tracked per task class, so routing decisions are continually validated against both.

## Common anti-patterns

- Using a single large model for every agent task regardless of complexity, paying the latency and cost premium of a heavyweight model on work a smaller one resolves as well.
- Using a small or general-purpose model for tasks that require deeper reasoning, producing low-quality outputs that trigger retries, extra reasoning iterations, or manual escalation and eroding the latency savings the small model was meant to provide.
- Selecting models from general benchmark rankings rather than from benchmarks run on the workload's own task distribution, producing choices that are optimal for the leaderboard but suboptimal for actual traffic.
- Treating model choice as a one-time architectural decision baked into application code, so evaluating or rolling out a newly released model requires a code change and redeploy rather than a configuration update.
- Operating without a fallback path when the assigned model returns low-confidence or failing outputs, forcing the pipeline to return a poor answer or fail entirely rather than escalating that request to a more capable model.

## Benefits of establishing this best practice

- Routing lightweight work to smaller, faster models avoids paying the inference time of a large model for tasks that don't require it.
- Explicit routing to capable models and cascading fallback when a smaller model underperforms protect user-facing accuracy on complex tasks.
- Benchmarks against the workload's actual task distribution continually improve assignments as new evaluation data accumulates.
- Runtime-configurable selection lets capability and latency improvements from new models reach production without redeploy cycles.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

The reasoning pipeline's dominant cost component is the inference call, and inference latency and throughput scale directly with model size. Typical agent workloads have heterogeneous task mixes and simple classification alongside multi-step reasoning, so applying the largest model uniformly forces the blended latency and cost to track the most capable option even though most requests don't need it. Systematic model selection shifts this by assigning each task to the smallest model that still meets its quality bar.

Two approaches fit together:

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp02.html#implementation-guidance)

### Implementation steps

1. **Classify agent tasks by reasoning complexity:** Group the workload's tasks into classes based on the reasoning they require, for example, single-step extraction or classification, structured multi-step reasoning over known steps, and open-ended investigation. Document representative examples per class so routing decisions are auditable and can be revisited as task distributions shift. Use the classification as the input to model assignment rather than letting each caller pick a model case by case.
2. **Benchmark candidate models on the workload's own task distribution:** Build an evaluation set representative of production traffic and score candidate models against it using [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html) or an equivalent evaluation harness. Capture quality signals (correctness, goal success rate, tool-trajectory match) alongside latency and tokens so you can identify the smallest model meeting the quality bar for each class. Treat leaderboard rankings as a starting shortlist, not as the decision.
3. **Map each task class to a model or model tier:** Define a small set of tiers, for example, fast, standard, and advanced, and assign each class to the tier that benchmarks demonstrate is sufficient. For each tier, select a specific model or Amazon Bedrock inference profile. Where routing within a family is the goal, [Amazon Bedrock intelligent prompt routing](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-routing.html) can make the per-request pick automatically. For document-heavy tasks, consider [Amazon Bedrock Data Automation](https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html) as the right example rather than a general-purpose vision LLM.
4. **Implement routing logic that dispatches requests to the assigned model at runtime:** Resolve the task-class-to-model mapping at the start of each request and issue the inference call against the chosen model. When crossing providers or model families, a framework abstraction such as [Strands Agents model providers](https://strandsagents.com/docs/user-guide/concepts/model-providers/) keeps the routing code stable as providers change underneath it.
5. **Configure a cascading fallback to a more capable model for low-confidence or failing outputs:** Define structured signals, confidence score below a threshold, schema validation failure, parse error, or an explicit incomplete response, that escalate the specific request to a more capable model. Limit the escalation to a single step so tail latency stays predictable, and log both the primary and fallback decision for each request that escalates.
6. **Externalize model assignments and routing rules as runtime configuration:** Hold model identifiers, task-class-to-tier mappings, and fallback rules in [AWS AppConfig](https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html) feature flags (or an equivalent config service) and read them at request time. Decoupling selection from deployment lets new models be evaluated, promoted, or rolled back without redeploying the agent.
7. **Roll out model changes progressively with automated rollback:** Use [AWS AppConfig deployment strategies](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-deployment-strategy-create.html) to shift traffic to a new model in steps with bake-time validation, and attach CloudWatch alarms on latency and quality so the change rolls back automatically when the alarm fires. Treating a model swap as a monitored deployment makes frequent model updates safe.
8. **Emit per-task-class telemetry for latency, tokens, quality, and fallback rate:** Publish per-class metrics so the effect of each routing decision is visible on dashboards and can be alarmed. Use [Amazon CloudWatch generative AI observability](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/GenAI-observability.html) together with [AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-telemetry.html) to attribute latency, tokens, and evaluation scores to the class and model that served each request.
9. **Review routing decisions against production telemetry on a defined cadence:** Schedule periodic reviews of per-class latency distributions, fallback-escalation rates, and quality scores, and re-run AgentCore Evaluations against newly released models using the same task-distribution benchmark. Promote, demote, or re-tier models based on observed data rather than provider release cadence.

## Resources

**Related best practices:**

- [AGENTPERF01-BP03 Profile end-to-end agent latency and identify optimization targets](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp03.html)
- [AGENTPERF02-BP01 Design efficient reasoning pipelines](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp01.html)
- [AGENTPERF02-BP03 Optimize agent execution paths for reduced latency](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp03.html)
- [AGENTPERF02-BP04 Optimize streaming responses and time-to-first-token for agent interactions](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp04.html)

**Related services:**

- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS AppConfig](https://aws.amazon.com/systems-manager/features/appconfig/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
