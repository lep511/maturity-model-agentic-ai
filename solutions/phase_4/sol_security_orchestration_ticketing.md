# Security Orchestration & Ticketing - SOAR Integration

This is a process-oriented recommendation with integration patterns. Below is a framework for tracking every incident with ownership, SLAs, and KPIs using Security Hub + EventBridge + ticketing.

---

## Architecture

```
GuardDuty/Security Hub → EventBridge → Lambda → SOAR/Ticketing
                                                      ↓
                                              Auto-enrichment (IoC lookup)
                                                      ↓
                                              SLA timer + escalation
                                                      ↓
                                              Response automation (optional)
```

---

## Integration with Ticketing (Jira Example)

```python
import json
import os
import boto3
from urllib.request import Request, urlopen

JIRA_URL = os.environ['JIRA_URL']
JIRA_TOKEN = os.environ['JIRA_TOKEN']
JIRA_PROJECT = os.environ['JIRA_PROJECT']

def lambda_handler(event, context):
    """Create a Jira ticket from Security Hub finding"""
    detail = event['detail']
    finding = detail['findings'][0] if 'findings' in detail else detail

    title = finding.get('Title', 'Security Finding')
    severity = finding.get('Severity', {}).get('Label', 'MEDIUM')
    account = finding.get('AwsAccountId', 'N/A')
    description = finding.get('Description', '')
    resource_id = finding.get('Resources', [{}])[0].get('Id', 'N/A')

    # Map severity to Jira priority
    priority_map = {'CRITICAL': 'Highest', 'HIGH': 'High', 'MEDIUM': 'Medium', 'LOW': 'Low'}

    ticket = {
        "fields": {
            "project": {"key": JIRA_PROJECT},
            "summary": f"[{severity}] {title}",
            "description": f"Account: {account}\nResource: {resource_id}\n\n{description}",
            "issuetype": {"name": "Bug"},
            "priority": {"name": priority_map.get(severity, 'Medium')},
            "labels": ["security-finding", f"severity-{severity.lower()}"]
        }
    }

    req = Request(
        f"{JIRA_URL}/rest/api/2/issue",
        data=json.dumps(ticket).encode(),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Basic {JIRA_TOKEN}'
        }
    )
    response = urlopen(req)
    return json.loads(response.read())
```

---

## SLA Framework

| Severity | Acknowledge | Contain | Resolve | Escalation |
|----------|------------|---------|---------|------------|
| CRITICAL | 15 min | 1 hour | 24 hours | Auto-escalate to VP at 30 min |
| HIGH | 1 hour | 4 hours | 72 hours | Auto-escalate to Director at 2 hours |
| MEDIUM | 4 hours | 24 hours | 2 weeks | Auto-escalate to Manager at 8 hours |
| LOW | 24 hours | 1 week | 1 month | Weekly report |

---

## KPIs Per Incident Phase

| Phase | KPI | Target |
|-------|-----|--------|
| **Detect** | Mean Time to Detect (MTTD) | < 5 min (automated) |
| **Analysis** | Time to triage and classify | < 30 min |
| **Containment** | Mean Time to Contain (MTTC) | < 1 hour (critical) |
| **Eradication** | Time to remove attacker access | < 4 hours |
| **Recovery** | Time to restore normal operations | < 8 hours |
| **Total** | Mean Time to Resolve (MTTR) | < 24 hours (critical) |

---

## SOAR Platform Options

| Platform | Type | AWS Integration |
|----------|------|-----------------|
| **Splunk SOAR** | Commercial | Security Hub via EventBridge |
| **Palo Alto Cortex XSOAR** | Commercial | Security Hub + GuardDuty apps |
| **TheHive** | Open source | EventBridge → Lambda → TheHive API |
| **Jira + Automation** | DIY | EventBridge → Lambda → Jira API |
| **AWS Security Hub + Step Functions** | Native | Direct integration, no third-party |

---

## Important notes

- **Every security incident must have a tracked ticket** with clear ownership and SLA.
- **Auto-escalate** tickets breaching acknowledgment SLAs — don't rely on humans to remember.
- **Enrich tickets** with asset context (owner via tags) and IoC threat intelligence lookups.
- **Document every significant action** for forensics and post-incident review.
- Track KPIs **per incident phase** (Detect → Analysis → Containment → Eradication → Recovery) and report regularly.
- SOAR solutions combine ticketing and automated response — both integrate with Security Hub via EventBridge/SQS.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/security-orchestration-ticketing/).
