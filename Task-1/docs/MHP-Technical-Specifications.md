# Meal Headcount Planner (MHP) Technical Specification - Iteration 2

## 1. Header

**Project:** Meal Headcount Planner (MHP)  
**Iteration:** 2 — Team/Department Views + Special Days  
**Author:** Abdullah Al Ghalib  
**Date:** February 20, 2026  
**Version:** 2.1  
**Status:** Draft

**Links:**
- Project Brief: [(task-iteration2)](https://drive.google.com/file/d/1X5LiRPZ-8SA5ZBLslgaabMxH2tmptmb6/view?ts=698b25e6)
- Previous Iteration: [(task-iteration1)](https://drive.google.com/file/d/1PE38YEru21tkwHjIReO9-E0sNBAMf0IS/view)

---

## 2. Summary

We're building a web app to replace the Excel spreadsheet used for meal headcount. Employees can see meals, opt in/out, and set their work location (Office/WFH) for specific dates. Team Leads and Admins can update participation for their scope, apply bulk actions, and manage exceptions. Logistics gets an accurate headcount view enriched with team and location breakdowns to plan meals better. The system supports team-based visibility and special day controls (holidays, office closures) which automatically adjust meal availability. Everyone's opted in by default unless they say otherwise or the day is marked closed.

---

## 3. Problem Statement

The Excel spreadsheet we're using for meal headcount is painful. Someone has to collect entries manually, it's hard to see who's opted in or out in real-time, and there's no easy way to fix mistakes or missing entries. Logistics team struggles to get accurate numbers for meal planning. Additionally, we currently lack visibility into team-specific data, cannot handle company-wide events like holidays or office closures automatically, and have no way to track who is working from home versus in the office. This leads to inaccurate food ordering and wasted resources. Moving to a web app with team structures and working location (Office/WFH) confirmation to solve these issues.

---

## 4. Goals and Non-Goals

### Goals

- Get off Excel and into a proper web app
- Let employees manage their own meal participation and work location
- Give Logistics/Admins an accurate headcount view with team and location breakdowns
- Support 4 roles: Employee, Team Lead, Admin, Logistics
- Handle 5 meal types: Lunch, Snacks, Iftar, Event Dinner, Optional Dinner
- Default everyone to opted-in unless they opt out
- Cutoff window enforcement: Employees can update their meal participation for the current date until 9:00 PM the previous night
- Implement Team-based visibility and filtering
- Enable Admins/Logistics to define "Special Days" (Closed, Holiday, Celebration)
- Enable Admins/Logistics to manage "Company-wide WFH Periods"
- Provide bulk action capabilities for Admins and Team Leads
- Generate copy/paste-friendly daily announcements (Client-side)
- Enrich reporting with Team and Location breakdowns (Available to Admins, Logistics, and Team Leads for their respective scopes).
- Live updates via Polling (no manual page refresh required)

### Non-Goals

- No password reset in this iteration
- No email notifications
- No options for setting future meal participation 
- No guest meals
- No HR system integration
- No WebSockets or Server-Sent Events (SSE)

---

## 5. Tech Stack and Rationale

**Frontend:** React   
**Backend:** FastAPI   
**Authentication:** JWT    
**Storage:** JSON files   

**Rationale:**
- **JSON Files:** Fastest way to ship. No setup needed. Easy to inspect. We will monitor performance as we scale.
- **FastAPI:** Built-in validation, async support.
- **React:** Separation of concerns. We can run frontend and backend independently.
- **Polling for Live Updates:** Uses standard HTTP requests. Sufficient for a user base of <200.

---

## 6. Scope of Changes

### What We're Building

**Frontend:**
- Login page
- Employee page to see and update their meals and work location (Office/WFH)
- Admin page to view and update anyone's participation, manage special days, and WFH periods.
- Headcount page for Logistics/Admin/Team-Lead to see live totals broken down by team and location.
- Headcount data refreshes automatically every 10 seconds (Polling).
- Team Lead view restricted strictly to their specific team members.
- Client-side interface to generate daily announcement drafts.

**Backend:**
- Auth endpoints (login, logout)
- Meal participation endpoints (individual and bulk) generalized for shared access by Admins and Team Leads
- Endpoint to list all teams
- Endpoint for user profile
- Endpoints for managing WFH periods
- Endpoint for Admins/Team Leads to correct work locations
- Endpoints for overrides and special day management
- Headcount endpoints with filtering by team and location
- User registration endpoint (for Admin only)

**Data:**
- User accounts with roles and team assignments
- Daily participation records
- Work location records (Office/WFH) by date
- Team definitions
- Special day definitions (Holidays, Closed)
- WFH Period definitions (Date ranges)

### What We're Not Doing (Yet)

- Password reset
- Email features
- Variable Cutoff windows
- Reporting/exports beyond the daily announcement draft
- Guest management

---

## 7. Requirements

### Functional Requirements

**Authentication:**
- Username/password login
- 4 roles: Employee, Team Lead, Admin, Logistics
- Session timeout
- Role-based access

**User Profile:**
- Logged-in users can view their profile details (Name, Email, Team, Role) via API.

**User Registration:**
- User can register via `/register` API but only Admin needs to approve
- Registration API creates user entry with default role (Employee), admin can change the role later and assign to the team
- User registration stores: username, password (hashed), name, email, role, and team assignment
- Password is hashed before storage

**Employee Features:**
- View today's meals and personal team assignment
- See current status (default: all opted in)
- Opt out of meals or opt back in; changes save immediately
- Set work location for a selected date: Office / WFH
- View is restricted during "Office Closed" days (meals disabled)

**Admin/Team Lead:**
- View participation based on scope (Team Leads strictly see their own team; Admins see all)
- Update participation for anyone within their scope
- Apply bulk actions for their scope (e.g., mark a group as opted out due to offsite)
- View and update work location (Office/WFH status) for their team members (to correct missing entries).

**Special Day Controls:**
- Admin/Logistics can mark a day as:
  - Office Closed (disables meal opt-in)
  - Government Holiday
  - Special Celebration Day (with a note)
- Admin/Logistics can delete special day entries.

**WFH Period Management:**
- Admin/Logistics can declare a date range as "WFH for everyone" (sets default location).
- Admin/Logistics can view and delete declared WFH periods.
- During the declared period, the system treats employees as WFH by default for reporting.

**Headcount & Reporting:**
- **Admin/Logistics:** View totals per meal type, team, overall total, and Office vs WFH split for all teams.
- **Team Lead:** View totals per meal type and Office vs WFH split for their team only.
- **Live Updates:** The Headcount page polls the server every 10 seconds to fetch the latest data.

**Daily Announcement:**
- Logistics/Admin can generate a copy/paste-friendly message for a selected date
- The message is generated on the **Frontend** using available headcount data
- The message includes meal-wise totals and highlights special-day notes

### Role Permissions

| Role | View Own | Update Own | View Scope | Update Scope | Bulk Update | Manage Special Days | View Headcount (w/ Location Split) | Correct Location |
|-------|-----------|------------|------------|--------------|-------------|---------------------|----------------|------------------|
| Employee | Yes | Yes | No | No | No | No | No | No |
| Team Lead | Yes | Yes | Team Only | Team Only | Team Only | No | Team Only | Team Only |
| Admin | Yes | Yes | All | All | All | Yes | All | All |
| Logistics | No | No | All | No | No | Yes | All | No |

### Validation Rules

- Valid username and password required
- Username must be unique (no duplicates)
- Employees only update their own data
- Team Leads strictly view and update their own team members (cannot view other teams)
- Admin updates anyone
- Logistics only views, doesn't update participation
- New days default to all opted in unless marked as "Office Closed"
- Cannot opt-in for meals on "Office Closed" days
- Employees can update meal participation for the current date until 9:00 PM the previous night. After 9:00 PM, participation for the next day is locked and cannot be modified by employees.
- Admins and Team Leads can override participation at any time (no cutoff restriction)
- Bulk actions must only contain users within the requester's scope
- Location corrections must only target users within the requester's scope

### Definition of Done

- [ ] All requirements implemented
- [ ] Registration API working
- [ ] Works on Chrome, Edge
- [ ] Error handling in place
- [ ] Code reviewed
- [ ] QA tested
- [ ] No high-severity bugs
- [ ] Bulk actions atomic and scope-validated
- [ ] Headcount page auto-updates (polling works)
- [ ] Team Lead API scope verified (cannot access other teams)

---

## 8. User Flows

### Employee Flow

1. Employee goes to app URL and logs in.
2. Lands on their dashboard; sees their team name.
3. Views 5 meal options (all checked by default) and work location status.
4. Selects "Tomorrow" on the date picker.
5. Changes work location to "WFH".
6. Unchecks "Snacks" for today.
7. Saves changes.
8. Data is persisted for Logistics/Admin viewing.

### Team Lead Flow

1. Team Lead logs in and goes to the Team view.
2. Sees a table listing only employees within their team (showing Name, Meal Status, Location Status).
3. Selects 3 team members attending an offsite.
4. Applies bulk action: "Opt Out (All Meals)" for the offsite date.
5. System validates all selected IDs belong to the Team Lead's team; updates records.
6. Navigates to Headcount page.
7. Sees headcount totals strictly for their own team.
8. Sees Office/WFH split numbers (e.g., Lunch: 45 In | Office: 30, WFH: 15).

### Admin Flow

1. Admin logs in and goes to the admin page.
2. Sees table of all employees with team and location columns.
3. Filters by "Engineering" team.
4. Selects 5 employees attending an offsite.
5. Applies bulk action: "Opt Out (All Meals)" for the offsite date.
6. System updates records for those 5 users.

### Special Day Management Flow

1. Admin navigates to "Calendar Management".
2. Selects a date and marks it as "Office Closed".
3. Saves the entry.
4. Backend logically disables meal availability for that date.
5. Employees viewing that date see a message "Office Closed - Meals Disabled".

### WFH Period Management Flow

1. Admin navigates to "WFH Management" page.
2. Selects a Start Date and End Date.
3. Clicks "Set Company WFH".
4. System creates a WFH period entry.
5. For all dates in this range, employees default to "WFH" location in headcount reports.

### Logistics Flow

1. Logistics person logs in and goes to headcount page.
2. Sees totals: Lunch 115/120 (Office: 80, WFH: 35).
3. The page automatically refreshes the counts every 10 seconds.
4. Logistics clicks "Generate Announcement".
5. Frontend compiles the data into a text format.
6. Logistics copies the text (which includes a "Diwali Celebration" note) to post in Slack.

### Failure Cases

- Wrong password → Error message
- Session expired → Redirect to login
- Employee tries to update someone else → Forbidden
- Team Lead tries to view/update non-team member → Forbidden (403)
- User tries to opt-in on "Office Closed" day → Error "Office is closed"
- Employee tries to update meal participation after 9:00 PM cutoff → Error "Cutoff time passed. Updates locked for tomorrow's meals."

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
| GET | `/api/meals/today` | Get today's meals + my status | Logged-in users |
| PUT | `/api/meals/participation` | Update my meals | Logged-in users |
| GET | `/api/participation` | Get participation list. Scoped. Returns user details including location. | Team Lead, Admin, Logistics |
| PUT | `/api/participation` | Update someone's meals. Scoped. | Admin, Team Lead |
| POST | `/api/participation/bulk` | Bulk update participation. Scoped. | Admin, Team Lead |
| **Headcount & Reporting** | | | |
| GET | `/api/headcount` | Get aggregated totals. Scoped. Returns Office/WFH split for the requester's scope (All teams for Admin, own team for TL). | Admin, Logistics, Team Lead |
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

---

## 10. Key Decisions and Trade-offs

**JSON Files Instead of Database**
- Why: Fastest way to ship. No setup needed. Easy to inspect.
- Trade-off: Limited query capability, no transactions. We will move to a database if performance degrades.

**Polling for "Live" Updates**
- Why: Avoids the complexity of WebSockets (connection state, auth handshake). Sufficient for a small user base (100-200 users).
- Trade-off: Not truly real-time (up to 10s delay). Generates steady background HTTP traffic.

**Resource-Based Access Control**
- Why: Endpoints like `/api/participation` are generalized. The path does not dictate the role; the logic inside does. This allows Team Leads and Admins to use the same endpoints while enforcing strict data scope rules internally.

**Team-Scoped API Logic**
- Why: Security and data privacy. Team Leads should not see other teams' data.
- Implementation: The backend checks `request.user.role`. If 'Team Lead', it automatically injects `team_id = request.user.team_id` into the query filters.

**Headcount Data Visibility**
- Decision: Team Leads see the Office/WFH split for their own team. This helps them manage their team's logistics without seeing data for other teams.
- Implementation: `GET /api/headcount` checks role. If Team Lead, it calculates and returns location splits only for their team.

**Client-side Announcement Generation**
- Why: Simplifies backend; formats change frequently.
- Trade-off: Frontend logic increases slightly.

**Implicit vs Explicit Opt-Out for Office Closed**
- Decision: If a day is "Office Closed", the backend returns 0 counts logically without writing individual "Opt-Out" records for every user.

**JWT for Auth**
- Why: Stateless, standard, easy to implement.
- Trade-off: No built-in revocation, but good enough for now.

---

## 11. Security and Access Control

### Authentication

- Passwords hashed with bcrypt
- JWT tokens for sessions
- 8-hour token expiry
- Tokens sent in Authorization header

### Access Control

| Role | Login | Update Own | View All | Update All | Headcount | Register Users | Bulk Update | Manage Special Days | Correct Location |
|-------|--------|------------|----------|------------|-----------|------------------|-------------|---------------------|------------------|
| Employee | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Team Lead | ✓ | ✓ | Team Only | Team Only | Team Only | ✗ | Team Only | ✗ | Team Only |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logistics | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |


### Secrets

- Never commit passwords or secrets to code
- Use environment variables
- Hash passwords before storing
- HTTPS in production

---

## 12. Testing Plan

### Unit Tests

- Auth logic (login, token generation, registration)
- Participation logic (opt in/out)
- Headcount calculations
- Role checks
- Special Day logic (Closed day = no meals)
- Bulk action scope validation
- API Scope validation (Team Lead forbidden from viewing other teams)

### Manual QA Checklist

**Authentication:**
- [ ] Can log in with valid credentials
- [ ] Wrong password shows error
- [ ] Session timeout works

**User Profile:**
- [ ] `GET /api/me` returns correct user details.

**User Registration (API):**
- [ ] Admin can call registration endpoint
- [ ] Creates new user successfully with team assignment
- [ ] Duplicate username rejected
- [ ] Password is hashed
- [ ] Non-admin roles get Forbidden

**Employee:**
- [ ] See today's meals and team name
- [ ] Can opt out/in
- [ ] Can set Work Location (Office/WFH)
- [ ] Changes save and persist

**Admin/Team Lead:**
- [ ] See correct scope of employees
- [ ] Can update participation within scope
- [ ] Can perform bulk actions within scope
- [ ] Team Lead cannot view or update non-team member
- [ ] Team Lead sees only their team on Headcount page
- [ ] Team Lead sees Office/WFH split for their team.
- [ ] Admin/Team Lead can correct work location for users in scope.

**WFH & Special Days:**
- [ ] Admin can create WFH period.
- [ ] System defaults users to WFH during that period.
- [ ] "Office Closed" prevents meal selection.
- [ ] Announcement generation includes special notes.

---

## 13. Operations

### Logging

- Login attempts (success/fail)
- User registration events
- Participation updates (individual and bulk)
- Admin overrides
- Special day/WFH period changes
- Errors
- Authorization failures (Team Lead accessing forbidden data)

### Monitoring

- Failed logins
- Server errors
- API response times

### Deployment

- Run locally for now
- Simple npm run commands
- No CI/CD yet

### Rollback

- Revert git commit
- Restart services
- Verify basic functionality

---

## 14. Risks, Assumptions, Open Questions

### Risks

- JSON files could get corrupted if server crashes during write → We'll implement atomic writes
- Performance if we scale beyond 200 users → We'll monitor and move to DB if needed

### Assumptions

- Internal network only, not public-facing
- 100-200 employees max
- Teams are already defined
- "Office Closed" implies no meals for anyone
- Work location defaults to Office unless "Company-wide WFH" is active

### Open Questions

- [ ] Do we need audit logging later?
- [ ] Expected user count beyond 200?
- [ ] Export functionality needed?

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

### Sample Output

**Headcount View (Admin/Logistics):**
*Includes detailed Office vs. WFH split for ALL teams.*

| Team | Meal | Total | In | Out | Office | WFH |
|-------|--------|-----|------|--------|-----|---|
| Engineering | Lunch | 50 | 45 | 5 | 30 | 15 |
| HR | Lunch | 10 | 10 | 0 | 8 | 2 |
| **Total** | **Lunch** | **60** | **55** | **5** | **38** | **17** |

**Headcount View (Team Lead - Engineering):**
*Shows Office/WFH split for their team ONLY.*

| Meal | Total | In | Out | Office | WFH |  
|-------|--------|-----|------|--------|-----|
| Lunch | 50 | 45 | 5 | 30 | 15 |  
| Snacks | 50 | 40 | 10 | 25 | 15 |

**Announcement Draft:**
> **Date:** Oct 25, 2026  
> **Status:** Special Celebration (Work Anniversary)
>
> **Headcount:**
> *   Lunch: 115 (Office: 80, WFH: 35)
> *   Snacks: 100
>
> Note: Snacks will be served in the cafeteria.