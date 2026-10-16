# AGENTSEC06-BP03 Establish trust boundaries between agents

**Pillar:** Security · **Focus area:** AGENTSEC06 — Secure multi-agent orchestration · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC06-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp03.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

A flat agent network gives every affected agent a direct path to every other one. Trust zones segmented at the network and IAM layers, with application-layer verification of caller identity, stop one affected agent from escalating across the whole system.

## Desired outcome

- Agents operate within clearly defined trust zones, accepting instructions only from authorized coordinators and rejecting requests from agents outside their trust boundary.
- Network segmentation enforces trust boundaries at the infrastructure layer and IAM policies enforce them at the API layer.
- An affected agent in one trust zone can't directly issue instructions to agents in higher-trust zones without passing through authorization controls.

## Common anti-patterns

- Deploying all agents in a flat network without segmentation, letting any agent communicate directly with any other regardless of trust level so an issue spreads laterally.
- Relying on network-level trust boundaries alone without application-layer authorization, so any agent that reaches another agent's endpoint can issue instructions.
- Not validating the identity of the coordinator agent before executing instructions, letting any agent impersonate a coordinator and issue unauthorized commands.
- Treating all internal agents as implicitly trusted while implementing trust boundaries only for external-facing agents, producing a flat internal trust model that amplifies the impact of any internal issue.

## Benefits of establishing this best practice

- Trust zone segmentation contains the impact of an affected agent to its own trust zone, helping prevent lateral movement.
- Layered enforcement at both the network level (VPC segmentation, security groups) and the application level (IAM policies, agent identity validation) provides defense-in-depth.
- Documented trust architecture supports automated compliance checks that catch drift as configurations evolve.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Trust boundary controls apply regardless of the inter-agent protocol used, whether A2A, MCP, or custom REST. The network-layer controls (VPC segmentation, security groups, AWS PrivateLink) and IAM-layer controls (resource-based policies, IAM Conditions) enforce boundaries independent of the application protocol. Protocol-specific guidance applies on top of these common controls.

A trust zone architecture starts with tiers that reflect actual risk: public, internal operational, privileged. Enforce the tiers at the network with separate Amazon VPCs or VPC security groups, and use Amazon VPC peering or AWS Transit Gateway with route table controls to restrict inter-zone communication to only the required paths. Network segmentation alone doesn't verify the caller's identity, so pair it with application-layer authorization.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp03.html#implementation-guidance)

### Implementation steps

1. **Design trust zone tiers:** Define tiers (public, internal operational, privileged) and document the authorized communication paths between zones.
2. **Segment at the network layer:** Create separate Amazon VPCs or security groups for each trust zone and configure network controls (VPC peering, AWS Transit Gateway route tables) to enforce zone boundaries.
3. **Enforce identity at the application layer:** For agents on [Amazon Bedrock AgentCore Runtime](https://aws.amazon.com/blogs/machine-learning/introducing-agent-to-agent-protocol-support-in-amazon-bedrock-agentcore-runtime/), configure A2A agent card discovery with authentication requirements that enforce trust-level validation. For agents not on AgentCore Runtime, use Amazon API Gateway with AWS Lambda authorizers for custom trust boundary enforcement.
4. **Apply resource-based IAM policies:** List only authorized coordinator principals in each agent endpoint's resource policy, with IAM Conditions restricting invocations by trust zone.
5. **Reinforce at the tool layer with Policy:** Configure Cedar policies in [Policy in Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-policy-in-amazon-bedrock-agentcore/) with conditions on calling principal identity and trust level.
6. **Keep cross-zone traffic private:** Implement AWS PrivateLink for cross-zone agent communications.
7. **Validate configurations continually:** Deploy AWS Config managed rules (vpc-sg-open-only-to-authorized-ports, restricted-ssh, vpc-sg-port-restriction-check) for baseline hygiene and custom AWS Config rules for trust-zone-specific validation, alarming on any change that would create unauthorized cross-zone connectivity.

## Resources

**Related best practices:**

- [AGENTSEC03-BP03 Implement least privilege with dynamic boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html)
- [AGENTSEC06-BP01 Encrypt and sign inter-agent messages](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp01.html)
- [AGENTSEC06-BP02 Implement workflow orchestration security controls](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp02.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Identity and Access Management](https://aws.amazon.com/iam/)
- [Amazon VPC](https://aws.amazon.com/vpc/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [AWS PrivateLink](https://aws.amazon.com/privatelink/)
- [AWS Config](https://aws.amazon.com/config/)
