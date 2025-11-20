# Dyllon's Service Point — Admin Dashboard

This repository contains:
- Backend (Express) that issues JWT for admin, validates JWT, and proxies queries to Supabase using the service role key.
- Frontend (React + Vite + Tailwind) admin dashboard that logs in, shows stats and leads, and allows assigning leads.

## Setup

1. Copy `.env.example` to `.env` and fill values:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — **service_role** key from Supabase (kept secret)
   - `ADMIN_EMAIL` — admin login email
   - `ADMIN_PASSWORD_HASH` — bcrypt hash of admin password (see below)
   - `JWT_SECRET` — strong secret for signing JWTs
   - `PORT` — optional (default 4000)

To create a bcrypt hash locally:
```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('yourpassword',10, (e,h)=>console.log(h))"
```

2. Install backend deps and run:
```bash
cd backend
npm install
npm run dev
```

3. Install frontend deps and run:
```bash
cd frontend
npm install
npm run dev
```

## Database notes
Expect a `leads` table in Supabase with columns:
- id (uuid)
- name (text)
- email (text)
- phone (text)
- description (text)
- status (text) -- e.g., 'open','assigned','completed'
- assigned_to (text) -- contractor id/email
- created_at (timestamp)

An example SQL to create the table:
```sql
create table leads (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text,
  phone text,
  description text,
  status text default 'open',
  assigned_to text,
  created_at timestamptz default now()
);
```

## Security
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret.
- Use HTTPS in production and secure your JWT secret.
