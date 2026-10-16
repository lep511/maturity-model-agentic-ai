# AGENTSEC03-BP01 Implement strong authentication for agent identities

**Pillar:** Security · **Focus area:** AGENTSEC03 — Agent identity and permission management · **Risk if not established:** High

> **Source:** [AWS Well-Architected Framework - Agentic AI Lens: AGENTSEC03-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp01.html) (AWS documentation, June 10, 2026).
> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.

Shared API keys and one-way TLS give agents enough network reachability to be useful and enough ambiguity to be impersonated. Cryptographic identity for both sides of every call, with automated lifecycle and immediate revocation, is the control that makes every agent communication auditable and reversible.

## Desired outcome

- You authenticate all agent-to-agent and agent-to-service communications using strong cryptographic mechanisms, with mutual authentication that helps prevent impersonation and interception.
- You automate certificate lifecycle management so expired certificates don't cause authentication failures or security gaps.
- You can revoke affected agent identities immediately, cutting off unauthorized access within minutes.

## Common anti-patterns

- Using shared API keys or static tokens for agent authentication instead of certificate-based or OAuth mechanisms, producing credentials that are hard to rotate and straightforward to exfiltrate.
- Implementing one-way TLS (server authentication only) without mutual authentication, so any client on a permitted network path can reach the endpoint without proof of its agent identity.
- Managing certificate lifecycles manually, leading to expired certificates that either cause outages or are renewed without proper security review.

## Benefits of establishing this best practice

- Certificate-based or OAuth authentication provides cryptographic proof of identity for both parties in every agent communication.
- Automated certificate lifecycle management reduces the risk of expired certificates causing outages or security gaps.
- CRL and OCSP revocation provides the ability to cut off unauthorized access within minutes when an agent identity is affected.

## Level of risk exposed if this best practice is not established

**High**

## Implementation guidance

Authentication for agents has two distinct jobs: proving the agent is who it claims to be, and proving that to the receiver cryptographically rather than through network-path heuristics. Static credentials fail both tests. They are trivial to copy, hard to rotate, and their holder is indistinguishable from their issuer. The design pattern is cryptographic identity managed centrally, with lifecycle automation and revocation as first-class operations rather than afterthoughts.

[Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-identity.html) handles the OAuth side of that pattern. It provides managed OAuth 2.0 flows and identity federation for agentic workloads, issuing, validating, and rotating tokens without the operational burden of running that infrastructure. Each agent registers in the centralized agent identity directory and receives a unique identity. The GetWorkloadAccessTokenForJWT API issues agent-specific access tokens bound to the requesting agent's identity. The token vault secures OAuth tokens with AWS KMS encryption (customer-managed keys supported) and enforces per-agent access controls so one agent can't retrieve another's tokens.

[Read the full implementation guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp01.html#implementation-guidance)

### Implementation steps

1. **Deploy AgentCore Identity:** Deploy [Amazon Bedrock AgentCore Identity](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore-identity.html) for agent authentication, configure identity federation for cross-service access, and register each agent in the centralized identity directory for unique, trackable identities.
2. **Secure tokens in the vault:** Configure the AgentCore Identity token vault for OAuth token storage using customer-managed AWS KMS keys for encryption, and enforce strict per-agent access controls for credential retrieval.
3. **Issue agent certificates from AWS Private CA:** Set up AWS Private Certificate Authority for agent identity certificates, with automated renewal lifecycles configured.
4. **Enforce mutual TLS end-to-end:** Configure mTLS on all agent-to-agent communication endpoints through Application Load Balancers or Amazon API Gateway with mTLS authentication.
5. **Store keys in Secrets Manager with rotation:** Store all agent private keys and credentials in AWS Secrets Manager with encryption at rest and automatic rotation policies enabled.
6. **Turn on revocation checking:** Implement certificate revocation through CRL or OCSP so affected agent certificates can be invalidated immediately.
7. **Alarm on authentication anomalies:** Configure Amazon GuardDuty to detect unusual authentication patterns and route findings to AWS Security Hub CSPM for centralized security event management.
8. **Review certificate inventory quarterly:** Identify and remediate certificates approaching expiration or using deprecated algorithms on a quarterly cadence.

## Resources

**Related best practices:**

- [AGENTSEC03-BP02 Separate agent and human user permission](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp02.html)
- [AGENTSEC03-BP03 Implement least privilege with dynamic boundaries](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html)
- [AGENTSEC06-BP01 Encrypt and sign inter-agent messages](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec06-bp01.html)

**Related services:**

- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AWS Private CA](https://aws.amazon.com/private-ca/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Amazon GuardDuty](https://aws.amazon.com/guardduty/)
- [AWS Security Hub CSPM](https://aws.amazon.com/security-hub/)
