# DynamoDB Single-Table Schema

## Table Name: `MHP_Table`

## User

### Access Patterns

1. Get user by userId
2. Get user by external identity (e.g., discordId, username)
3. Get all users

### DB Schema

#### User Item

| PK              | SK         | GSI1PK  | GSI1SK          | Attributes                                           |
| --------------- | ---------- | ------- | --------------- | ---------------------------------------------------- |
| `USER#<userId>` | `METADATA` | `USERS` | `USER#<userId>` | `name`, `discordId`, `username`, `teamId`, `role`, … |

#### Identity Mapping Item

| PK                     | SK                     | Attributes |
| ---------------------- | ---------------------- | ---------- |
| `EXTID#<type>#<value>` | `EXTID#<type>#<value>` | `userId`   |

### How Each Access Pattern Is Served

| # | Pattern                       | Operation                                                                                                      |
|---|-------------------------------|----------------------------------------------------------------------------------------------------------------|
| 1 | Get user by userId            | `GetItem` — PK = `USER#<userId>`, SK = `METADATA`                                                             |
| 2 | Get user by external identity | `GetItem` — PK = `EXTID#<type>#<value>`, SK = `EXTID#<type>#<value>` → returns `userId`, then fetch User item  |
| 3 | Get all users                 | `Query GSI1` — GSI1PK = `USERS`                                                                               |

### Explanation

- **`USER#<userId>`** — The `USER#` prefix namespaces user items so they don't collide with other entity types in the single table.
- **`METADATA`** — A constant sort key indicating this is the entity's core record (as opposed to related child items).
- **Identity Mapping Items** — Separate items for reverse lookups. For example, a user with `discordId = "abc123"` gets an extra item with PK/SK = `EXTID#discord#abc123`. This avoids needing a GSI for identity lookups — a simple two-step read (`GetItem` for the mapping → `GetItem` for the user) handles it.
  - When a user is created, one identity-mapping item is written per external identity (e.g., one for `discord`, one for `username`).
- **`GSI1PK = USERS`** — All user items share the same GSI1 partition key `USERS`, which allows a single `Query` on GSI1 to return every user. `GSI1SK = USER#<userId>` provides sort order and uniqueness within that partition.

---

## Team

### Access Patterns

1. Get team by teamId
2. Get all teams

### DB Schema

#### Team Item

| PK              | SK         | GSI1PK  | GSI1SK          | Attributes          |
| --------------- | ---------- | ------- | --------------- | ------------------- |
| `TEAM#<teamId>` | `METADATA` | `TEAMS` | `TEAM#<teamId>` | `teamName`, …       |

### How Each Access Pattern Is Served

| # | Pattern          | Operation                                                  |
|---|------------------|------------------------------------------------------------|
| 1 | Get team by teamId | `GetItem` — PK = `TEAM#<teamId>`, SK = `METADATA`       |
| 2 | Get all teams      | `Query GSI1` — GSI1PK = `TEAMS`                         |

### Explanation

- **`TEAM#<teamId>`** — The `TEAM#` prefix namespaces team items in the single table, same convention as User.
- **`METADATA`** — Same constant SK convention, indicating the team's core record.
- **`GSI1PK = TEAMS`** — Groups all team items under one GSI1 partition, allowing a single `Query` to fetch all teams. Same overloaded GSI1 pattern used by User.

---

## Meal Participation

### Access Patterns

1. Get all participation records for a date (headcount — all users, one date)
2. Get a specific user's meals for a date (users can view/opt out here)
3. Get a specific meal record (user + date + mealType)
4. Get a user's participation history across dates (reporting)
5. Upsert participation record

### DB Schema

#### Meal Participation Item

| PK            | SK                          | GSI1PK          | GSI1SK                      | Attributes              |
| ------------- | --------------------------- | --------------- | --------------------------- | ----------------------- |
| `MEAL#<date>` | `USER#<userId>#<mealType>` | `USER#<userId>` | `MEAL#<date>#<mealType>`    | `status`, `updatedAt`, … |

### How Each Access Pattern Is Served

| # | Pattern                                | Operation                                                                                  |
|---|----------------------------------------|--------------------------------------------------------------------------------------------|
| 1 | All participation records for a date   | `Query` — PK = `MEAL#<date>`                                                              |
| 2 | A specific user's meals for a date     | `Query` — PK = `MEAL#<date>`, SK `begins_with` `USER#<userId>`                            |
| 3 | A specific meal record                 | `GetItem` — PK = `MEAL#<date>`, SK = `USER#<userId>#<mealType>`                           |
| 4 | A user's participation history         | `Query GSI1` — GSI1PK = `USER#<userId>`, GSI1SK `begins_with` `MEAL#`                     |
| 5 | Upsert participation record            | `PutItem` — PK = `MEAL#<date>`, SK = `USER#<userId>#<mealType>`                           |

### Explanation

