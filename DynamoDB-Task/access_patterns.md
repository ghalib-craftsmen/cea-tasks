# DynamoDB Access Patterns

## User

1. Get user by userId
2. Get user by external identity (e.g., discordId, username)
3. Get all users

---

## Team

1. Get team by teamId
2. Get all teams

---

## Meal Participation

1. Get all participation records for a date (headcount — all users, one date)
2. Get a specific user's meals for a date (users can view/opt out here)
3. Get a specific meal record (user + date + mealType)
4. Get a user's participation history across dates (reporting)
5. Upsert participation record (Employees set their own Opt-In/Opt-Out preference via Discord bot)

---

## Work Location

1. Get all location records for a date (headcount — all users, one date)
2. Get a specific user's location for a date
3. Get a user's location records for a month (WFH overage report)
4. Upsert location record (Employees set their own Office/WFH status via Discord bot)

---

## Special Day

1. Get special day for a specific date
2. Get all special days in a month (or range)

---

## Headcount Summary

1. Generate headcount summary for a date (reads from Participation, Work Location, Special Day, User)
2. Get a previously generated summary for a date
3. Store a generated summary

---


## Notes

- **"Get the team a user belongs to"** — not a separate pattern. `teamId` is a field on the User record, so User #1 already returns it.
- **"Get all members of a team"** — not a separate Team pattern. Use User #3 (get all users) and filter by `teamId` in application code.
- **"Get all WFH employees on a date"** (with or without team scope) — covered by Work Location #1. Filter results in application code by location and optionally by `teamId`.
- **Meal Defaults & Logic** — The default meal status is **Opt-In**. Absence of a record implies Opt-In. Users explicitly Upsert records to Opt-Out. Since deleting records is out of scope, users must Upsert a record with "Opt-In" status to switch back from Opt-Out.
- **Role & Team Assignment** — Roles and Teams are managed externally via Discord Roles. The MHP system reads these attributes for permission logic and filtering but does not provide write/update patterns for them.
- **Admin/Team Lead Restrictions** — Admins and Team Leads **do not** set meal preferences for users. Only users set their own meal preferences (via Discord Slash Command).
- **Special Days / Events** — Treated as static settings for this scope. They are read-only for the application logic (Patterns #1, #2), but no write patterns are required.
- **Settings / Configuration** — System configurations (WFH periods, Cut-offs) are treated as static/external configuration and do not require specific DB access patterns in this scope.