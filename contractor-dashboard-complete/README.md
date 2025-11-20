# Dyllon's Service Point — Contractor Dashboard

This contractor-facing dashboard is a production-ready React + Vite + Tailwind frontend that:
- Uses Supabase for authentication (magic link) or you can wire to your own auth.
- Shows assigned leads for the logged-in contractor.
- Allows contractors to update status to 'in progress' or 'completed'.

## Quick Start

1. Copy `.env.example` to `.env` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Install and run:
```bash
cd frontend
npm install
npm run dev
```

3. Sign in as a contractor via email (magic link) on the Auth page.

## Notes
- The dashboard expects a `leads` table in Supabase with fields:
  - id, name, email, phone, description, status, assigned_to, created_at
- Contractors are identified by their email; `assigned_to` should be the contractor's email.
- For production, set up row-level security in Supabase to restrict reads/writes to assigned contractors.
