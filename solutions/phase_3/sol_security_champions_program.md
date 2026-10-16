# Security Champions Program

This is a process-oriented recommendation. Below is a framework for building and scaling a Security Champions program with structured training, incentives, and measurable outcomes.

---

## Program Structure

### Role Definition

```markdown
## Security Champion Responsibilities
- Own day-to-day security practices for their team
- Perform or facilitate threat modeling during design
- Write security test cases and review security-related PRs
- Manage vulnerability findings for their team's components
- Coach peers on secure coding and AWS security best practices
- Attend monthly Champions sync with central security team
- Escalate complex security decisions to the central team

## Time Commitment
- 10-20% of work time dedicated to security activities
- Monthly 1-hour sync with security team
- Quarterly training/certification time
```

---

## Implementation Phases

### Phase 1: Foundation (Month 1-2)

```markdown
- [ ] Secure executive sponsorship (CEO/CIO level)
- [ ] Define Champion role and responsibilities
- [ ] Identify 1 Champion per development team (volunteers preferred)
- [ ] Create a dedicated Slack/Teams channel for Champions
- [ ] Schedule kickoff meeting with all Champions
```

### Phase 2: Training (Month 2-4)

```markdown
- [ ] Mandatory training path:
  - AWS Security Fundamentals (Skill Builder)
  - OWASP Top 10 for Cloud
  - Threat modeling with STRIDE
  - Secure coding for [your primary languages]
  - Incident response basics

- [ ] Hands-on labs:
  - AWS Security Workshops (workshops.aws)
  - CloudGoat (vulnerable AWS environment)
  - AWS Jams (gamified challenges)
```

### Phase 3: Activation (Month 4-6)

```markdown
- [ ] Champions begin conducting threat models for new features
- [ ] Champions review security findings for their team
- [ ] Monthly sync meetings start (knowledge sharing, Q&A)
- [ ] Champions get early access to new security tools/policies
- [ ] Create a Champions wiki with FAQs, approved patterns, contacts
```

### Phase 4: Scale (Month 6+)

```markdown
- [ ] Gamification: leaderboard, points for activities
- [ ] Recognition: quarterly awards, conference budget
- [ ] Advanced training: AWS Security Specialty certification
- [ ] Champions present at company all-hands
- [ ] Peer mentoring: senior Champions mentor new ones
```

---

## Incentive Framework

| Incentive | Description | Frequency |
|-----------|-------------|-----------|
| Training budget | Certification exams, courses, conferences | Annual |
| Recognition | Public acknowledgment at all-hands | Quarterly |
| Exclusive access | Early access to new tools, beta programs | Ongoing |
| Gamification | Points, leaderboard, badges | Monthly |
| Career growth | Champions role on performance reviews | Annual |
| Swag | Security Champion merchandise | On milestones |
| Game Days | AWS Security Game Days (team events) | Semi-annual |

---

## Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Team coverage | 100% of dev teams have a Champion | Roster count |
| Threat models completed | 1 per new feature/service | Tracked in wiki |
| Vulnerabilities in production | Trending down | Security Hub/Inspector |
| Mean time to remediate | < 14 days for critical | Vulnerability tracker |
| Training completion | 100% within 3 months | LMS tracking |
| Champion retention | > 80% year-over-year | Program roster |
| Developer satisfaction | > 4/5 with security support | Survey |

---

## Monthly Sync Agenda

```markdown
1. (10 min) Security team updates — new threats, policy changes
2. (15 min) Champion show-and-tell — share a win or lesson learned
3. (20 min) Training topic — deep-dive on a relevant security topic
4. (15 min) Open Q&A — Champions bring questions from their teams
```

---

## Important notes

- **Executive sponsorship** (CEO/CIO level) is critical — without it, teams deprioritize Champion time.
- Champions are **not replacements** for a central security team — they are force multipliers.
- **Incentivize consistently** — awards, exclusive training, gamification, and career recognition.
- Reference the **AWS Security Guardians** blog post for how Amazon built and scaled its own program.
- Start with **volunteers** — forced participation creates resentment, not engagement.
- Make the program **visible** — Champions should be recognized, not invisible.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/3.-efficient/security-champions/).
