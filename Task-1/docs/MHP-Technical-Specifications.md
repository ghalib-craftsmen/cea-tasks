# Meal Headcount Planner (MHP) Technical Specification - Iteration 3

## 1. Header

**Project:** Meal Headcount Planner (MHP)  
**Iteration:** 3 — Scheduling + Events + Operational Readiness  
**Author:** Abdullah Al Ghalib  
**Date:** April 15, 2026  
**Version:** 3.0  
**Status:** Draft

**Links:**
- Project Brief: [(task-iteration3)](https://drive.google.com/file/d/1vydnfbqoxQQHnOVs5lI62h3J0xJv9qWE/view)
- Previous Iteration: [(task-iteration2)](https://drive.google.com/file/d/1X5LiRPZ-8SA5ZBLslgaabMxH2tmptmb6/view?ts=698b25e6)
- Previous Iteration: [(task-iteration1)](https://drive.google.com/file/d/1PE38YEru21tkwHjIReO9-E0sNBAMf0IS/view)

---

## 2. Summary

We are building a web app to replace the Excel spreadsheet used for meal headcount. Employees can see meals, opt in/out, and set their work location (Office/WFH) for current and future dates within a defined planning window. Team Leads and Admins can update participation for their scope, apply bulk actions, and manage exceptions. Logistics gets an accurate headcount view enriched with team and location breakdowns to plan meals better. The system supports team-based visibility, special day controls (holidays, office closures), and dynamic "Event Meals" which automatically adjust meal availability. Everyone is opted in by default unless they say otherwise or the day is marked closed. To ensure operational readiness, the system provides an operational dashboard for Logistics with daily snapshots and forecasts, enforces a soft limit policy on monthly WFH days with visibility into usage trends, and maintains a comprehensive audit log of all changes to ensure accountability and traceability for corrections.

---

## 3. Problem Statement

The Excel spreadsheet we are using for meal headcount is painful. Someone has to collect entries manually, it is hard to see who has opted in or out in real-time, and there is no easy way to fix mistakes or missing entries. Logistics struggles to get accurate numbers for meal planning. We lack visibility into team-specific data, cannot handle company-wide events or ad-hoc "Event Meals" automatically, and have no way to track who is working from home versus in the office. This leads to inaccurate food ordering and wasted resources. Furthermore, employees currently cannot plan meals ahead of time, leading to last-minute rushes, and there is no audit trail to verify who made corrections or why. We also lack a mechanism to monitor WFH compliance against the monthly allowance. Moving to a web app with scheduling, audit trails, and policy tracking solves these issues.

---

## 4. Goals and Non-Goals

### Goals

- Get off Excel and into a proper web app.
- Let employees manage their own meal participation and work location for current and future dates (within a 14-day window).
- Give Logistics/Admins an accurate headcount view with team and location breakdowns, including forecasts for upcoming dates.
- Support 4 roles: Employee, Team Lead, Admin, Logistics.
- Handle standard meal types and dynamic "Event Meals" (e.g., Town Hall Dinner).
- Default everyone to opted-in unless they opt out.
- Cutoff window enforcement: Employees can update meal participation until 9:00 PM the previous night.
- Implement Team-based visibility and filtering.
- Enable Admins/Logistics to define "Special Days" (Closed, Holiday, Celebration) and "Event Meals".
- Enable Admins/Logistics to manage "Company-wide WFH Periods".
- Provide bulk action capabilities for Admins and Team Leads.
- Generate copy/paste-friendly daily announcements (Client-side).
- Enrich reporting with Team and Location breakdowns.
- Live updates via Polling (no manual page refresh required).
- Provide an Operational Dashboard for Logistics/Admins with daily snapshots and forecasts.
- Implement "Soft Limit" WFH policy tracking (5 days/month) with over-limit indicators and filters.
- Maintain a full Audit Log of participation and location changes to ensure accountability.

### Non-Goals

- No password reset in this iteration.
- No email notifications.
- No guest meals.
- No HR system integration.
- No WebSockets or Server-Sent Events (SSE).
- No hard blocking of WFH entries (Soft Limit only).
- No retroactive updates for past dates by employees.

---

## 5. Tech Stack and Rationale

**Frontend:** React   
**Backend:** FastAPI   
**Authentication:** JWT    
**Storage:** JSON files   

**Rationale:**
- **JSON Files:** Fastest way to ship. No setup needed. Easy to inspect. We will monitor performance and file size (especially for audit logs) as we scale.
- **FastAPI:** Built-in validation, async support.
- **React:** Separation of concerns. We can run frontend and backend independently.
- **Polling for Live Updates:** Uses standard HTTP requests. Sufficient for a user base of <200.

---

## 6. Scope of Changes

### What We're Building

**Frontend:**
- Login page.
- Employee page to see and update meals and work location (Office/WFH) for current and future dates.
- Calendar/Date picker to navigate within the allowed scheduling window.
- Admin page to view and update anyone's participation, manage special days, WFH periods, and Event Meals.
- Operational Dashboard for Logistics/Admins showing "Today's Snapshot", "Upcoming Forecast", and "WFH Policy Alerts".
- Headcount page for Logistics/Admin/Team-Lead to see live totals broken down by team and location.
- WFH Usage Summary views with "Over Limit" indicators and filters for Team Leads and Admins.
- Headcount data refreshes automatically every 10 seconds (Polling).
- Team Lead view restricted strictly to their specific team members.
- Client-side interface to generate daily announcement drafts.
- Audit Log viewer for Admins/Logistics (and Team Leads for their scope).

**Backend:**
- Auth endpoints (login, logout).
- Meal participation endpoints (individual and bulk) generalized for shared access by Admins and Team Leads.
- Endpoint to list all teams.
- Endpoint for user profile.
- Endpoints for managing WFH periods and Event Meals.
- Endpoint for Admins/Team Leads to correct work locations.
- Endpoints for overrides and special day management.
- Headcount endpoints with filtering by team, location, and date.
- User registration endpoint (for Admin only).
- WFH Usage calculation endpoints (monthly aggregation).
- Dashboard summary endpoint.
- Audit Logging service to capture actor, target, and change details on every update.

**Data:**
- User accounts with roles and team assignments.
- Daily participation records.
- Work location records (Office/WFH) by date.
- Team definitions.
- Special day definitions (Holidays, Closed).
- WFH Period definitions (Date ranges).
- Event Meal definitions (Ad-hoc meals).
- Audit Log records (Immutable history of changes).

### What We're Not Doing (Yet)

- Password reset.
- Email features.
- Variable Cutoff windows.
- Reporting/exports beyond the daily announcement draft.
- Guest management.
- Hard limits on WFH usage.

---

## 7. Requirements

### Functional Requirements

**Authentication:**
- Username/password login.
- 4 roles: Employee, Team Lead, Admin, Logistics.
- Session timeout.
- Role-based access.

**User Profile:**
- Logged-in users can view their profile details (Name, Email, Team, Role) via API.

**User Registration:**
- User can register via `/register` API but only Admin needs to approve.
- Registration API creates user entry with default role (Employee), admin can change the role later and assign to the team.
- Password is hashed before storage.

**Employee Features:**
- View meals and personal team assignment for a selected date.
- Select dates within a forward window (e.g., 14 days) to plan ahead.
- See current status (default: all opted in).
- Opt out of meals or opt back in; changes save immediately.
- Set work location for a selected date: Office / WFH.
- View personal WFH usage summary for the current month.
- View is restricted during "Office Closed" days (meals disabled).

**Admin/Team Lead:**
- View participation based on scope (Team Leads strictly see their own team; Admins see all).
- Update participation for anyone within their scope.
- Apply bulk actions for their scope (e.g., mark a group as opted out due to offsite).
- View and update work location (Office/WFH status) for their team members.
- View Audit Logs to trace who changed what and when.
- Filter views to show employees exceeding monthly WFH allowance.

**Special Day Controls:**
- Admin/Logistics can mark a day as:
  - Office Closed (disables meal opt-in).
  - Government Holiday.
  - Special Celebration Day (with a note).
- Admin/Logistics can delete special day entries.

**Event Meals:**
- Admin/Logistics can create "Event Meals" (e.g., Event Dinner) with Date, Meal Type, and Optional Note.
- Employees can opt in/out specifically for event meals.
- Event meals appear alongside standard meals for the specific date.

**WFH Period Management:**
- Admin/Logistics can declare a date range as "WFH for everyone" (sets default location).
- During the declared period, the system treats employees as WFH by default for reporting.

**WFH Usage & Policy:**
- System shows WFH days used per employee for the current month.
- Standard allowance is 5 days per month.
- Entries beyond the allowance are accepted (Soft Limit).
- Over-limit indicators highlight employees in Team Lead and Admin views.
- Reports include rollups: number of employees over limit and total extra days.

**Headcount & Reporting:**
- **Admin/Logistics:** View totals per meal type, team, overall total, and Office vs WFH split for all teams for any valid date.
- **Team Lead:** View totals per meal type and Office vs WFH split for their team only.
- **Forecasting:** Logistics/Admins can view headcount forecasts for upcoming dates.
- **Live Updates:** The Headcount page polls the server every 10 seconds to fetch the latest data.

**Daily Announcement:**
- Logistics/Admin can generate a copy/paste-friendly message for a selected date.
- The message is generated on the **Frontend** using available headcount data.
- The message includes meal-wise totals and highlights special-day notes or event meals.

**Auditability:**
- Admin/Logistics can see "who changed what and when" for participation entries.
- System logs the actor, target user, timestamp, and change details for every update.

### Role Permissions

| Role | View Own | Update Own | View Scope | Update Scope | Bulk Update | Manage Special Days | Manage Events | View Headcount | Correct Location | View Audit Logs | View WFH Compliance |
|-------|-----------|------------|------------|--------------|-------------|---------------------|---------------|----------------|------------------|-----------------|----------------------|
| Employee | Yes | Yes | No | No | No | No | No | No | No | No | Self Only |
| Team Lead | Yes | Yes | Team Only | Team Only | Team Only | No | No | Team Only | Team Only | Team Only | Team Only |
| Admin | Yes | Yes | All | All | All | Yes | Yes | All | All | All | All |
| Logistics | No | No | All | No | No | Yes | Yes | All | No | All | All |

### Validation Rules

- Valid username and password required.
- Username must be unique (no duplicates).
- Employees only update their own data.
- Team Leads strictly view and update their own team members (cannot view other teams).
- Admin updates anyone.
- Logistics only views, doesn't update participation.
- New days default to all opted in unless marked as "Office Closed".
- Cannot opt-in for meals on "Office Closed" days (unless an Event Meal is scheduled).
- Employees can update meal participation for a specific date until 9:00 PM the previous night.
- Admins and Team Leads can override participation at any time (no cutoff restriction).
- Bulk actions must only contain users within the requester's scope.
- Future planning is restricted to a defined forward window (e.g., 14 days).

### Definition of Done

- [ ] All requirements implemented.
- [ ] Registration API working.
- [ ] Works on Chrome, Edge.
- [ ] Error handling in place.
- [ ] Code reviewed.
- [ ] QA tested.
- [ ] No high-severity bugs.
- [ ] Bulk actions atomic and scope-validated.
- [ ] Headcount page auto-updates (polling works).
- [ ] Team Lead API scope verified (cannot access other teams).
- [ ] Future dates visible and editable within window.
- [ ] Event Meals manageable and visible.
- [ ] Audit logs recorded for changes.
- [ ] WFH Over-limit indicators function correctly.

---

## 8. User Flows

### Employee Flow
1. Employee goes to app URL and logs in.
2. Lands on their dashboard; sees their team name.
3. Clicks "Next Week" on the date picker to plan ahead.
4. Views meal options and work location status for that future date.
5. Changes work location to "WFH".
6. Checks sidebar: sees "WFH Usage: 4/5 days".
7. Unchecks "Snacks" for the selected date.
8. Saves changes; data is persisted.

### Team Lead Flow
1. Team Lead logs in and goes to the Team view.
2. Sees a table listing only employees within their team.
3. Notices a red warning icon next to Alice's name indicating "WFH Limit Exceeded".
4. Applies Filter: "Show Over Limit Only".
5. List filters to show only Alice and Bob.
6. Selects 3 team members attending an offsite.
7. Applies bulk action: "Opt Out (All Meals)" for the offsite date.
8. System validates scope; updates records; logs the action.
9. Navigates to Headcount page to see forecast for the next 3 days.

### Admin Flow
1. Admin logs in and goes to the Admin page.
2. Creates a new "Event Meal" for next Friday: "Town Hall Dinner".
3. Navigates to the Operational Dashboard.
4. Sees "Today's Snapshot" and "WFH Policy Alert" (5 employees over limit).
5. Opens Audit Logs to verify a recent correction made for a user.

### Logistics Flow
1. Logistics person logs in and lands on the Operational Dashboard.
2. Glances at "Tomorrow's Forecast" widget.
3. Navigates to detailed Headcount page.
4. Sees totals: Lunch 115/120 (Office: 80, WFH: 35).
5. The page automatically refreshes every 10 seconds.
6. Logistics clicks "Generate Announcement" for the event date.
7. Frontend compiles text including "Town Hall Dinner" note.

---

## 9. Design

### Architecture
Frontend (React) talks to Backend (FastAPI) via REST API. Backend reads/writes JSON files for data. The Frontend implements an interval timer to poll the API for headcount updates.

### API Endpoints

| Method | Endpoint | What It Does | Who Can Use |
|---------|-----------|---------------|--------------|
| **Authentication & User** | | | |
| POST | `/api/auth/login` | Login | Everyone |
| POST | `/api/auth/logout` | Logout | Logged-in users |
| POST | `/api/auth/register` | Register new user | Admin |
| GET | `/api/me` | Get current user profile | Logged-in users |
| **Teams** | | | |
| GET | `/api/teams` | Get list of all teams | Admin, Team Lead, Logistics |
| **Meal Participation** | | | |
| GET | `/api/meals?date=YYYY-MM-DD` | Get meals + status for specific date | Logged-in users |
| PUT | `/api/meals/participation` | Update my meals (supports date) | Logged-in users |
| GET | `/api/participation` | Get participation list. Scoped. | Team Lead, Admin, Logistics |
| PUT | `/api/participation` | Update someone's meals. Scoped. | Admin, Team Lead |
| POST | `/api/participation/bulk` | Bulk update participation. Scoped. | Admin, Team Lead |
| **Event Meals** | | | |
| GET | `/api/event-meals` | List event meals | Everyone |
| POST | `/api/event-meals` | Create event meal | Admin, Logistics |
| DELETE | `/api/event-meals/:id` | Remove event meal | Admin, Logistics |
| **Headcount & Reporting** | | | |
| GET | `/api/headcount?date=YYYY-MM-DD` | Get aggregated totals. Scoped. | Admin, Logistics, Team Lead |
| GET | `/api/dashboard/summary` | Get Today + Forecast + Alerts | Admin, Logistics |
| GET | `/api/wfh-summary` | Get WFH usage stats (scoped) | Team Lead, Admin, Logistics |
| **Work Location** | | | |
| GET | `/api/me/location` | Get my work location | Everyone |
| PUT | `/api/me/location` | Set my work location | Everyone |
| PUT | `/api/work-location` | Update work location for a specific user. Scoped. | Admin, Team Lead |
| **WFH Period Management** | | | |
| GET | `/api/wfh-periods` | List all declared WFH periods | Admin, Logistics |
| POST | `/api/wfh-periods` | Declare a new WFH period | Admin, Logistics |
| DELETE | `/api/wfh-periods/:id` | Remove a WFH period | Admin, Logistics |
| **Special Days Management** | | | |
| GET | `/api/special-days` | Get special days list | Admin, Logistics |
| POST | `/api/special-days` | Create special day entry | Admin, Logistics |
| DELETE | `/api/special-days/:id` | Remove a special day entry | Admin, Logistics |
| **Audit Logs** | | | |
| GET | `/api/audit-logs` | View change history (filterable) | Admin, Logistics, Team Lead |

---

## 10. Key Decisions and Trade-offs

**JSON Files Instead of Database**
- Why: Fastest way to ship. No setup needed. Easy to inspect.
- Trade-off: Limited query capability. Audit logs will require careful file management (rolling files) to prevent performance issues.

**Polling for "Live" Updates**
- Why: Avoids the complexity of WebSockets. Sufficient for <200 users.
- Trade-off: Not truly real-time (up to 10s delay).

**Future Planning Window**
- Decision: Limit forward planning to 14 days.
- Why: Balances employee convenience with Logistics' need for accurate data, preventing stale commitments months in advance.

**Soft Limit on WFH**
- Decision: System accepts WFH entries beyond 5 days but flags them.
- Why: Enforces policy via management review/social pressure rather than hard system lockout, maintaining flexibility.

**Audit Logs**
- Decision: Append-only JSON log file.
- Why: Ensures traceability and accountability for all modifications.

**Resource-Based Access Control**
- Why: Endpoints like `/api/participation` are generalized. The path does not dictate the role; the logic inside does.

**Team-Scoped API Logic**
- Why: Security and data privacy. Team Leads should not see other teams' data.

---

## 11. Security and Access Control

### Authentication
- Passwords hashed with bcrypt.
- JWT tokens for sessions.
- 8-hour token expiry.
- Tokens sent in Authorization header.

### Access Control

| Role | Login | Update Own | View All | Update All | Headcount | Register Users | Bulk Update | Manage Special Days | Correct Location | Manage Events | View Audit Logs |
|-------|--------|------------|----------|------------|-----------|------------------|-------------|---------------------|------------------|----------------|------------------|
| Employee | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Team Lead | ✓ | ✓ | Team Only | Team Only | Team Only | ✗ | Team Only | ✗ | Team Only | ✗ | Team Only |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logistics | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ |

### Secrets
- Never commit passwords or secrets to code.
- Use environment variables.
- Hash passwords before storing.
- HTTPS in production.

---

## 12. Testing Plan

### Unit Tests
- Auth logic (login, token generation, registration).
- Participation logic (opt in/out).
- Headcount calculations.
- Role checks.
- Special Day logic (Closed day = no meals).
- Bulk action scope validation.
- API Scope validation (Team Lead forbidden from viewing other teams).
- Future date validation (allow within window, block outside).
- WFH Counter logic (reset monthly, count correctly).
- Audit Log generation on update.

### Manual QA Checklist

**Authentication:**
- [ ] Can log in with valid credentials.
- [ ] Wrong password shows error.
- [ ] Session timeout works.

**User Profile:**
- [ ] `GET /api/me` returns correct user details.

**User Registration (API):**
- [ ] Admin can call registration endpoint.
- [ ] Creates new user successfully.

**Employee:**
- [ ] See today's meals and team name.
- [ ] Can opt out/in.
- [ ] Can set Work Location (Office/WFH).
- [ ] Can set status for future date (within window).
- [ ] Cannot set status for date outside window.
- [ ] Can see own WFH usage count.

**Admin/Team Lead:**
- [ ] See correct scope of employees.
- [ ] Can update participation within scope.
- [ ] Can perform bulk actions within scope.
- [ ] Team Lead cannot view or update non-team member.
- [ ] Can see Over-Limit indicators for WFH.
- [ ] Can filter list by Over-Limit.
- [ ] Can view Audit Logs for changes.

**WFH & Special Days:**
- [ ] Admin can create WFH period.
- [ ] System defaults users to WFH during that period.
- [ ] "Office Closed" prevents meal selection.
- [ ] Announcement generation includes special notes.

**Audit:**
- [ ] Opt-out action appears in Audit Log.
- [ ] Admin override appears in Audit Log with correct "Actor".

---

## 13. Operations

### Logging
- Login attempts (success/fail).
- User registration events.
- Participation updates (individual and bulk).
- Admin overrides.
- Special day/WFH period changes.
- Errors.
- Authorization failures.

### Monitoring
- Failed logins.
- Server errors.
- API response times.
- Audit Log file size.

### Deployment
- Run locally for now.
- Simple npm run commands.
- No CI/CD yet.

### Rollback
- Revert git commit.
- Restart services.
- Verify basic functionality.

---

## 14. Risks, Assumptions, Open Questions

### Risks
- JSON files could get corrupted if server crashes during write → We'll implement atomic writes.
- Audit Log file growth might impact performance → We will implement manual rotation or move to DB if file size > 10MB.

### Assumptions
- Internal network only, not public-facing.
- 100-200 employees max.
- Teams are already defined.
- "Office Closed" implies no meals for anyone.
- Work location defaults to Office unless "Company-wide WFH" is active.
- "Month" is defined as Calendar Month (1st to 30th/31st).

### Open Questions
- [ ] Expected user count beyond 200?
- [ ] Export functionality needed?
- [ ] Should WFH limit be prorated for new joiners?

---

## 15. Appendix

### Glossary

| Term | What It Means |
|------|---------------|
| MHP | Meal Headcount Planner — this app |
| Opt-In | Saying "yes" to a meal |
| Opt-Out | Saying "no" to a meal |
| Headcount | How many people opted in |
| TL | Team Lead |
| JWT | JSON Web Token — how we do auth |
| WFH | Work From Home |
| Soft Limit | A policy limit that triggers a warning but does not block the action |
| Event Meal | A one-off meal option created by Admins |

### Sample Output

**Headcount View (Admin/Logistics):**

| Team | Meal | Total | In | Out | Office | WFH |
|-------|--------|-----|------|--------|-----|---|
| Engineering | Lunch | 50 | 45 | 5 | 30 | 15 |
| HR | Lunch | 10 | 10 | 0 | 8 | 2 |
| **Total** | **Lunch** | **60** | **55** | **5** | **38** | **17** |

**WFH Compliance View (Team Lead):**

| Employee | WFH Days Used | Status |
|-----------|---------------|--------|
| Alice | 6 | **Over Limit** |
| Bob | 3 | OK |

**Announcement Draft:**
> **Date:** Oct 25, 2026  
> **Status:** Special Celebration (Work Anniversary)
>
> **Headcount:**
> *   Lunch: 115 (Office: 80, WFH: 35)
> *   Snacks: 100
> *   **Event:** Town Hall Dinner: 50
>
> Note: Snacks will be served in the cafeteria.