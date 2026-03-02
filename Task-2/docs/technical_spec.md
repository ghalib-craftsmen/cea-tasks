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
