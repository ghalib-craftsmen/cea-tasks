# DynamoDB Single-Table Schema

## Table: `MHP_Table`

### Key Design

| Attribute | Type   | Description        |
| --------- | ------ | ------------------ |
| PK        | String | Partition key      |
| SK        | String | Sort key           |
| GSI1PK    | String | GSI1 partition key |
| GSI1SK    | String | GSI1 sort key      |

### Conventions

- Keys are prefixed to namespace entities (e.g., `USER#<userId>`, `MEAL#<date>`)
- `METADATA` as SK marks an entity's core record
- Dates follow `YYYY-MM-DD` format
- `#` separates prefix from value and joins composite keys (e.g., `USER#<userId>#<mealType>`)

---

## User

### Access Patterns

1. Get user by userId
2. Get user by external identity (e.g., discordId, username)
3. Get all users

### DB Schema

**User Item**

| PK              | SK         | GSI1PK  | GSI1SK          | Attributes                                           |
| --------------- | ---------- | ------- | --------------- | ---------------------------------------------------- |
| `USER#<userId>` | `METADATA` | `USERS` | `USER#<userId>` | `name`, `discordId`, `username`, `teamId`, `role`, … |

**Identity Mapping Item**

| PK                     | SK                     | Attributes |
| ---------------------- | ---------------------- | ---------- |
| `EXTID#<type>#<value>` | `EXTID#<type>#<value>` | `userId`   |

### How Each Access Pattern Is Served

| # | Pattern                       | Operation                                                                             |
|---|-------------------------------|---------------------------------------------------------------------------------------|
| 1 | Get user by userId            | `GetItem` — PK = `USER#<userId>`, SK = `METADATA`                                    |
| 2 | Get user by external identity | `GetItem` on `EXTID#<type>#<value>` → get `userId` → then `GetItem` on the User item |
| 3 | Get all users                 | `Query GSI1` — GSI1PK = `USERS`                                                      |

### Explanation

- Identity mapping items handle reverse lookups without a GSI. A user with `discordId = "abc123"` gets an item at PK/SK = `EXTID#discord#abc123` that stores the `userId`. Two reads: one to resolve the identity, one to fetch the user.
- One mapping item is created per external identity (discord, username, etc.).
- GSI1PK = `USERS` puts all users in one GSI partition so `Query` returns them all.

---

## Team

### Access Patterns

1. Get team by teamId
2. Get all teams

### DB Schema

**Team Item**

| PK              | SK         | GSI1PK  | GSI1SK          | Attributes    |
| --------------- | ---------- | ------- | --------------- | ------------- |
| `TEAM#<teamId>` | `METADATA` | `TEAMS` | `TEAM#<teamId>` | `teamName`, … |

### How Each Access Pattern Is Served

| # | Pattern            | Operation                                          |
|---|--------------------|----------------------------------------------------|
| 1 | Get team by teamId | `GetItem` — PK = `TEAM#<teamId>`, SK = `METADATA` |
| 2 | Get all teams      | `Query GSI1` — GSI1PK = `TEAMS`                   |

### Explanation

- Same pattern as User. GSI1PK = `TEAMS` groups all teams for a collection query.

---

## Meal Participation

### Access Patterns

1. Get all participation records for a date (headcount — all users, one date)
2. Get a specific user's meals for a date (users can view/opt out here)
3. Get a specific meal record (user + date + mealType)
4. Get a user's participation history across dates (reporting)
5. Upsert participation record

### DB Schema

**Meal Participation Item**

| PK            | SK                         | GSI1PK          | GSI1SK                   | Attributes               |
| ------------- | -------------------------- | --------------- | ------------------------ | ------------------------ |
| `MEAL#<date>` | `USER#<userId>#<mealType>` | `USER#<userId>` | `MEAL#<date>#<mealType>` | `status`, `updatedAt`, … |

### How Each Access Pattern Is Served

| # | Pattern                              | Operation                                                              |
|---|--------------------------------------|------------------------------------------------------------------------|
| 1 | All participation records for a date | `Query` — PK = `MEAL#<date>`                                          |
| 2 | User's meals for a date              | `Query` — PK = `MEAL#<date>`, SK `begins_with` `USER#<userId>`        |
| 3 | Specific meal record                 | `GetItem` — PK = `MEAL#<date>`, SK = `USER#<userId>#<mealType>`       |
| 4 | User's participation history         | `Query GSI1` — GSI1PK = `USER#<userId>`, GSI1SK `begins_with` `MEAL#` |
| 5 | Upsert participation record          | `PutItem` — PK = `MEAL#<date>`, SK = `USER#<userId>#<mealType>`       |

### Explanation

- PK partitions by date, so fetching all records for a date is a single partition query.
- SK is a composite of userId and mealType. `begins_with USER#<userId>` gets all meal types for that user on a given date; the full SK targets one specific record.
- GSI1 flips the access — PK becomes the user, SK becomes `MEAL#<date>#<mealType>`. This lets us pull a user's full history sorted by date.

---

## Work Location

### Access Patterns

1. Get all location records for a date (headcount — all users, one date)
2. Get a specific user's location for a date
3. Get a user's location records for a month (WFH overage report)
4. Upsert location record

### DB Schema

**Work Location Item**

