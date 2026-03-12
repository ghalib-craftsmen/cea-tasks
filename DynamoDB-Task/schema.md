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
