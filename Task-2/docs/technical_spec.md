# Meal Headcount Planner — Discord Bot Integration

**Version:** 1.3
**Date:** 2026-03-27
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose

This document defines the technical architecture, security model, and feature scope for integrating a Discord bot into the Meal Headcount Planner (MHP) system. It serves as the authoritative reference for implementation decisions during Task 2 and guides future infrastructure provisioning.

### 1.2 Project Summary

The Meal Headcount Planner (MHP) is an internal tool that helps kitchen/logistics teams accurately predict daily meal counts. Task 2 evolves the system from a standalone web tool into a production-grade platform by adding:

- A **Discord bot** as a self-service input channel for employees.
- A **serverless AWS backend** using Lambda, API Gateway, and DynamoDB.

### 1.3 Scope of This Document

This specification covers:

- Proposed AWS serverless architecture (not yet deployed via IaC).
- Cost optimization decisions for each AWS service.
- Security model for Discord webhook validation, user identity, and role-based authorization.
- Feature logic for cut-off time enforcement and Event Meal workflows.
- Python project structure, module responsibilities, and dependency definitions.
- API endpoint definitions for Discord interactions.

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
Router Lambda (sig verification + routing)
     │
     │  Invoke
     ▼
Command Lambda (business logic)
     │
     ├──► DynamoDB (read / write)
     │
     └──► Discord API (send follow-up response)
```

1. A Discord user triggers a slash command or button interaction.
2. Discord sends a signed HTTP POST to the **API Gateway HTTP API** endpoint.
3. API Gateway proxies the raw request (including signature headers) to the **Router Lambda**.
4. The Router Lambda:
   - Validates the Ed25519 signature (reject immediately if invalid).
   - Parses the interaction payload and invokes the appropriate **Command Lambda** by command group.
5. The Command Lambda runs the business logic:
   - Reads from / writes to **DynamoDB**.
   - Returns a JSON response to Discord (or defers and sends a follow-up).

### 2.2 Service Selection & Cost Optimization

All service choices minimize cost for low-to-medium usage internal tooling with no guaranteed baseline traffic.

| Service | Tier / Config | Cost Decision | Impact |
| --- | --- | --- | --- |
| **API Gateway** | HTTP API | HTTP API over REST API | ~70% cheaper per request; REST-only features (transformation, usage plans) are not needed. |
| **Router Lambda** | `arm64`, 256 MB, SnapStart enabled | Lightweight: signature verification + routing only | Minimal memory footprint; fast cold-start. SnapStart eliminates cold-start latency. Requires Python 3.12 runtime. |
| **Command Lambda** | `arm64`, 512 MB, SnapStart enabled | Business logic per command group | Higher memory allocation for DynamoDB queries and response construction. Independently deployable and scalable per command group. |
| **DynamoDB** | On-Demand capacity | No provisioned capacity | Zero cost at rest; scales automatically with bursty morning headcount traffic. |
| **CloudWatch Logs** | 60-day retention | Minimal log retention | Prevents unbounded storage accumulation; sufficient for operational debugging. |

### 2.3 DynamoDB Data Model

Single-table design using `MHP_Table` with one overloaded GSI (`GSI1`). All 18 access patterns are served without Scans.

**Table:** `MHP_Table`

**Keys:**

| Attribute | Type | Description |
| --- | --- | --- |
| `PK` | String | Partition key |
| `SK` | String | Sort key |
| `GSI1PK` | String | GSI1 partition key |
| `GSI1SK` | String | GSI1 sort key |

**Key conventions:** Prefixed keys namespace entities (e.g., `USER#<userId>`, `MEAL#<date>`). `METADATA` as SK marks an entity's core record. Dates follow `YYYY-MM-DD`. `#` separates prefix from value and joins composite keys.

**Item types:**

