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

The starter does not assume a database schema. Create your tables and
row-level security policies in Supabase before wiring the admin modules to
queries.

## Scripts

- `npm run dev` — start Vite locally
- `npm run build` — create a production build
- `npm run preview` — preview the production build
- `npm run lint` — run Oxlint
