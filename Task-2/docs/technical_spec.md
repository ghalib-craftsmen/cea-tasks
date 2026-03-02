# Meal Headcount Planner — Discord Bot Integration

**Version:** 1.0    
**Date:** 2026-03-02    
**Status:** Draft    

---

## 1. Overview

### 1.1 Purpose

This document defines the technical architecture, security model, and feature scope for integrating a Discord bot into the Meal Headcount Planner (MHP) system. It serves as the authoritative reference for implementation decisions during Task 2 and guides future infrastructure provisioning.

### 1.2 Project Summary

The Meal Headcount Planner (MHP) is an internal tool that helps kitchen/logistics teams accurately predict daily meal counts. Task 2 evolves the system from a standalone web tool into a production-grade platform by adding:

- A **Discord bot** as a self-service input channel for employees.
- A **serverless AWS backend** using Lambda, API Gateway, and DynamoDB.
- A **structured web dashboard** with real-time updates and component-based UI.

### 1.3 Scope of This Document

This specification covers:

- Proposed AWS serverless architecture (not yet deployed via IaC).
- Security model for Discord webhook validation and role-based authorization.
- Feature logic for Dynamic Cut-off Time and Event Meal workflows.
- Python project structure and dependency definitions.

---

## 2. Proposed AWS Architecture

> **Note:** Infrastructure as Code (IaC) and CI/CD pipelines are out of scope for this iteration. This section documents the target architecture to guide future provisioning.

### 2.1 Serverless Request Flow

```text
Discord User
     │
     │  Slash Command / Interaction
     ▼
Discord API
     │
     │  HTTP POST (signed webhook)
     ▼
API Gateway (HTTP API)
     │
     │  Proxy integration
     ▼
AWS Lambda (FastAPI via Mangum)
     │
     ├──► DynamoDB (read / write meal records)
     │
     └──► Discord API (send follow-up response)
```

1. A Discord user triggers a slash command or button interaction.
2. Discord sends a signed HTTP POST to the **API Gateway HTTP API** endpoint.
3. API Gateway proxies the raw request (including signature headers) to a single **Lambda function**.
4. The Lambda runs a **FastAPI** application adapted by **Mangum**, which:
   - Validates the Ed25519 signature (reject immediately if invalid).
   - Parses the interaction payload and routes it to the appropriate handler.
   - Reads from / writes to **DynamoDB**.
   - Returns a JSON response to Discord (or defers and sends a follow-up).

### 2.2 Service Selection & Cost Rationale

| Service | Tier / Config | Rationale |
| --- | --- | --- |
| **API Gateway** | HTTP API | ~70% cheaper than REST API; sufficient for webhook proxy with no transformation needs. |
| **AWS Lambda** | `arm64` (Graviton2), 512 MB | Graviton2 offers ~20% better price-performance vs x86. Cold starts are acceptable for low-frequency internal tooling. |
| **DynamoDB** | On-Demand capacity | No provisioned capacity cost at rest; scales automatically with usage spikes (e.g., morning headcount updates). |
| **CloudWatch Logs** | Default retention (7 days) | Sufficient for operational debugging without long-term storage cost. |

### 2.3 DynamoDB Data Model (Proposed)

**Table: `mhp-meal-records`**

| Attribute | Type | Role |
| --- | --- | --- |
| `PK` | `String` | Partition key — `USER#{discord_user_id}` |
| `SK` | `String` | Sort key — `DATE#{YYYY-MM-DD}` |
| `meal_opt_in` | `Boolean` | Whether the user is having a meal that day. |
| `work_location` | `String` | `OFFICE` or `WFH`. |
| `meal_type` | `String` | e.g., `STANDARD`, `VEGETARIAN`. |
| `updated_at` | `String` | ISO 8601 timestamp of last change. |
| `updated_by` | `String` | Discord user ID of who made the change (self or admin). |

**Access patterns:**

- Get a single user's record for a date → `PK + SK` (direct lookup).
- Get all records for a date → GSI on `SK` (date-based fan-out).
- Get all records for a team on a date → GSI on `SK` filtered by team attribute.

---

## 3. Security Model

### 3.1 Request Authentication — Discord Ed25519 Signature Validation

Every request from Discord includes two headers that must be validated **before any business logic executes**:

