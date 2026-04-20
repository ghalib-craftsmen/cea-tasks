# Jenkins CI/CD Pipeline

## Overview

This directory contains a Dockerized Jenkins setup that automates the deployment of the Meal Headcount Planner backend to AWS. The pipeline builds the Lambda package, plans infrastructure changes via Terraform, waits for manual approval, and then applies the changes.

## Prerequisites

- Docker and Docker Compose installed
- AWS credentials (access key, secret key, session token)
- Application secrets: Discord bot token, Discord public key, application ID, role IDs, guild ID, GChat space/audience/service account key

## Setup

1. Build and start Jenkins:

   ```bash
   cd jenkins
   docker compose up --build -d
   ```

2. Get the initial admin password:

   ```bash
   docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```

3. Open http://localhost:8080 and complete the setup wizard
4. To stop: `docker compose down` (data persists) or `docker compose down -v` (removes data)

## Configuration

### Jenkins Credentials

Go to **Manage Jenkins > Credentials > System > Global credentials** and add each as "Secret text":

| Credential ID | Description |
|---------------|-------------|
| `aws-access-key-id` | AWS access key |
| `aws-secret-access-key` | AWS secret key |
| `aws-session-token` | AWS session token |
| `discord-public-key` | Discord app public key |
| `discord-bot-token` | Discord bot token |
| `discord-application-id` | Discord application ID |
| `discord-role-team-lead-id` | Team Lead role ID |
| `discord-role-admin-id` | Admin role ID |
| `discord-guild-id` | Discord guild/server ID |
| `gchat-authorized-space` | Google Chat space name |
| `gchat-audience` | Google Chat audience |
| `gchat-service-account-key` | GCP service account JSON key |

### Pipeline Job

1. **New Item** > name it > select **Pipeline**
2. Set **Definition** to "Pipeline script from SCM"
3. **SCM:** Git, **Repository URL:** your repo
4. **Script Path:** `Task-2/Jenkinsfile`
5. Save and click **Build Now**

## Architecture

```
GitHub Push
    │
    ▼
Jenkins (Docker, localhost:8080)
    │
    ├── 1. Checkout code
    ├── 2. Build Lambda package (build.sh)
    ├── 3. terraform init (local backend)
    ├── 4. terraform plan (credentials from Jenkins store)
    ├── 5. Manual Approval ("Proceed with deployment?")
    └── 6. terraform apply → AWS
                              ├── Lambda Functions
                              ├── API Gateway
                              ├── DynamoDB
                              ├── IAM Roles
                              └── SSM Parameters
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Jenkins LTS + Terraform + Python pre-installed |
| `docker-compose.yaml` | Runs Jenkins on port 8080 with persistent volume |
| `plugins.txt` | Plugins installed at build time (Pipeline, Git, Credentials, etc.) |
| `../Jenkinsfile` | Declarative pipeline definition |

## Pipeline Stages

The `Jenkinsfile` defines 6 sequential stages:

| # | Stage | What it does |
|---|-------|--------------|
| 1 | Checkout | Pulls latest code from the connected GitHub repo |
| 2 | Build Package | Runs `build.sh` to zip the Lambda deployment artifact |
| 3 | Terraform Init | Initializes providers and local backend in `terraform/` |
| 4 | Terraform Plan | Generates execution plan with credentials injected from Jenkins store; saves to `tfplan` |
| 5 | Approval | Pauses pipeline — displays "Proceed with deployment to AWS?" and waits for human to click Deploy or Abort |
| 6 | Terraform Apply | Applies the saved plan (only the exact changes shown in step 4) |

After completion, `terraform output` is printed on success and `tfplan` is archived as a build artifact.

## Key Design Decisions

- **Local Terraform state** — no remote backend; kept simple for now
- **Saved plan file** — `terraform plan -out=tfplan` ensures apply matches exactly what was reviewed
- **Manual gate** — pipeline halts until a human clicks "Deploy"
- **No hardcoded secrets** — everything injected via Jenkins `withCredentials`
- **Persistent data** — named Docker volume `jenkins_home` survives container restarts