| Entity | PK | SK | Uses GSI1 |
| --- | --- | --- | --- |
| User | `USER#<userId>` | `METADATA` | Yes |
| Identity Mapping | `EXTID#<type>#<value>` | `EXTID#<type>#<value>` | No |
| Team | `TEAM#<teamId>` | `METADATA` | Yes |
| Meal Participation | `MEAL#<date>` | `USER#<userId>#<mealType>` | Yes |
| Work Location | `LOC#<date>` | `USER#<userId>` | Yes |
| Special Day | `SPECIALDAY` | `<date>` | No |
| Headcount Summary | `SUMMARY#<date>` | `SUMMARY` | No |

**GSI1 overloaded usage:**

| Entity | GSI1PK | GSI1SK | Serves |
| --- | --- | --- | --- |
| User | `USERS` | `USER#<userId>` | Get all users |
| Team | `TEAMS` | `TEAM#<teamId>` | Get all teams |
| Meal Participation | `USER#<userId>` | `MEAL#<date>#<mealType>` | User's meal history across dates |
| Work Location | `USER#<userId>` | `LOC#<date>` | User's location records for a month |

Total GSIs: **1**

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

### 3.2 Authorization — Discord Role-Based Access Control

Authorization is enforced at the command handler level based on the Discord roles present in the interaction payload (`member.roles`). No external role store is needed; Discord's role system is the source of truth.

| Role | Permission Level | Allowed Actions |
| --- | --- | --- |
| `@everyone` (Employee) | Standard | Update own meal opt-in, update own work location, view own status. |
| `@Team Lead` | Elevated | All employee actions + view team headcount summary for any date. |
| `@Admin` | Full | All team lead actions + view org-wide summary, override any employee's record. |

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
| `DYNAMODB_TABLE` | Single DynamoDB table name (default: `MHP_Table`). |
| `AWS_REGION` | AWS region for DynamoDB client (defaults to `ap-southeast-1`). |
| `ROLE_TEAM_LEAD_ID` | Discord role ID for Team Lead permission level. |
| `ROLE_ADMIN_ID` | Discord role ID for Admin permission level. |
| `AUTHORIZED_GUILD_ID` | Discord guild (server) ID — interactions from other guilds are rejected (§3.4). |
| `TIMEZONE` | IANA timezone for cut-off time evaluation (default: `Asia/Dhaka`) (§4.1). |
| `DEFAULT_CUTOFF_TIME` | Static cut-off time applied to every working day (default: `00:00`, midnight before the meal date) (§4.1). |

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

**Admin override:** Users with the `@Admin` role can bypass the cut-off check entirely. This allows last-minute corrections without a time gate.

---

### 4.2 Event Meal Workflow — Opt-in by Default, Manual Opt-out

An "Event Meal" is a special catering day (e.g., company anniversary, team lunch). On event days, all employees are **opted in by default** — the kitchen prepares for full headcount unless someone explicitly opts out.

Event days are defined statically in `config/events.json`. The opt-out deadline follows the same `DEFAULT_CUTOFF_TIME` rule as regular days (§4.1). An Admin can broadcast a one-time announcement via `/event announce <date>`.

**Employee opt-out flow:**

1. Employee uses `/event optout <date>`.
2. The system checks the date is a configured event day and the cut-off has not passed.
3. If valid, `meal_opt_in` is set to `false` for that date.
4. Bot confirms with an ephemeral reply.

**State transitions:**

| Scenario | Default State | Employee Action | Resulting State |
| --- | --- | --- | --- |
| Regular day | `meal_opt_in = true` | Opt out | `meal_opt_in = false` |
| Regular day | `meal_opt_in = false` | Opt in | `meal_opt_in = true` |
| Event meal day | Implicit opt-in (no record) | Opt out | `meal_opt_in = false` |
| Event meal day | `meal_opt_in = false` | Re-opt in (before deadline) | `meal_opt_in = true` |

---

### 4.3 WFH Monthly Soft Limit

Employees who set their work location to `WFH` are subject to a soft limit of **5 WFH days per calendar month**. Exceeding this limit does **not** block the update — a warning is appended to the ephemeral confirmation instead.

**Enforcement logic:**