| Header | Description |
| --- | --- |
| `X-Signature-Ed25519` | Hex-encoded Ed25519 signature of the raw request body. |
| `X-Signature-Timestamp` | Unix timestamp included in the signed message to prevent replay attacks. |

**Validation algorithm:**

1. Concatenate `timestamp + raw_body` as bytes.
2. Verify the signature against Discord's public key using `pynacl` (`nacl.signing.VerifyKey`).
3. If verification fails → return `HTTP 401` immediately, no further processing.
4. If the timestamp is more than 5 minutes old → return `HTTP 401` (replay attack protection).

This check runs as a FastAPI dependency, applied globally to all interaction endpoints.

```python
# Pseudocode — implementation detail, not production code
def verify_discord_signature(
    signature: str,  # from X-Signature-Ed25519
    timestamp: str,  # from X-Signature-Timestamp
    body: bytes,
    public_key: str,  # DISCORD_PUBLIC_KEY env var
) -> None:
    message = timestamp.encode() + body
    verify_key = VerifyKey(bytes.fromhex(public_key))
    verify_key.verify(message, bytes.fromhex(signature))
    # raises nacl.exceptions.BadSignatureError on failure
```

### 3.2 Authorization — Discord Role-Based Access Control

Authorization is enforced at the command handler level based on the Discord roles present in the interaction payload (`member.roles`). No external role store is needed; Discord's role system is the source of truth.

| Role | Permission Level | Allowed Actions |
| --- | --- | --- |
| `@everyone` (Employee) | Standard | Update own meal opt-in, update own work location, view own status. |
| `@Team Lead` | Elevated | All employee actions + view team headcount summary for any date. |
| `@Admin` / `@Logistics` | Full | All team lead actions + view org-wide summary, override any employee's record. |

**Authorization flow:**

1. Extract `member.roles` from the validated interaction payload.
2. Match against configured role IDs (stored as environment variables, e.g., `ROLE_TEAM_LEAD_ID`, `ROLE_ADMIN_ID`).
3. If the user's roles do not satisfy the required permission level for the invoked command → return an ephemeral error message (visible only to the user).

### 3.3 Environment Variable Management

Sensitive configuration is managed via a `Settings` class (Pydantic `BaseSettings`), loading values from environment variables. No secrets are hardcoded.

| Variable | Description |
| --- | --- |
| `DISCORD_PUBLIC_KEY` | Discord application's Ed25519 public key for signature verification. |
| `DISCORD_BOT_TOKEN` | Bot token for sending follow-up messages via Discord REST API. |
| `DYNAMODB_TABLE_NAME` | DynamoDB table name (defaults to `mhp-meal-records`). |
| `AWS_REGION` | AWS region for DynamoDB client (defaults to `ap-southeast-1`). |
| `ROLE_TEAM_LEAD_ID` | Discord role ID for Team Lead permission level. |
| `ROLE_ADMIN_ID` | Discord role ID for Admin/Logistics permission level. |

> In this iteration, these variables are set manually in the Lambda console or a local `.env` file. IaC-managed Secrets Manager integration is deferred to a future iteration.

---

## 4. Feature Specification

### 4.1 Dynamic Cut-off Time

The cut-off time is the daily deadline after which no more meal changes are accepted for the next working day. It is "dynamic" because it can be configured per-day rather than being a fixed global value.

**Default behaviour:**

- The default cut-off is **10:00 AM** on the day of the meal (same-day changes allowed up to that point).
- All times are evaluated in the **server's local timezone**, configurable via the `TIMEZONE` environment variable (default: `Asia/Kuala_Lumpur`).

**Cut-off enforcement logic:**

```text
now = current datetime in configured timezone
target_date = date the user is trying to update

if target_date < today:
    → reject: "Cannot update records for a past date."

if target_date == today AND now.time() >= cut_off_time:
    → reject: "Cut-off time has passed for today. Changes are no longer accepted."

if target_date > today:
    → allow: future dates are always open for updates.
```

**Admin override:** Users with the `@Admin` / `@Logistics` role can bypass the cut-off check entirely. This allows last-minute corrections without a time gate.

**Cut-off time storage:** The cut-off time for a given date is stored in a separate DynamoDB item:

