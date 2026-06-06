# HR Management — Supabase-native frontend

A clean React + Supabase frontend for your HR management database.
No backend server. All authorisation is enforced by Supabase Row Level Security.

---

## What's included

| Screen | Who can see it |
|--------|---------------|
| Login (magic link) | Everyone |
| Dashboard | All employees |
| My Profile | All employees (own record only) |
| Leave requests | All employees (own); managers see team; HR/admin see all |
| Employee list | Managers, HR, admin |
| Employee detail / edit | Managers (read); HR/admin (read + write) |
| Contracts | Placeholder — extend once columns confirmed |
| Documents | Placeholder — extend once columns confirmed |

---

## Setup — do this once, in order

### 1. Run the database migration

1. Open your Supabase project → **SQL Editor** → **New query**
2. Open `supabase/migrations/001_auth_link_and_rls.sql` from this project
3. Paste the entire contents into the editor
4. Click **Run**

This migration:
- Adds a `user_id` column to `employees` (links each employee to their Supabase Auth account)
- Adds a `role` column to `employees` (`admin`, `hr`, `manager`, or `employee`)
- Creates three helper SQL functions used by RLS
- Drops the old broken RLS policies
- Creates correct RLS policies for all 9 tables

### 2. Set your admin account

Still in the SQL editor, run this (replace the email):

```sql
UPDATE employees
SET role = 'admin'
WHERE email = 'your-email@yourcompany.com';
```

**Do this before your first login.** If you forget, you'll log in as `employee` and
won't be able to set other roles. You can fix it by running the same query again.

### 3. Invite employees to Supabase Auth

Employees need an Auth account before they can log in. In Supabase:

- Go to **Authentication → Users → Invite user**
- Enter their email address (must match exactly what's in `employees.email`)
- They receive an invitation email; on first click they are linked to their employee record automatically

Or invite in bulk via the Supabase API / CLI if you have many employees.

### 4. Configure the app

```bash
cp .env.example .env
```

Open `.env` and fill in your two values from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

The anon key is safe to put in the browser — your RLS policies protect the data.

### 5. Install and run

You need Node.js 18 or later. Check with `node -v`.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How the auth flow works

1. Employee goes to `/login`, enters their work email
2. Supabase emails them a magic link (no password needed)
3. They click the link — Supabase sets a session cookie
4. The app calls `link_employee_to_auth()` — a SQL function that finds their
   employee record by email and sets `employees.user_id = auth.uid()`
5. From that point on, all RLS policies work correctly using `user_id`

If someone tries to log in with an email that isn't in your `employees` table,
they see an "access not granted" screen and cannot proceed.

---

## Role reference

| Role | Access |
|------|--------|
| `employee` | Own profile, own leave requests, own documents/contracts |
| `manager` | Everything above + direct reports' records and leave approval |
| `hr` | Everything above + full employee directory, all leave, all documents |
| `admin` | Full access to everything including role management |

Change a user's role:
```sql
UPDATE employees SET role = 'manager' WHERE email = 'name@company.com';
```

---

## Extending the app

The contracts and documents pages are placeholders. To extend them:

1. Run this in Supabase SQL editor to see your columns:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contracts'
ORDER BY ordinal_position;
```

2. Add the TypeScript type to `src/types/database.ts`
3. Create a hook in `src/hooks/` following the pattern in `useEmployees.ts`
4. Build the page following the pattern in `src/pages/employees/EmployeeList.tsx`

---

## Deploying

The app is a static React SPA — no server required.

**Vercel (recommended):**
```bash
npm install -g vercel
vercel
```
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables
in the Vercel dashboard.

**Netlify:**
```bash
npm run build
# Drag the dist/ folder into Netlify dashboard
```

**After deploying**, go to Supabase → **Authentication → URL Configuration** and add
your production URL to the **Redirect URLs** list so magic links work in production.

---

## Security notes

- The Supabase **anon key** is intentionally public — it has no special privileges.
  All data access is controlled by RLS policies in the database.
- The **service role key** must never appear in this codebase. It bypasses all RLS.
- NI numbers, salary data, and other sensitive fields are protected at the database
  level — an employee cannot query another employee's record even via the API.
- Magic link login means no passwords to manage, rotate, or leak.
- Consider enabling **Supabase MFA** (Dashboard → Authentication → MFA) for admin
  and HR accounts given the sensitivity of the data.
