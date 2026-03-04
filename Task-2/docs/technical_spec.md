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
- Cost optimization decisions for each AWS service.
- Security model for Discord webhook validation, user identity, and role-based authorization.
- Feature logic for cut-off time enforcement and Event Meal workflows.
- Python project structure, module responsibilities, and dependency definitions.
- API endpoint definitions for both Discord interactions and the backend REST API.

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
AWS Lambda (plain handler)
     │
     ├──► DynamoDB (read / write meal records)
     │
     └──► Discord API (send follow-up response)
```

1. A Discord user triggers a slash command or button interaction.
2. Discord sends a signed HTTP POST to the **API Gateway HTTP API** endpoint.
3. API Gateway proxies the raw request (including signature headers) to a single **Lambda function**.
4. The Lambda handler (`app/handler.py`) runs synchronously and:
   - Validates the Ed25519 signature (reject immediately if invalid).
   - Parses the interaction payload and routes to the appropriate service function.
   - Reads from / writes to **DynamoDB**.
   - Returns a JSON response to Discord (or defers and sends a follow-up).

### 2.2 Service Selection & Cost Optimization

All service choices minimize cost for low-to-medium usage internal tooling with no guaranteed baseline traffic.

| Service | Tier / Config | Cost Decision | Impact |
| --- | --- | --- | --- |
| **API Gateway** | HTTP API | HTTP API over REST API | ~70% cheaper per request; REST-only features (transformation, usage plans) are not needed. |
| **AWS Lambda** | `arm64` (Graviton2), 512 MB | Graviton2 + SnapStart | ~20% lower compute cost vs x86. **SnapStart** (enabled on the published version) eliminates cold starts by restoring a pre-initialized execution environment snapshot — no warm-up pings or provisioned concurrency needed. Requires Python 3.12 runtime. |
| **AWS Lambda** | Single function | One handler for all routes | Eliminates overhead of managing and cold-starting multiple per-route functions. A single `handler(event, context)` entry point dispatches to service functions by command name. |
| **DynamoDB** | On-Demand capacity | No provisioned capacity | Zero cost at rest; scales automatically with bursty morning headcount traffic. |
| **CloudWatch Logs** | 60-day retention | Minimal log retention | Prevents unbounded storage accumulation; sufficient for operational debugging. |

### 2.3 DynamoDB Data Model (Proposed)

Three separate tables are used — one per entity type. This keeps queries simple and avoids advanced single-table patterns.

---

**Table: `mhp-meal-records`**

| Attribute | Type | Role |
| --- | --- | --- |
| `date` | `String` | Partition key — `YYYY-MM-DD` |
| `user_id` | `String` | Sort key — Discord user snowflake ID |
| `meal_opt_in` | `Boolean` | Whether the user is having a meal that day. |
| `work_location` | `String` | `OFFICE` or `WFH`. |
| `meal_type` | `String` | e.g., `STANDARD`, `VEGETARIAN`. |
| `updated_at` | `String` | ISO 8601 timestamp of last change. |
| `updated_by` | `String` | Discord user ID of who made the change (self or admin). |

**Access patterns:**

- Get all records for a date → Query on `date` (partition key).
- Get a single user's record for a date → Query on `date` + `user_id` (direct lookup, no GSI needed).

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

This check is called explicitly at the top of the Lambda handler before any routing or business logic executes.

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
| `DYNAMODB_MEAL_TABLE` | Meal records table name (defaults to `mhp-meal-records`). |
| `AWS_REGION` | AWS region for DynamoDB client (defaults to `ap-southeast-1`). |
| `ROLE_TEAM_LEAD_ID` | Discord role ID for Team Lead permission level. |
| `ROLE_ADMIN_ID` | Discord role ID for Admin/Logistics permission level. |
| `AUTHORIZED_GUILD_ID` | Discord guild (server) ID — interactions from other guilds are rejected (§3.4). |
| `TIMEZONE` | IANA timezone for cut-off time evaluation (default: `Asia/Dhaka`) (§4.1). |
| `DEFAULT_CUTOFF_TIME` | Static cut-off time applied to every working day (default: `00:00`, midnight before the meal date) (§4.1). |
| `INTERNAL_API_KEY` | Bearer token required by the backend REST API endpoints consumed by the dashboard (§5.5). |

> In this iteration, these variables are set manually in the Lambda console or a local `.env` file. IaC-managed Secrets Manager integration is deferred to a future iteration.

### 3.4 User Identity — Discord OAuth2

Discord's Interactions API embeds verified user identity directly inside the signed interaction payload. No separate OAuth2 token exchange is required for slash command interactions — the user's identity is established as part of the same request that is already validated by Ed25519 signature verification (§3.1).

**Identity fields available in every interaction payload:**

| Field | Path in payload | Description |
| --- | --- | --- |
| `user_id` | `member.user.id` | Discord's unique, immutable snowflake ID for the user. Used as the primary key in DynamoDB (`USER#{user_id}`). |
| `username` | `member.user.username` | Display name for bot responses. Not used for authorization decisions. |
| `roles` | `member.roles` | List of Discord role IDs assigned to the user in the guild. Drives RBAC (§3.2). |
| `guild_id` | `guild_id` | Confirms the interaction originates from the authorized guild. Requests from other guilds are rejected. |