- `PK`: `CONFIG#CUTOFF`
- `SK`: `DATE#{YYYY-MM-DD}`
- `cutoff_time`: `HH:MM` string (24-hour format)

If no record exists for a date, the system falls back to the `DEFAULT_CUTOFF_TIME` environment variable (default: `10:00`).

---

### 4.2 Event Meal Workflow — Opt-in by Default, Manual Opt-out

An "Event Meal" is a special catering day (e.g., company anniversary, team lunch). On event days, all employees are **opted in by default** — the kitchen prepares for full headcount unless someone explicitly opts out.

**Event day setup (Admin action):**

1. Admin uses `/meal event set <date> <description>` to flag a date as an event meal day.
2. The system writes an event record to DynamoDB:
   - `PK`: `EVENT#<date>`
   - `SK`: `META`
   - `description`: event name/notes
   - `opt_out_deadline`: cut-off time for that day (same rules as §4.1)
3. The bot broadcasts a notification to the configured meal channel announcing the event and the opt-out deadline.

**Employee opt-out flow:**

1. Employee uses `/meal optout <date>` or clicks the "Opt Out" button in the bot's announcement message.
2. The system checks:
   - Is the date flagged as an event day? If not → standard opt-in/out logic applies.
   - Has the opt-out deadline passed? If yes → reject with an ephemeral message.
3. If valid, the employee's `meal_opt_in` field is set to `false` for that date.
4. Bot confirms with an ephemeral reply: _"You have opted out of the event meal on {date}."_

**Headcount calculation on event days:**

```text
total_opted_out  = count of records where meal_opt_in == false for that date
expected_count   = total_active_employees - total_opted_out
```

The system does **not** require every employee to explicitly opt in — absence of an opt-out record is treated as opt-in for event days only.

**State transition summary:**

| Scenario | Default State | Employee Action | Resulting State |
| --- | --- | --- | --- |
| Regular day | `meal_opt_in = true` | Opt out | `meal_opt_in = false` |
| Regular day | `meal_opt_in = false` | Opt in | `meal_opt_in = true` |
| Event meal day | Implicit opt-in (no record) | Opt out | `meal_opt_in = false` |
| Event meal day | `meal_opt_in = false` | Re-opt in (before deadline) | Record deleted (returns to implicit opt-in) |

---

## 5. Python Project Structure

### 5.1 Runtime

- **Python version:** 3.11 (minimum). Required for optimal Lambda cold-start performance and full `tomllib` / `typing` support.
- **Lambda runtime:** `python3.11` on `arm64` (Graviton2).

### 5.2 Directory Layout

```text
/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI app factory + Mangum handler entry point
│   ├── config.py             # Pydantic Settings class (env var management)
│   │
│   ├── api/                  # FastAPI routers (HTTP layer only)
│   │   ├── __init__.py
│   │   ├── interactions.py   # POST /interactions — Discord webhook entry point
│   │   └── health.py         # GET /health — Lambda warm-up / ALB health check
│   │
│   ├── services/             # Business logic and DynamoDB interactions
│   │   ├── __init__.py
│   │   ├── meal_service.py   # Meal opt-in/out, cut-off enforcement, event meals
│   │   ├── headcount_service.py  # Headcount aggregation and summary generation
│   │   └── discord_service.py    # Discord REST API calls (follow-up messages)
│   │
│   └── models/               # Pydantic models (request/response schemas)
│       ├── __init__.py
│       ├── discord_models.py # Discord interaction payload schemas
│       └── meal_models.py    # Meal record, event, and cut-off config schemas
│
├── docs/
│   ├── technical_spec.md     # This document
│   └── iterations/
│       └── task-iteration1.md
│
├── requirements.txt          # Production dependencies
├── requirements-dev.txt      # Development/test dependencies
└── .env.example              # Template for local environment variables
```

### 5.3 Module Responsibilities

