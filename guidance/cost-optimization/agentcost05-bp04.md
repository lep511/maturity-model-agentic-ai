# AGENTCOST05-BP04 Create chargeback and ROI reporting

**Pillar:** Cost optimization · **Focus area:** AGENTCOST05 — Agent cost visibility and attribution · **Risk if not established:** Medium

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTCOST05-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp04.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Raw token counts and execution durations are the wrong unit of measure for business stakeholders deciding whether to fund agent capabilities. Translating technical cost into business metrics like cost-per-customer-interaction and comparing against the manual processes agents replace turns agent economics into something non-technical leaders can evaluate against familiar frameworks.

## Desired outcome

- You translate technical agent costs into business metrics through automated chargeback reports.
- You demonstrate agent ROI by comparing agent costs against the manual processes they replace.
- You allocate cost by business unit to create accountability.
- You provide self-service cost dashboards so business teams can act without engineering bottlenecks.

## Common anti-patterns

- Providing only raw technical cost data (like token counts or Lambda execution times) without converting to business metrics like cost-per-customer-interaction.
- Reporting agent costs in isolation without comparing to the manual processes they replace, reducing the risk of stakeholders evaluating automation ROI.
- Restricting cost data access to engineering teams, creating bottlenecks that delay optimization decisions.
- Presenting only quantitative dashboards without qualitative context, requiring business stakeholders to rely on engineering to interpret cost changes and recommend actions.

## Benefits of establishing this best practice

- Business-aligned metrics enable non-technical stakeholders to evaluate agent investments using familiar frameworks.
- ROI comparison against manual processes demonstrates automation value and justifies continued investment.
- Self-service cost dashboards reduce dependency on engineering for cost analysis, accelerating optimization decisions.

## Level of risk exposed if this best practice is not established

**Medium**

## Implementation guidance

Business metrics work together with technical telemetry, but they require a translation layer to make sense to stakeholders. [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) produces the raw data (session count, token usage, execution duration) through Amazon CloudWatch integration, and [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) tags resources with business dimensions (like business-unit, product-line, and customer-segment). Enabling AWS Cost Explorer tag-based cost allocation generates per-business-unit reports. The translation layer converts those technical units into cost-per-customer-interaction, cost-per-automated-decision, and cost-per-business-outcome, Those are the units that stakeholders can compare against other investments.

ROI demonstration needs a baseline cost model for the manual process the agent replaces: handling time, fully-loaded labor cost, error rate, and throughput limitations. The ROI calculation is the delta between that baseline and the agent's actual cost. Executives may not read CloudWatch dashboards, so build a BI layer with [Amazon Quick](https://aws.amazon.com/quicksuite/) fed by [AWS Cost and Usage Reports](https://aws.amazon.com/aws-cost-management/aws-cost-and-usage-reporting/) and AgentCore Observability data. CloudWatch dashboards remain the operational tool for engineering, while Amazon Quick becomes the executive-facing tool for chargeback and ROI.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp04.html#implementation-guidance)

### Implementation steps

1. **Propagate business dimension tags:** Configure [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html) with business-unit and product-line tags propagated through all agent resources for AWS Cost Explorer reporting.
2. **Build a baseline cost model:** Capture pre-automation process costs (like handling time, fully-loaded labor cost, error rate, and throughput) and implement ROI calculation logic comparing agent costs against the baseline.
3. **Translate technical costs to business metrics:** Implement a cost translation layer that maps raw invocation costs to cost-per-decision and cost-per-task-completion, capturing how many business outcomes each dollar of agent spending delivers.
4. **Build executive-facing BI dashboards:** Use [Amazon Quick](https://aws.amazon.com/quicksuite/) fed by [AWS Cost and Usage Reports](https://aws.amazon.com/aws-cost-management/aws-cost-and-usage-reporting/) and [Amazon Bedrock AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html) data, displaying ROI trends and cost allocation by business unit.
5. **Automate narrative generation:** Invoke a small [Amazon Bedrock](https://aws.amazon.com/bedrock/) model weekly from AWS Lambda to produce plain-language cost summaries that explain cost drivers, optimization actions taken, and specific recommendations with estimated savings.
6. **Keep operational dashboards in CloudWatch:** Use Amazon CloudWatch dashboards for operational cost monitoring by engineering teams, separate from executive-facing reporting.
7. **Establish a monthly review cadence:** Share cost narratives and optimization recommendations with business stakeholders each month, closing the loop between reporting and action.

## Resources

**Related best practices:**

- [AGENTCOST05-BP01 Establish agent-level reasoning cost tracking and attribution](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp01.html)
- [AGENTCOST05-BP03 Design tenant-aware cost allocation for AaaS pricing models](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost05-bp03.html)
- [AGENTCOST07-BP03 Create systematic optimization feedback loops for continuous improvement](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost07-bp03.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Quick](https://aws.amazon.com/quicksuite/)
- [AWS Cost and Usage Reports](https://aws.amazon.com/aws-cost-management/aws-cost-and-usage-reporting/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