| PK           | SK              | GSI1PK          | GSI1SK       | Attributes                 |
| ------------ | --------------- | --------------- | ------------ | -------------------------- |
| `LOC#<date>` | `USER#<userId>` | `USER#<userId>` | `LOC#<date>` | `location`, `updatedAt`, … |

### How Each Access Pattern Is Served

| # | Pattern                         | Operation                                                                      |
|---|---------------------------------|--------------------------------------------------------------------------------|
| 1 | All location records for a date | `Query` — PK = `LOC#<date>`                                                   |
| 2 | User's location for a date      | `GetItem` — PK = `LOC#<date>`, SK = `USER#<userId>`                           |
| 3 | User's locations for a month    | `Query GSI1` — GSI1PK = `USER#<userId>`, GSI1SK `begins_with` `LOC#<YYYY-MM>` |
| 4 | Upsert location record          | `PutItem` — PK = `LOC#<date>`, SK = `USER#<userId>`                           |

### Explanation

- Same date-partitioned approach as Meal Participation. One record per user per date.
- GSI1 flips access to user-centric. `begins_with LOC#<YYYY-MM>` pulls all location records for a user within a month.

---

## Special Day

### Access Patterns

1. Get special day for a specific date
2. Get all special days in a month (or range)

### DB Schema

**Special Day Item**

| PK           | SK       | Attributes                        |
| ------------ | -------- | --------------------------------- |
| `SPECIALDAY` | `<date>` | `title`, `description`, `type`, … |

### How Each Access Pattern Is Served

| # | Pattern                             | Operation                                                                |
|---|-------------------------------------|--------------------------------------------------------------------------|
| 1 | Get special day for a specific date | `GetItem` — PK = `SPECIALDAY`, SK = `<date>`                            |
| 2 | Get all special days in a month     | `Query` — PK = `SPECIALDAY`, SK `between` `YYYY-MM-01` and `YYYY-MM-31` |

### Explanation

- Fixed PK groups all special days in one partition. Works fine given the low item count.
- Raw date as SK allows range queries. No GSI needed.

---

## Headcount Summary

### Access Patterns

1. Generate headcount summary for a date (reads from Participation, Work Location, Special Day, User)
2. Get a previously generated summary for a date
3. Store a generated summary

### DB Schema

**Headcount Summary Item**

| PK               | SK        | Attributes                                                |
| ---------------- | --------- | --------------------------------------------------------- |
| `SUMMARY#<date>` | `SUMMARY` | `totalOptIn`, `totalOptOut`, `totalWFH`, `generatedAt`, … |

### How Each Access Pattern Is Served

| # | Pattern                               | Operation                                                        |
|---|---------------------------------------|------------------------------------------------------------------|
| 1 | Generate headcount summary for a date | Application logic — reads Meal, Location, Special Day, User data |
| 2 | Get a previously generated summary    | `GetItem` — PK = `SUMMARY#<date>`, SK = `SUMMARY`               |
| 3 | Store a generated summary             | `PutItem` — PK = `SUMMARY#<date>`, SK = `SUMMARY`               |

### Explanation

- One summary per date. Pattern #1 is computed in application code by reading other entities, then stored via pattern #3.
- No GSI needed.

---

## GSI1 Usage

GSI1 is overloaded — different entities project different values onto GSI1PK/GSI1SK.

| Entity             | GSI1PK          | GSI1SK                   | Serves                              |
| ------------------ | --------------- | ------------------------ | ----------------------------------- |
| User               | `USERS`         | `USER#<userId>`          | Get all users                       |
| Team               | `TEAMS`         | `TEAM#<teamId>`          | Get all teams                       |
| Meal Participation | `USER#<userId>` | `MEAL#<date>#<mealType>` | User's meal history across dates    |
| Work Location      | `USER#<userId>` | `LOC#<date>`             | User's location records for a month |

Special Day and Headcount Summary don't use GSI1.

Total GSIs: **1**

---

## Single Table Benefits

- All entities in one table — single provisioning and billing unit.
- GSI1 is overloaded to serve collection queries (all users, all teams) and user-centric queries (meal history, location history) without needing multiple indexes.
- Prefixed keys keep entities separated and the table easy to scan/debug.
- No cross-table coordination needed for transactions or batch operations.

---

## Summary

| Entity             | PK                     | SK                         | Uses GSI1 | Operations              |
| ------------------ | ---------------------- | -------------------------- | --------- | ----------------------- |
| User               | `USER#<userId>`        | `METADATA`                 | Yes       | GetItem                 |
| Identity Mapping   | `EXTID#<type>#<value>` | `EXTID#<type>#<value>`     | No        | GetItem                 |
| Team               | `TEAM#<teamId>`        | `METADATA`                 | Yes       | GetItem                 |
| Meal Participation | `MEAL#<date>`          | `USER#<userId>#<mealType>` | Yes       | Query, GetItem, PutItem |
| Work Location      | `LOC#<date>`           | `USER#<userId>`            | Yes       | Query, GetItem, PutItem |
| Special Day        | `SPECIALDAY`           | `<date>`                   | No        | GetItem, Query          |
| Headcount Summary  | `SUMMARY#<date>`       | `SUMMARY`                  | No        | GetItem, PutItem        |

- 7 item types, 1 table, 1 GSI
- All 18 access patterns served without Scans