| Module | Responsibility |
| --- | --- |
| `app/main.py` | Creates the FastAPI app, registers routers, wraps with `Mangum` for Lambda. |
| `app/config.py` | Defines `Settings(BaseSettings)` — single source of truth for all env vars. |
| `app/api/interactions.py` | Receives raw Discord POST, runs signature verification dependency, dispatches to the correct command handler. |
| `app/services/meal_service.py` | Implements cut-off time logic, opt-in/out writes, event meal state transitions. |
| `app/services/headcount_service.py` | Queries DynamoDB for daily/team summaries; computes event day expected counts. |
| `app/services/discord_service.py` | Sends deferred follow-up messages to Discord via REST after Lambda responds. |
| `app/models/discord_models.py` | Typed Pydantic models for Discord interaction payloads, member objects, and options. |
| `app/models/meal_models.py` | Typed Pydantic models for DynamoDB records: `MealRecord`, `EventRecord`, `CutoffConfig`. |

### 5.4 Dependencies (`requirements.txt`)

```text
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
mangum>=0.17.0
boto3>=1.34.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
pynacl>=1.5.0
python-dotenv>=1.0.0
```

| Package | Purpose |
| --- | --- |
| `fastapi` | Web framework — routing, dependency injection, request parsing. |
| `uvicorn` | ASGI server for local development. Not used in Lambda. |
| `mangum` | Wraps the FastAPI ASGI app to handle AWS Lambda + API Gateway proxy events. |
| `boto3` | AWS SDK — DynamoDB client for all read/write operations. |
| `pydantic` | Data validation and serialisation for request/response models. |
| `pydantic-settings` | `BaseSettings` support for environment variable loading. |
| `pynacl` | Ed25519 signature verification for Discord request authentication. |
| `python-dotenv` | Loads `.env` file during local development (no-op in Lambda). |

---

## 6. Out of Scope for This Iteration

The following are explicitly deferred and must not be implemented until a subsequent iteration:

| Item | Reason for Deferral |
| --- | --- |
| Infrastructure as Code (IaC) | Terraform / CDK configuration requires a stable, tested application before provisioning. |
| CI/CD pipeline | GitHub Actions deployment workflow depends on IaC being in place first. |
| AWS Secrets Manager integration | Env vars managed manually for now; Secrets Manager adds operational complexity before the app is validated. |
| DynamoDB table creation | Table will be provisioned manually or via IaC in a future iteration. |
| Discord slash command registration | Commands will be registered manually via the Discord Developer Portal in this iteration. |
| Automated tests | Unit and integration test scaffolding is deferred until the core service layer is stable. |
| Web dashboard changes | Dashboard updates are tracked separately under the FE track of this sprint. |

---

## 7. Future Work

Items identified during architecture design that are intentionally queued for later iterations:

- **IaC (Terraform/CDK):** Define all AWS resources (API Gateway, Lambda, DynamoDB, IAM roles) as code for reproducible deployments.
- **CI/CD (GitHub Actions):** Automate linting, testing, packaging, and Lambda deployment on merge to `main`.
- **AWS Secrets Manager:** Migrate `DISCORD_BOT_TOKEN` and `DISCORD_PUBLIC_KEY` from environment variables to Secrets Manager with automatic rotation.
- **DynamoDB Streams → async processing:** Trigger a secondary Lambda on record changes to push live updates to the web dashboard without polling.
- **Lambda Provisioned Concurrency:** Eliminate cold starts for time-sensitive cut-off enforcement if usage patterns demand it.
- **Structured logging (AWS Powertools):** Replace raw `print`/`logging` calls with `aws_lambda_powertools` for structured JSON logs, tracing (X-Ray), and metrics.
- **Rate limiting:** Add per-user request throttling at the API Gateway level to prevent abuse.

---

## 8. References

| Resource | URL |
| --- | --- |
| FastAPI Documentation | <https://fastapi.tiangolo.com/> |
| Discord Interactions API | <https://discord.com/developers/docs/interactions/receiving-and-responding> |
| Discord Security — Request Verification | <https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization> |
| Mangum (ASGI → Lambda adapter) | <https://mangum.fastapiexpert.com/> |
| AWS Lambda — Graviton2 | <https://aws.amazon.com/blogs/aws/aws-lambda-functions-powered-by-aws-graviton2/> |
| DynamoDB Single-Table Design | <https://www.alexdebrie.com/posts/dynamodb-single-table/> |
| PyNaCl Documentation | <https://pynacl.readthedocs.io/> |
| Pydantic Settings | <https://docs.pydantic.dev/latest/concepts/pydantic_settings/> |
