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