**Why no separate OAuth2 flow is needed:**

Discord OAuth2 is required when a third-party app needs to act on behalf of a user outside of a guild interaction (e.g., access a user's DMs, read their profile). For slash command bots operating within a guild:

- Discord authenticates the user when they invoke the command.
- The signed payload (verified in §3.1) guarantees the identity fields have not been tampered with.
- The `user_id` extracted from the payload is therefore trustworthy without any additional token exchange.

**Guild authorization guard:**

On every interaction, the handler verifies that `guild_id` matches the `AUTHORIZED_GUILD_ID` environment variable. Interactions from unauthorized guilds are rejected with `HTTP 401` before any business logic runs.

---

## 4. Feature Specification

### 4.1 Cut-off Time

The cut-off time is the daily deadline after which no more meal changes are accepted for the next working day. It is a single static value applied uniformly to every working day, configured via the `DEFAULT_CUTOFF_TIME` environment variable (default: `00:00`, midnight before the meal date).

All times are evaluated in the **server's local timezone**, configurable via the `TIMEZONE` environment variable (default: `Asia/Dhaka`).

**Cut-off enforcement logic:**

```text
now = current datetime in configured timezone
target_date = date the user is trying to update
cutoff_datetime = (target_date - 1 day) at DEFAULT_CUTOFF_TIME

if target_date <= today:
    → reject: "Cannot update records for today or a past date."

if now >= cutoff_datetime:
    → reject: "Cut-off time has passed for {target_date}. Changes are no longer accepted."

if now < cutoff_datetime:
    → allow: cut-off has not yet been reached.
```

**Admin override:** Users with the `@Admin` / `@Logistics` role can bypass the cut-off check entirely. This allows last-minute corrections without a time gate.

---

### 4.2 Event Meal Workflow — Opt-in by Default, Manual Opt-out

An "Event Meal" is a special catering day (e.g., company anniversary, team lunch). On event days, all employees are **opted in by default** — the kitchen prepares for full headcount unless someone explicitly opts out.

**Event day setup (static configuration):**

Event days are defined in a static configuration file (`config/events.json`) bundled with the Lambda deployment package. Each entry specifies a date and description. The opt-out deadline follows the same `DEFAULT_CUTOFF_TIME` rule as regular days (§4.1) — no separate per-event deadline is needed.

```json
[
  { "date": "2026-03-15", "description": "Company anniversary lunch" },
  { "date": "2026-06-01", "description": "Mid-year team lunch" }
]
```

To add or modify event days, update `config/events.json` and redeploy the Lambda function. The bot can broadcast a one-time notification via a manual `/meal event announce <date>` command (Admin only), or the message can be posted manually.

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
| Event meal day | `meal_opt_in = false` | Re-opt in (before deadline) | `meal_opt_in = true` |

---

## 5. Python Project Structure

### 5.1 Runtime

- **Python version:** 3.12 (minimum). Required for Lambda SnapStart support and includes performance improvements over 3.11.
- **Lambda runtime:** `python3.12` on `arm64` (Graviton2) with **SnapStart** enabled on the published function version.

### 5.2 Directory Layout

```text
/
├── app/
│   ├── __init__.py
│   ├── handler.py            # Lambda entry point — signature verification + command routing
│   ├── config.py             # Pydantic Settings class (env var management)
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
├── config/
│   └── events.json           # Static list of event meal dates and descriptions
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
| `app/handler.py` | Lambda entry point (`handler(event, context)`). Verifies Ed25519 signature, parses the interaction payload, and dispatches to the correct service function by command name. Returns a JSON-serialisable dict to API Gateway. |
| `app/config.py` | Defines `Settings(BaseSettings)` — single source of truth for all env vars. |
| `app/services/meal_service.py` | Implements cut-off time logic, opt-in/out writes, event meal state transitions. |
| `app/services/headcount_service.py` | Queries DynamoDB for daily/team summaries; computes event day expected counts. |
| `app/services/discord_service.py` | Sends deferred follow-up messages to Discord via REST after Lambda responds. |
| `app/models/discord_models.py` | Typed Pydantic models for Discord interaction payloads, member objects, and options. |
| `app/models/meal_models.py` | Typed Pydantic models for DynamoDB records: `MealRecord`. Also includes `EventConfig` for deserialising `config/events.json`. |

### 5.4 Dependencies (`requirements.txt`)

| Package | Purpose |
| --- | --- |
| `boto3` | AWS SDK — DynamoDB client for all read/write operations. |
| `pydantic` | Data validation and serialisation for request/response models. |
| `pydantic-settings` | `BaseSettings` support for environment variable loading. |
| `pynacl` | Ed25519 signature verification for Discord request authentication. |
| `python-dotenv` | Loads `.env` file during local development (no-op in Lambda). |

---

### 5.5 API Endpoints

All endpoints are served under the Lambda function URL proxied through API Gateway.

### Discord Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/interactions` | Ed25519 signature (§3.1) | Receives all Discord interaction events — slash commands, buttons, select menus. |
| `GET` | `/health` | None | Health check endpoint for monitoring and load balancer integration. |

### Discord Slash Commands

Registered via the Discord Developer Portal. Each command maps to a handler inside `app/handler.py`.

| Command | Permission | Description |
| --- | --- | --- |
| `/meal status [date]` | Employee | Show own meal opt-in and work location for a date (defaults to today). |
| `/meal update` | Employee | Update own meal opt-in or work location for a date. |
| `/meal optout <date>` | Employee | Opt out of an event meal for a specific date. |
| `/meal summary <date>` | Team Lead | Show team headcount summary for a date. |
| `/meal summary-all <date>` | Admin | Show org-wide headcount summary for a date. |
| `/meal override <user> <date>` | Admin | Override any employee's meal record. |
| `/meal event announce <date>` | Admin | Broadcast the event meal announcement for a pre-configured event day. |

### Backend REST API Endpoints

Consumed by the web dashboard frontend, served under `/api/v1`. All require `Authorization: Bearer <INTERNAL_API_KEY>` and are not exposed to Discord.

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/meals/{date}` | Admin / Team Lead | Get all meal records for a date. Supports `?team_id=` filter. |
| `GET` | `/api/v1/meals/{date}/{user_id}` | Admin / Team Lead | Get a single user's meal record for a date. |
| `PUT` | `/api/v1/meals/{date}/{user_id}` | Admin | Create or update a meal record for a user on a date. |
| `GET` | `/api/v1/headcount/{date}` | Admin | Org-wide headcount summary for a date. |
| `GET` | `/api/v1/headcount/{date}/teams/{team_id}` | Team Lead | Team-level headcount summary for a date. |

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
- **Lambda SnapStart:** Enable SnapStart on the published function version (Python 3.12 runtime). AWS takes a snapshot of the initialized execution environment after the first init and restores it on subsequent cold starts, reducing latency to near-warm levels. No scheduled pings, no provisioned concurrency, no additional cost beyond standard invocation pricing.
- **Structured logging (AWS Powertools):** Replace raw `print`/`logging` calls with `aws_lambda_powertools` for structured JSON logs, tracing (X-Ray), and metrics.
- **Rate limiting:** Add per-user request throttling at the API Gateway level to prevent abuse.

---

## 8. References

| Resource | URL |
| --- | --- |
| Discord Interactions API | <https://discord.com/developers/docs/interactions/receiving-and-responding> |
| Discord Security — Request Verification | <https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization> |
| AWS Lambda — Graviton2 | <https://aws.amazon.com/blogs/aws/aws-lambda-functions-powered-by-aws-graviton2/> |
| DynamoDB Single-Table Design | <https://www.alexdebrie.com/posts/dynamodb-single-table/> |
| PyNaCl Documentation | <https://pynacl.readthedocs.io/> |
| Pydantic Settings | <https://docs.pydantic.dev/latest/concepts/pydantic_settings/> |
