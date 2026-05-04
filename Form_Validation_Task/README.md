# Craftsmen Software — Job Application Form

> Multi-step job application form built for the **FE8 · Forms & Validation** module.  
> Live at **[craftsmen-job-application.vercel.app](https://craftsmen-job-application.vercel.app)**

---

## Overview

A three-step job application form that covers every concept from the FE8 session — schema-first validation, dynamic field arrays, async uniqueness checks, accessible error UX, and a mock server that randomly rejects submissions.

---

## Tech Stack

| Tool | Version | Purpose |
| ---- | ------- | ------- |
| React | 18 | UI component library |
| TypeScript | 5 | Static typing |
| Vite | 5 | Dev server & build tool |
| React Hook Form | 7 | Form state & validation triggers |
| Zod | 3 | Schema-first validation |
| @hookform/resolvers | 3 | Zod ↔ RHF bridge |

---

## Features

### Form Steps
| Step | Fields |
| ---- | ------ |
| 1 — Personal Info | First name, Last name, Email, Phone, Location, LinkedIn, GitHub, Portfolio, Current Role, Notice Period, Expected Salary |
| 2 — Experience | Years of experience, Dynamic previous jobs list (company, title, start/end date) |
| 3 — Review & Submit | Read-only summary, Cover letter, Terms agreement checkbox |

### Validation Behaviour
| Trigger | Behaviour |
| ------- | --------- |
| Typing | No validation — user not interrupted |
| `onBlur` (pristine field) | Zod validates; error shown if invalid |
| `onChange` (errored field) | Zod re-validates live — fix confirmed instantly |
| Email `onBlur` (format valid) | `checkEmailTaken` fires; `setError` if taken |
| Clicking "Next" | `trigger(stepFields)` — validates current step only |
| Clicking "Submit" | Full schema via `handleSubmit`; POST to mock API |
| Server rejects (~30%) | Error toast; form stays open for retry |

### Accessibility
- Every input has an explicit `<label htmlFor>`
- `aria-invalid` set on all fields with errors
- `aria-describedby` links inputs to their error messages
- `role="alert"` on all error paragraphs and the toast
- `aria-live="polite"` on the toast notification
- Focus moves to first invalid field on "Next"
- Step indicator uses `<ol>` with `aria-current="step"`

---

## Project Structure

```
src/
├── schema.ts              # All Zod validation schemas + FormData type
├── mockApi.ts             # Simulated email check & form submission
├── App.tsx                # Root — single useForm instance + wizard logic
├── App.css                # Craftsmen orange brand theme
├── index.css              # Global reset
├── main.tsx               # React entry point
└── components/
    ├── PersonalInfo.tsx   # Step 1 — personal + professional fields
    ├── Experience.tsx     # Step 2 — years + dynamic job list
    ├── Review.tsx         # Step 3 — summary + cover letter + terms
    └── Toast.tsx          # Success / error notification
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Test Accounts

The mock API blocks these email addresses to simulate uniqueness checks:

| Email | Result |
| ----- | ------ |
| `taken@example.com` | ❌ "This email is already registered" |
| `admin@test.com` | ❌ "This email is already registered" |
| Any other email | ✅ Passes |

The submission API randomly fails **~30%** of the time to simulate server errors — retry if you hit an error toast.

---

## Key Design Decisions

### 1. Single `useForm` across all steps
One form instance is shared via `FormProvider` so data persists when the user navigates Back. A new `useForm` per step would reset values on unmount.

### 2. `mode: "onBlur"` + `reValidateMode: "onChange"`
Validate when the user leaves a field, live-revalidate once a mistake exists. Matches the FE8 best practice — never interrupt typing.

### 3. Per-step `trigger()` on "Next"
Validates only the current step's fields. Users never see errors for fields they haven't reached. The full schema only runs on final submit.

### 4. Async check gated behind format validity
`handleEmailBlur` returns early if Zod already rejected the email format — avoids a pointless network call for a malformed address.

### 5. `field.id` as React key in `useFieldArray`
Index keys cause React to re-mount rows when an item is removed from the middle. RHF's stable UUID `id` prevents this.

### 6. No UI library
Keeps the bundle small and gives full control over `aria-*` attributes — third-party components often make accessibility harder to customise.

---

## Deployment

Deployed on **Vercel** via CLI from the project root:

```bash
vercel --prod
```

Build settings (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

---

## Module Coverage (FE8)

| Requirement | File | Detail |
| ----------- | ---- | ------ |
| 3-step wizard | `App.tsx` | `step` state + conditional render |
| Step indicator | `App.tsx` | `<ol>` with `aria-current="step"` |
| `useFieldArray` add/remove | `Experience.tsx` | `append` / `remove` |
| Zod schema, `endDate > startDate` | `schema.ts` | `jobSchema.refine()` |
| Email format validation | `schema.ts` | `z.string().email()` |
| Async email uniqueness (500ms) | `PersonalInfo.tsx` + `mockApi.ts` | `handleEmailBlur` + `checkEmailTaken` |
| `onBlur` + `onChange` re-validate | `App.tsx` | `mode` + `reValidateMode` |
| Accessible labels + aria attrs | All step components | Every field |
| Focus first error on Next | `App.tsx` `goNext()` | `getElementById().focus()` |
| Disable Next/Submit while async | `App.tsx` | `disabled={isValidating \|\| isSubmitting}` |
| Mock server random rejection | `mockApi.ts` | `Math.random() < 0.3` |
| Toast on server failure | `App.tsx` + `Toast.tsx` | `catch` → `setToast` |
| Read-only summary before submit | `Review.tsx` | `getValues()` |
| Cover letter textarea | `Review.tsx` | Optional field |
| Terms checkbox | `Review.tsx` | `z.literal(true)` |

---

*Built by [ghalib](https://github.com/ghalib-craftsmen) · Craftsmen Software · FE8 Module*
