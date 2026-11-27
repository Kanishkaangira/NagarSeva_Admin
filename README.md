# NagarSeva Admin

A React admin-panel starter built with Vite and connected to Supabase.

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env.local` in the project root and set your Supabase project values:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   `.env.local` is ignored by Git. Never put a Supabase `service_role` or secret
   key in a browser app. The public key is safe to expose when your database
   tables use appropriate row-level security policies.

3. Start the development server:

   ```sh
   npm run dev
   ```

## Supabase client

The client is exported from `src/lib/supabase.js`. It is `null` until both
environment variables are configured. Restart the Vite server after changing
environment variables.

The recorded Supabase migration history is in `supabase/migrations`, and current
table definitions are in `Tables schema`. Some live database objects were
created outside the recorded migrations, so a fresh local database reset is not
yet a complete reproduction of the linked project. The admin modules are not
yet wired to query report data.

## Report and AI schema

The versioned Supabase migrations are in `supabase/migrations`. Each citizen
submission remains a separate `UserReport`; `UserReport.issue_id` links it to
the shared `GovtReport` issue. `GovtReport.reporter_count` tracks distinct
citizens linked to that issue. Automated matching and AI processing are not
implemented yet.

`GovtReport.severity_level` uses the `report_severity` enum (`Low`, `Moderate`,
`High`, `Very High`, `Critical`); `severity_score` stores its numeric score
from 1 to 100 and remains null until scoring is implemented. The AI-ready
fields capture department and severity confidence values from 0 to 1, model
versions, and a `priority_breakdown` JSON object for scored factors and
human-readable reasons. Severity confidence is retained; the unused severity
model-version field has been removed.
`priority_score_district` and `priority_score_state` separately store district-
and state-level scores from 0 to 100. District admins see the district score;
state-level admins see the state score. Each score has its own confidence
(`priority_confidence_district` / `priority_confidence_state`) and model
version field. Existing shared priority confidence/version values were copied
to both scopes. Scores are not calculated yet because no scoring algorithm or
priority weights have been implemented.

`GovtReport.status` uses the `govt_report_status` enum: `Reported`, `Viewed`,
`Processing`, and `Completed`. Admins advance reports through those states
from the dashboard; linked citizen reports are kept in sync.
`GovtReport.location`, `latitude`, and `longitude` store the text location and
optional coordinates copied from the canonical citizen report.

## Scripts

- `npm run dev` — start Vite locally
- `npm run build` — create a production build
- `npm run preview` — preview the production build
- `npm run lint` — run Oxlint
