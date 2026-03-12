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
