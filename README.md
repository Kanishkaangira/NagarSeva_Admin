# NagarSeva Admin Portal

The NagarSeva Admin Portal is a React web application for authorized government
staff to review citizen reports, monitor their status, and record resolution
work. It is built with Vite and connects to Supabase for authentication,
database access, and resolution-photo storage.

This repository contains the admin portal. It does not contain the citizen
mobile app, the Supabase backend, or the Python AI-agent service.

## What the portal supports

- **Role-scoped access**
  - `superadmin` can review reports statewide and browse the department,
    district, and administrator directories.
  - `stateadmin` can review reports for the department assigned to their
    account and filter those reports by district.
  - `districtadmin` can review reports only for their assigned department and
    district.
  - The portal reads each administrator's scope from `admin_users`. Supabase
    Row Level Security (RLS) must also enforce these scopes.
- **Dashboard and report review** — total, viewed, processing, and completed
  counts; search and status/severity filters; complaint details; and available
  priority and severity information.
- **Resolution workflow** — staff can save authority remarks and a resolution
  note, update the report status, and upload resolution evidence to the
  existing `govt-resolution` Storage bucket. Saving a non-empty resolution
  note marks the report `Completed`; database triggers synchronize the
  citizen-facing report status.
- **Citizen feedback display** — citizen verification and feedback are shown
  as report information for staff.

The portal displays AI-related fields already stored in `GovtReport` (such as
severity, priority scores, and confidence values). It does not run AI agents,
calculate these scores, or automatically assign departments.

The AI-agent workflow specification is in
[`aboutaiagentworkflow.txt`](./aboutaiagentworkflow.txt). It describes a
separate service that is not implemented in this repository.

## Requirements

- Node.js and npm
- A Supabase project configured for the NagarSeva schema, authentication,
  policies, and Storage buckets

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env.local` in the project root:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   The Supabase client is configured in `src/lib/supabase.js` and is available
   only when both values are present. Restart the Vite server after changing
   environment variables.

3. Start the development server:

   ```sh
   npm run dev
   ```

## Supabase data model

- `"UserReport"` stores citizen submissions.
- `"GovtReport"` stores the government-facing issue, including its workflow
  status, assigned department and district, severity and priority fields, and
  resolution information.
- `UserReport.issue_id` links a submission to its canonical `GovtReport`.
- `admin_users.department_id` and `admin_users.district_id` define the scope
  used by the portal for department and district administrators.

The report status values used by the portal are `Reported`, `Viewed`,
`Processing`, and `Completed`. The versioned migrations are in
[`supabase/migrations/`](./supabase/migrations/), and table snapshots are in
[`Tables schema/`](./Tables%20schema/).

The recorded migrations may not reproduce every object in the linked Supabase
project; some live database or Storage configuration was created outside the
versioned migration history. Verify the linked project before resetting or
recreating its database.

## Security notes

- Use only the Supabase publishable key in this browser application. Never put
  a `service_role` key or other secret in `VITE_*` variables or client code.
- Keep RLS enabled and verify the policies for reports, administrator records,
  and Storage. Client-side filtering is not a substitute for database access
  controls.
- The resolution-photo upload feature expects the existing private
  `govt-resolution` bucket and its policies to be configured in Supabase.

## Available scripts

- `npm run dev` — start the local Vite development server
- `npm run build` — create a production build
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint
