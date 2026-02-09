# Meal Headcount Planner (MHP) Technical Specification - Iteration 1

## 1. Header

**Project:** Meal Headcount Planner (MHP)  
**Iteration:** 1 — Daily Meal Opt-In/Out + Basic Visibility  
**Author:** Technical Team  
**Date:** February 9, 2026  
**Version:** 1.0  
**Status:** Draft

**Links:**
- Project Brief: (to be added)
- Related Issues: (to be added)

---

## 2. Summary

We're building a simple web app to replace the Excel spreadsheet we currently use for meal headcount. Employees can see today's meals and opt in/out themselves. Team Leads and Admins can update participation for anyone who needs help. Logistics gets a real-time headcount view to plan meals better. Everyone's opted in by default unless they say otherwise. We're supporting Lunch, Snacks, Iftar, Event Dinner, and Optional Dinner.

---

## 3. Problem Statement

The Excel spreadsheet we're using for meal headcount is painful. Someone has to collect entries manually, it's hard to see who's opted in or out in real-time, and there's no easy way to fix mistakes or missing entries. Logistics team struggles to get accurate numbers for meal planning. Moving to a web app should fix this and give everyone a better experience.

---

## 4. Goals and Non-Goals

### Goals

- Get off Excel and into a proper web app
- Let employees manage their own meal participation
- Give Logistics/Admins a real-time headcount view
- Support 4 roles: Employee, Team Lead, Admin, Logistics
- Handle 5 meal types: Lunch, Snacks, Iftar, Event Dinner, Optional Dinner
- Default everyone to opted-in unless they opt out

### Non-Goals

- No password reset in this iteration
- No email notifications
- No cutoff window enforcement (we'll figure this out later)
- No historical data, just today
- No multi-day planning yet
- No special day handling (holidays, office closed, etc.)
- No reporting or export
- No guest meals
- No bulk operations
- No HR system integration

---

## 5. Tech Stack and Rationale

**Frontend:** React

**Backend:** FastAPI

**Authentication:** JWT 

**Storage:** JSON files 

---

## 6. Scope of Changes

### What We're Building

**Frontend:**
- Login page
- Employee page to see and update their meals
- Admin page to view and update anyone's participation
- Headcount page for Logistics/Admin to see totals

**Backend:**
- Auth endpoints (login, logout)
- Meal participation endpoints
- Admin endpoints for overrides
- Headcount endpoints

**Data:**
- User accounts with roles
- Daily participation records

### What We're Not Doing (Yet)

- Password reset
- Email features
- Cutoff windows
- Historical data beyond today
- Multi-day views
- Special days
- Reports/exports
- Guest management
- Bulk actions

---

## 7. Requirements

### Functional Requirements

**Authentication:**
- Username/password login
- 4 roles: Employee, Team Lead, Admin, Logistics
- Session timeout
- Role-based access

**Employee Features:**
- View today's meals
- See current status (default: all opted in)
- Opt out of meals
- Opt back in if needed
- Changes save immediately

**Admin/Team Lead:**
- View all employees' participation
- Update anyone's participation (Admin/Logistics)
- Team Leads can update their team members

**Headcount:**
- Logistics/Admin see totals per meal type
- See participating vs opted-out counts
- Drill down to participant lists

**Meal Types:**
- Lunch, Snacks, Iftar, Event Dinner, Optional Dinner
- All available every day (for now)

### Role Permissions

| Role | View Own | Update Own | View All | Update All | View Headcount |
|-------|-----------|------------|----------|------------|----------------|
| Employee | Yes | Yes | No | No | No |
| Team Lead | Yes | Yes | Yes | Team only | No |
| Admin | Yes | Yes | Yes | Yes | Yes |
| Logistics | No | No | Yes | No | Yes |

### Validation Rules

- Valid username and password required
- Employees only update their own data
- Team Leads only update their team
- Admin updates anyone
- Logistics only views, doesn't update
- New days default to all opted in

### Definition of Done

- [ ] All requirements implemented
- [ ] Works on Chrome, Edge
- [ ] Error handling in place
- [ ] Code reviewed
- [ ] No high-severity bugs

---

## 8. User Flows

### Employee Flow

1. Employee goes to the app URL
2. Enters username and password
3. Lands on their dashboard
4. Sees 5 meal options, all checked by default
5. Unchecks "Snacks" because they're not having it
6. Clicks save
7. Sees confirmation
8. Change shows up in Logistics headcount view right away

### Admin Flow

1. Admin logs in
2. Goes to admin page
3. Sees table of all employees and their choices
4. Searches for "John Doe"
5. Clicks John's row
6. Changes John's Lunch from opted out to opted in
7. Saves
8. Table updates to show the change

### Logistics Flow

1. Logistics person logs in
2. Goes to headcount page
3. Sees totals: Lunch 115/120, Snacks 100/120, etc.
4. Clicks Lunch to see who's opted in
5. Sees list of names
6. Refreshes to check for updates

### Failure Cases

- Wrong password → Error message
- Session expired → Redirect to login
- Employee tries to update someone else → Forbidden
- Team Lead tries to update non-team member → Forbidden
- No data to show → Empty state handled gracefully

---

## 9. Design

### Architecture

Frontend (React) talks to Backend (FastAPI) via REST API. Backend reads/writes JSON files for data. Simple 3-tier setup.

### API Endpoints

| Method | Endpoint | What It Does | Who Can Use |
|---------|-----------|---------------|--------------|
| POST | `/api/auth/login` | Login | Everyone |
| POST | `/api/auth/logout` | Logout | Logged-in users |
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
- Why: Requirements aren't clear yet. Let's ship the core first.
- Trade-off: People can change their mind anytime, but that's okay for now.

**No Audit Trail**
- Why: Keep it simple. We can add logging later if needed.
- Trade-off: Won't know who changed what and when, but we're accepting that for Iteration 1.

---

## 11. Security and Access Control

### Authentication

- Passwords hashed 
- JWT tokens for sessions
- 8-hour token expiry
- Tokens sent in Authorization header

### Access Control

| Role | Login | Update Own | View All | Update All | Headcount |
|-------|--------|------------|----------|------------|-----------|
| Employee | ✓ | ✓ | ✗ | ✗ | ✗ |
| Team Lead | ✓ | ✓ | ✓ | Team | ✗ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logistics | ✓ | ✗ | ✓ | ✗ | ✓ |

### Secrets

- Never commit passwords or secrets to code
- Use environment variables
- Hash passwords before storing
- HTTPS in production

---

## 12. Testing Plan

### Unit Tests

- Auth logic (login, token generation)
- Participation logic (opt in/out)
- Headcount calculations
- Role checks

### Integration Tests

- Full login flow
- Employee update flow
- Admin override flow
- Headcount aggregation

### Manual QA Checklist

**Authentication:**
- [ ] Can log in with valid credentials
- [ ] Wrong password shows error
- [ ] Session timeout works

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