```text
After a successful WFH location update:

month_prefix = YYYY-MM derived from the target_date
wfh_count    = count of items in MHP_Table where
               GSI1PK = USER#<userId>
               AND GSI1SK begins_with LOC#<month_prefix>
               AND location == "WFH"   (client-side filter)

if wfh_count >= WFH_MONTHLY_LIMIT (5):
    → append ephemeral warning to the confirmation message
    → update is NOT blocked
```

The count includes the record just written, so the warning fires as soon as the fifth (or later) WFH day is saved.

**Warning message (ephemeral, appended to update confirmation):**

> ⚠️ You have used {wfh_count} WFH day(s) this month (soft limit: 5). Please coordinate with your team lead.

**Scope and exclusions:**

- Applied only when `/meal update` sets `location=WFH`.
- Not applied to Admin overrides (`/meal override`).
- The limit is a constant (`5`) defined in `meal_service.py`; no environment variable is required.

**DynamoDB query used for the count:**

`Query GSI1` on `MHP_Table` — `GSI1PK = USER#<userId>`, `GSI1SK begins_with LOC#<YYYY-MM>`. Returns all Work Location items for that user in the target month. Client-side filter then isolates `location == "WFH"` records.

### 4.4 Headcount Summary — `/headcount` Command

The `/headcount` command is a single top-level command that provides a comprehensive daily headcount view scoped by role.

**Access control:**

| Role | Scope | Description |
| --- | --- | --- |
| `@Admin` | Organization-wide | Headcount and location summary across all users for the requested date with a team breakdown. |
| `@Team Lead` | Team-wide | Headcount and location summary for the team lead's team members only. |
| `@everyone` (Employee) | — | No access. Returns an ephemeral permission error. |

**Command signature:**

```text
/headcount <date>
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `date` | String (YYYY-MM-DD) | Yes | The date to generate the headcount summary for. |

**Response format:**

The response includes four sections:

1. **Overall total** — Total users opted in vs opted out across the organization (Admin) or team (Team Lead).
2. **By meal type** — For each valid meal type (`LUNCH`, `SNACKS`, `IFTAR`, `EVENT_DINNER`, `OPTIONAL_DINNER`), the count of users opted in for that specific type. A user is counted as opted in for a meal type if `meal_opt_in == true` AND the meal type is NOT in their `opted_out_meals` list.
3. **By team** — (Admin only) Breakdown of opted-in count per team. Requires team membership data in DynamoDB.
4. **Office vs WFH split** — Count of all users (regardless of opt-in status) by work location (`OFFICE` vs `WFH`).

**Example output (Admin):**

```text
**Org-wide Headcount for 2026-03-27** *(Event Day)*

**Overall**
Total: 20 | Opted in: 15 | Opted out: 5

**By Meal Type**
  Lunch: 14
  Snacks: 12
  Iftar: 10
  Event Dinner: 15
  Optional Dinner: 8

**By Team**
  Engineering: 8
  Design: 4
  Operations: 3

**Office vs WFH**
  Office: 16 | WFH: 4
```

**Example output (Team Lead):**

```text
**Team Headcount for 2026-03-27**

**Overall**
Total: 6 | Opted in: 5 | Opted out: 1

**By Meal Type**
  Lunch: 5
  Snacks: 4
  Iftar: 3
  Event Dinner: 5
  Optional Dinner: 2

**Office vs WFH**
  Office: 5 | WFH: 1
