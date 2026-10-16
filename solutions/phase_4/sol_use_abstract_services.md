# Use Abstract Services - Lambda / Fargate

This is a process-oriented recommendation with migration guidance. Below is a decision framework for choosing serverless over EC2 and a migration pattern.

---

## Decision Framework

### When to Use Serverless (Lambda/Fargate)

| Criteria | Lambda | Fargate | EC2 |
|----------|--------|---------|-----|
| Execution duration | < 15 min | Long-running | Long-running |
| Request-driven workloads | Best fit | Good fit | Overprovisioned |
| Container-based | No | Yes | Yes |
| OS-level control needed | No | No | Yes |
| GPU workloads | No | No | Yes |
| Compliance requiring dedicated hosts | No | No | Yes |
| Patching responsibility | AWS | AWS | You |
| Security attack surface | Minimal | Low | Full OS |

### Default Recommendation

```markdown
New workload? → Start with Lambda or Fargate
Only use EC2 when:
- GPU/specialized hardware required
- OS-level kernel access needed
- Specific compliance mandates dedicated hosts
- Legacy application cannot be containerized
```

---

## Security Benefits of Abstract Services

| Concern | EC2 (You manage) | Lambda/Fargate (AWS manages) |
|---------|-------------------|------------------------------|
| OS patching | Your responsibility | AWS handles automatically |
| Runtime updates | Your responsibility | AWS handles automatically |
| CIS hardening | Your responsibility | Built-in |
| Anti-malware | Your responsibility | Managed environment |
| SSH/RDP access | Must be secured | Does not exist |
| Network exposure | Security Groups | No inbound by default |
| Instance compromise | Full OS access for attacker | Ephemeral, limited blast |

---

## Migration Pattern: EC2 → Fargate

```bash
# Step 1: Containerize the application
# Create Dockerfile for existing application
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080"]

# Step 2: Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
docker build -t my-app .
docker tag my-app:latest $ECR_URI/my-app:latest
docker push $ECR_URI/my-app:latest

# Step 3: Deploy to Fargate (Terraform)
```

```bash
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "app"
    image = "${aws_ecr_repository.app.repository_url}:latest"
    portMappings = [{ containerPort = 8080 }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"  = "/ecs/my-app"
        "awslogs-region" = "us-east-1"
      }
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = "my-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }
}
```

---

## Tracking Migration Progress

| Metric | How to Measure | Target |
|--------|---------------|--------|
| EC2 instance count | AWS Config / Cost Explorer | Decreasing over time |
| Serverless workload % | Tag-based inventory | Increasing each quarter |
| Patching workload | Inspector findings backlog | Decreasing as EC2 reduces |
| Security incidents on compute | GuardDuty findings | Fewer EC2-related findings |

---

## Important notes

- Serverless services eliminate the need to **manage and patch underlying infrastructure** — AWS handles it.
- Reduces attack surface: **no OS vulnerabilities to track**, no instances to harden, no SSH to secure.
- Prefer abstract services **as the default architectural choice** for new workloads.
- The reduced infrastructure footprint should be reflected in a **smaller patching and vulnerability management workload**.
- Evaluate **every new workload** for serverless suitability before defaulting to EC2.
- For more information, refer to the [documentation](https://maturitymodel.security.aws.dev/en/4.-optimized/serverless/).
