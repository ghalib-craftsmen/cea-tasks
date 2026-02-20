# Meal Headcount Planner (MHP) Technical Specification - Iteration 2

## 1. Header

**Project:** Meal Headcount Planner (MHP)  
**Iteration:** 2 — Team/Department Views + Special Days  
**Author:** Abdullah Al Ghalib  
**Date:** February 20, 2026  
**Version:** 2.0  
**Status:** Draft

**Links:**
- Project Brief: [(task-iteration2)](link-to-file)
- Previous Iteration: [(task-iteration1)](https://drive.google.com/file/d/1PE38YEru21tkwHjIReO9-E0sNBAMf0IS/view)

---

## 2. Summary

We're building a web app to replace the Excel spreadsheet used for meal headcount. Employees can see meals, opt in/out, and set their work location (Office/WFH) for specific dates. Team Leads and Admins can update participation for their scope, apply bulk actions, and manage exceptions. Logistics gets a real-time headcount view enriched with team and location breakdowns to plan meals better. The system supports team-based visibility and special day controls (holidays, office closures) which automatically adjust meal availability. Everyone's opted in by default unless they say otherwise or the day is marked closed.

---

## 3. Problem Statement

The Excel spreadsheet we're using for meal headcount is painful. Someone has to collect entries manually, it's hard to see who's opted in or out in real-time, and there's no easy way to fix mistakes or missing entries. Logistics team struggles to get accurate numbers for meal planning. Additionally, we currently lack visibility into team-specific data, cannot handle company-wide events like holidays or office closures automatically, and have no way to track who is working from home versus in the office. This leads to inaccurate food ordering and wasted resources. Moving to a web app with team structures and working location (Office/WFH) confirmation to solve these issues.

---

## 4. Goals and Non-Goals

### Goals


- Get off Excel and into a proper web app
- Let employees manage their own meal participation and work location
- Give Logistics/Admins a real-time headcount view with live updates
- Support 4 roles: Employee, Team Lead, Admin, Logistics
- Handle 5 meal types: Lunch, Snacks, Iftar, Event Dinner, Optional Dinner
- Default everyone to opted-in unless they opt out
- Cutoff window enforcement (previous day at 9:00 pm)
- Implement Team-based visibility and filtering
- Enable Admins/Logistics to define "Special Days" (Closed, Holiday, Celebration)
- Provide bulk action capabilities for Admins and Team Leads
- Generate copy/paste-friendly daily announcements
- Enrich reporting with Team and Location breakdowns

### Non-Goals

- No password reset in this iteration
- No email notifications
- No options for setting future meal participation 
- No guest meals
- No HR system integration

---

## 5. Tech Stack and Rationale

**Frontend:** React   
**Backend:** FastAPI   
**Authentication:** JWT    
**Storage:** JSON files   
**Real-time:** WebSockets (via FastAPI `websockets`)

**Rationale:**
- **JSON Files:** Fastest way to ship. No setup needed. Easy to inspect. We will monitor performance as we scale.
- **FastAPI:** Built-in validation, async support, and native WebSocket support for live updates.
- **React:** Separation of concerns. We can run frontend and backend independently.
- **WebSockets:** Essential for the "no refresh" requirement for live headcount updates.  

---

## 6. Scope of Changes

### What We're Building

**Frontend:**
- Login page
- Employee page to see and update their meals and work location (Office/WFH)
- Admin page to view and update anyone's participation and manage special days
- Headcount page for Logistics/Admin to see live totals broken down by team and location
- Team Lead view restricted to their specific team members
- Interface to generate daily announcement drafts

**Backend:**
- Auth endpoints (login, logout)
- Meal participation endpoints (individual and bulk)
- Admin endpoints for overrides and special day management
- Headcount endpoints with filtering by team and location
- User registration endpoint (for Admin only)
- WebSocket server for broadcasting live updates

**Data:**
- User accounts with roles and team assignments
- Daily participation records
- Work location records (Office/WFH) by date
- Team definitions
- Special day definitions (Holidays, Closed, WFH periods)

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
- View participation based on scope (Team Leads see their team; Admins see all)
- Update participation for anyone within their scope
- Apply bulk actions for their scope (e.g., mark a group as opted out due to offsite)
- Correct missing work-location entries for their scope when needed

**Special Day Controls:**
- Admin/Logistics can mark a day as:
  - Office Closed (disables meal opt-in)
  - Government Holiday
  - Special Celebration Day (with a note)
- Admin/Logistics can declare a date range as "WFH for everyone" (sets default location)
- The system adjusts meal availability and default locations based on the day type

**Headcount & Reporting:**
- Logistics/Admin see totals per meal type
- View participating vs opted-out counts
- Drill down to participant lists
- Headcount totals available by: Meal type, Team, Overall total, Office vs WFH split
- Updates occur immediately without reloading the page (Live Updates)

**Daily Announcement:**
- Logistics/Admin can generate a copy/paste-friendly message for a selected date
- The message includes meal-wise totals and highlights special-day notes

### Role Permissions

| Role | View Own | Update Own | View Scope | Update Scope | Bulk Update | Manage Special Days | View Headcount |
|-------|-----------|------------|------------|--------------|-------------|---------------------|----------------|
| Employee | Yes | Yes | No | No | No | No | No |
| Team Lead | Yes | Yes | Team | Team | Team | No | No |
| Admin | Yes | Yes | All | All | All | Yes | Yes |
| Logistics | No | No | All | No | No | Yes | Yes |

### Validation Rules

- Valid username and password required
- Username must be unique (no duplicates)
- Employees only update their own data
- Team Leads only update their team
- Admin updates anyone
- Logistics only views, doesn't update participation
- New days default to all opted in unless marked as "Office Closed"
- Cannot opt-in for meals on "Office Closed" days
- Bulk actions must only contain users within the requester's scope


### Definition of Done

- [ ] All requirements implemented
- [ ] Registration API working
- [ ] Works on Chrome, Edge
- [ ] Error handling in place
- [ ] Code reviewed
- [ ] QA tested
- [ ] No high-severity bugs
- [ ] Live updates functioning via WebSockets
- [ ] Bulk actions atomic and scope-validated

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
8. Headcount views (Logistics/Admin) update immediately to reflect the location change and meal opt-out.

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

### Logistics Flow

1. Logistics person logs in and goes to headcount page.
2. Sees live totals: Lunch 115/120 (Office: 80, WFH: 35).
3. Generates the "Daily Announcement" for the date.
4. Copies the text (which includes a "Diwali Celebration" note) to post in Slack.

### Failure Cases

- Wrong password → Error message
- Session expired → Redirect to login
- Employee tries to update someone else → Forbidden
- Team Lead tries to update non-team member → Forbidden
- User tries to opt-in on "Office Closed" day → Error "Office is closed"
- WebSocket disconnects → UI shows "Reconnecting..." status


---

## 9. Design

### Architecture

Frontend (React) talks to Backend (FastAPI) via REST API. Backend reads/writes JSON files for data. Simple 3-tier setup.

### API Endpoints

| Method | Endpoint | What It Does | Who Can Use |
|---------|-----------|---------------|--------------|
| POST | `/api/auth/login` | Login | Everyone |
| POST | `/api/auth/logout` | Logout | Logged-in users |
| POST | `/api/auth/register` | Register new user | Admin |
| GET | `/api/meals/today` | Get today's meals + my status | Logged-in users |
| PUT | `/api/meals/participation` | Update my meals | Logged-in users |
| GET | `/api/admin/participation` | Get everyone's participation | Team Lead, Admin, Logistics |
| PUT | `/api/admin/participation` | Update someone's meals | Admin, Logistics |
| GET | `/api/headcount` | Get headcount totals | Admin, Logistics |
| GET | `/api/headcount/:mealTypeId` | Get who's opted in for a meal | Admin, Logistics |

---

## 10. Key Decisions and Trade-offs

**JSON Files Instead of Database**
- Why: Fastest way to ship. No setup needed. Easy to inspect.
- Trade-off: Limited query capability, no transactions. If this becomes a problem, we'll move to a real database in Iteration 2.

**FastAPI Over Express/Node**
- Why: Built-in validation, async support, good TypeScript integration.
- Trade-off: Separate backend from frontend, but gives us better control and separation of concerns.

**JWT for Auth**
- Why: Stateless, standard, easy to implement.
- Trade-off: No built-in revocation, but good enough for now.

**React Instead of Next.js**
- Why: Separation of concerns. We can run frontend and backend independently.
- Trade-off: Need to manage build/deploy separately, but flexibility is worth it.

**No Cutoff Window Yet**
- Why: Requirements aren't complete yet. Let's ship the core first iteration.
- Trade-off: People can change their mind anytime, but that's okay for now.

**No Audit Trail**
- Why: Keep it simple. We can add logging later if needed.
- Trade-off: Won't know who changed what and when, but we're accepting that for Iteration 1.

---

## 11. Security and Access Control

### Authentication

- Passwords hashed with bcrypt
- JWT tokens for sessions
- 8-hour token expiry
- Tokens sent in Authorization header

### Access Control

| Role | Login | Update Own | View All | Update All | Headcount | Register Users |
|-------|--------|------------|----------|------------|-----------|------------------|
| Employee | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Team Lead | ✓ | ✓ | ✓ | Team | ✗ | ✗ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logistics | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ |


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
  

### Manual QA Checklist

**Authentication:**
- [ ] Can log in with valid credentials
- [ ] Wrong password shows error
- [ ] Session timeout works

**User Registration (API):**
- [ ] Admin/Logistics can call registration endpoint
- [ ] Creates new user successfully
- [ ] Duplicate username rejected with error
- [ ] Password is hashed (not plaintext) in JSON
- [ ] User can log in with registered credentials
- [ ] Non-admin roles get Forbidden when trying to register
- [ ] Script for creating new users in bulk
- [ ] Script for creating new admin for testing

**Employee:**
- [ ] See today's meals
- [ ] All meals checked by default
- [ ] Can opt out
- [ ] Can opt back in
- [ ] Changes save and persist

**Admin:**
- [ ] See all employees
- [ ] Can update anyone's meals
- [ ] Team Lead can only update team
- [ ] Logistics is read-only

**Headcount:**
- [ ] See correct totals
- [ ] Can drill down to names
- [ ] Updates in real-time

---

## 13. Operations

### Logging

- Login attempts (success/fail)
- User registration events
- Participation updates
- Admin overrides
- Errors

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
- Two admins updating same person at once → Unlikely with our team size, we'll document to avoid concurrent edits
- Performance if we scale beyond 200 users → We'll monitor and move to DB if needed

### Assumptions

- Internal network only, not public-facing
- 100-200 employees max
- Admin registers new users via API initially
- Admin creates user accounts upfront
- Teams are already defined
- All 5 meals available daily
- Backup handled externally

### Open Questions

- [ ] What's the cutoff window timeframe? (Iteration 2)
- [ ] Do we need audit logging later?
- [ ] Expected user count beyond 200?
- [ ] Special day types in Iteration 2?
- [ ] Export functionality needed?
- [ ] Should we build UI for user registration in Iteration 2?

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

### Sample Output

Headcount view shows something like:

| Meal | Total | In | Out | % |
|-------|--------|-----|------|---|
| Lunch | 120 | 115 | 5 | 96% |
| Snacks | 120 | 100 | 20 | 83% |
| Iftar | 120 | 45 | 75 | 38% |