```

> **Note:** Team-level filtering and the "By Team" breakdown require a team membership mapping (team roster) in DynamoDB. Until that data model is implemented, team leads will see the organization-wide summary, and the "By Team" section will be omitted.

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
| `POST` | `/interactions` | Ed25519 signature (§3.1) | Receives all Discord slash command interactions. |

### Discord Slash Commands

Registered via the Discord Developer Portal. Each command maps to a handler.

#### `/meal`

| Command | Permission | Description |
| --- | --- | --- |
| `/meal status [user] [date]` | Employee / Team Lead / Admin | Show meal opt-in status for a date (defaults to today). Omitting `user` shows own status. Providing `user` requires Team Lead (own team only) or Admin. |
| `/meal set <date> [opt_in] [meal_types] [user]` | Employee / Team Lead / Admin | Update meal opt-in/out for a date. Supports per-meal-type selection. Omitting `user` applies to self (cut-off enforced). Providing `user` requires Team Lead (own team only) or Admin (any user); bypasses cut-off. |
| `/meal bulk <start_date> <end_date> <opt_in> [user]` | Employee / Team Lead / Admin | Set meal opt-in/out across a date range. `user` is optional — Admin/Team Lead can specify another user; employees apply to themselves. |

#### `/location`

| Command | Permission | Description |
| --- | --- | --- |
| `/location status [user] [date]` | Employee / Team Lead / Admin | Show work location for a date (defaults to today). Omitting `user` shows own location. Providing `user` requires Team Lead (own team only) or Admin. |
| `/location set <date> <location> [user]` | Employee / Team Lead / Admin | Set work location (OFFICE or WFH) for a date. WFH automatically opts out of all meals. Omitting `user` applies to self (cut-off enforced). Providing `user` requires Team Lead (own team only) or Admin (any user); bypasses cut-off. |
| `/location bulk <start_date> <end_date> <location> [user]` | Employee / Team Lead / Admin | Set work location across a date range. `user` is optional — Admin/Team Lead can specify another user; employees apply to themselves. |

#### Headcount & Team

| Command | Permission | Description |
| --- | --- | --- |
| `/headcount [date] [user]` | Employee / Team Lead / Admin | **Employee:** shows own 30-day meal and location history; providing `date` narrows to that specific date. **Team Lead / Admin:** `date` required — without `user` shows aggregate headcount summary (meal-type breakdown, team split, office/WFH split; Admin org-wide, Team Lead team-wide); with `user` shows that user's record for the date. Team Lead restricted to own team. |
| `/team-members` | Team Lead / Admin | View team members with their WFH day counts for the current month. |

#### `/wfh-periods`

| Command | Permission | Description |
| --- | --- | --- |
| `/wfh-periods set <start_date> <end_date>` | Admin | Set company-wide WFH schedule across a date range. |
| `/wfh-periods delete <start_date> <end_date>` | Admin | Delete company-wide WFH schedule for a date range. |
| `/wfh-periods list` | All | List all company-wide WFH periods within the next 2 months. |

#### `/event`

| Command | Permission | Description |
| --- | --- | --- |
| `/event announce <date>` | Admin | Broadcast an announcement for a configured event meal day to the channel. |
| `/event optout <date>` | Employee | Opt out of an event meal day for a specific date. |
| `/event list` | All | Show all configured special event days. |
| `/event update <date>` | Admin | Update an existing event day's configuration. |
| `/event delete <date>` | Admin | Delete a configured event day. |

---

## 6. Out of Scope for This Iteration

The following are explicitly deferred and must not be implemented until a subsequent iteration:

| Item | Reason for Deferral |
| --- | --- |
| Infrastructure as Code (IaC) | Terraform / CDK configuration requires a stable, tested application before provisioning. |
| CI/CD pipeline | GitHub Actions deployment workflow depends on IaC being in place first. |
| AWS Secrets Manager integration | Env vars managed manually for now; Secrets Manager adds operational complexity before the app is validated. |
| DynamoDB table creation | Table will be provisioned manually or via IaC in a future iteration. |
| Automated tests | Unit and integration test scaffolding is deferred until the core service layer is stable. |

---

## 7. Future Work

Items identified during architecture design that are intentionally queued for later iterations:

- **IaC (Terraform/CDK):** Define all AWS resources (API Gateway, Lambda, DynamoDB, IAM roles) as code for reproducible deployments.
- **CI/CD (GitHub Actions):** Automate linting, testing, packaging, and Lambda deployment on merge to `main`.
- **AWS Secrets Manager:** Migrate `DISCORD_BOT_TOKEN` and `DISCORD_PUBLIC_KEY` from environment variables to Secrets Manager with automatic rotation.
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