- **`MEAL#<date>`** — Partitions meal records by date. This makes date-based headcount queries (pattern #1) a single partition `Query`.
- **`USER#<userId>#<mealType>`** — A composite SK that encodes both user and meal type. Using `begins_with USER#<userId>` retrieves all meal types for a user on that date (pattern #2). The full SK gives an exact record (pattern #3).
- **`GSI1PK = USER#<userId>`** — The overloaded GSI1 is reused here to provide a user-centric view. Querying GSI1 with `begins_with MEAL#` returns all meal records for a user across all dates (pattern #4, for reporting).
- **`GSI1SK = MEAL#<date>#<mealType>`** — Date comes first in the GSI1 sort key so history results are sorted chronologically.

---

## Work Location

### Access Patterns

1. Get all location records for a date (headcount — all users, one date)
2. Get a specific user's location for a date
3. Get a user's location records for a month (WFH overage report)
4. Upsert location record

### DB Schema

#### Work Location Item

| PK           | SK              | GSI1PK          | GSI1SK         | Attributes                   |
| ------------ | --------------- | --------------- | -------------- | ---------------------------- |
| `LOC#<date>` | `USER#<userId>` | `USER#<userId>` | `LOC#<date>`   | `location`, `updatedAt`, …   |

### How Each Access Pattern Is Served

| # | Pattern                              | Operation                                                                        |
|---|--------------------------------------|----------------------------------------------------------------------------------|
| 1 | All location records for a date      | `Query` — PK = `LOC#<date>`                                                     |
| 2 | A specific user's location for a date | `GetItem` — PK = `LOC#<date>`, SK = `USER#<userId>`                            |
| 3 | A user's location records for a month | `Query GSI1` — GSI1PK = `USER#<userId>`, GSI1SK `begins_with` `LOC#<YYYY-MM>`  |
| 4 | Upsert location record               | `PutItem` — PK = `LOC#<date>`, SK = `USER#<userId>`                             |

### Explanation

- **`LOC#<date>`** — Partitions location records by date, same approach as Meal Participation. All users' locations for one date live in one partition.
- **`USER#<userId>`** — SK identifies the user. One location record per user per date.
- **`GSI1PK = USER#<userId>`** — Reuses the overloaded GSI1 to provide a user-centric view. Querying with `begins_with LOC#<YYYY-MM>` returns all location records for a user in a given month (pattern #3, for WFH overage reporting).
- **`GSI1SK = LOC#<date>`** — Date-based sort key in GSI1, enabling month-range queries and chronological ordering.

---

## Special Day

### Access Patterns

1. Get special day for a specific date
2. Get all special days in a month (or range)

### DB Schema

#### Special Day Item

| PK          | SK     | Attributes                       |
| ----------- | ------ | -------------------------------- |
| `SPECIALDAY` | `<date>` | `title`, `description`, `type`, … |

### How Each Access Pattern Is Served

| # | Pattern                            | Operation                                                                                 |
|---|------------------------------------|-------------------------------------------------------------------------------------------|
| 1 | Get special day for a specific date | `GetItem` — PK = `SPECIALDAY`, SK = `<date>`                                            |
| 2 | Get all special days in a month    | `Query` — PK = `SPECIALDAY`, SK `between` `<YYYY-MM-01>` and `<YYYY-MM-31>`              |

### Explanation

- **`SPECIALDAY`** — A fixed partition key that groups all special day items into one partition. This is safe because the total number of special days is small (low cardinality).
- **`<date>`** — The raw date (e.g., `2026-03-15`) is used directly as the SK. Since all special days share the same PK, a `between` condition on SK efficiently retrieves all days within a month or any date range.
- **No GSI needed** — Both access patterns are served directly from the main table.

---

## Headcount Summary

### Access Patterns

1. Generate headcount summary for a date (reads from Participation, Work Location, Special Day, User)
2. Get a previously generated summary for a date
3. Store a generated summary

### DB Schema

#### Headcount Summary Item

| PK               | SK        | Attributes                                              |
| ---------------- | --------- | ------------------------------------------------------- |
| `SUMMARY#<date>` | `SUMMARY` | `totalOptIn`, `totalOptOut`, `totalWFH`, `generatedAt`, … |

### How Each Access Pattern Is Served

| # | Pattern                             | Operation                                                         |
|---|-------------------------------------|-------------------------------------------------------------------|
| 1 | Generate headcount summary for a date | Application logic — reads from Meal, Location, Special Day, User |
| 2 | Get a previously generated summary  | `GetItem` — PK = `SUMMARY#<date>`, SK = `SUMMARY`                |
| 3 | Store a generated summary           | `PutItem` — PK = `SUMMARY#<date>`, SK = `SUMMARY`                |

### Explanation

- **`SUMMARY#<date>`** — Each date gets its own partition for the summary record.
- **`SUMMARY`** — A constant SK since there is only one summary per date.
- **Pattern #1 is not a DB read** — It is application logic that queries Meal Participation, Work Location, Special Day, and User items, then computes and stores the result via pattern #3.
- **No GSI needed** — Both read and write patterns are direct `GetItem`/`PutItem` operations.
