# HR Management — Entra ID + Azure

Monorepo for the HR application after migrating off Supabase.

| Package | Description |
|---------|-------------|
| [`hr-frontend/`](hr-frontend/) | React SPA (Vercel) — MSAL sign-in, calls HR API |
| [`hr-api/`](hr-api/) | Node/Express API (Azure App Service) — JWT auth, PostgreSQL |
| [`database/migrations/`](database/migrations/) | SQL scripts for Azure PostgreSQL |

## Architecture

- **Authentication:** Microsoft Entra ID (single tenant, work accounts)
- **Authorization:** HR API enforces roles (`employees.role`) and row access (ported from former RLS)
- **Database:** Azure Database for PostgreSQL Flexible Server (RLS disabled)

## Quick start (local)

### 1. Entra ID

Create two app registrations in [Microsoft Entra admin center](https://entra.microsoft.com):

1. **HR API** — expose scope `access_as_user`; note Application (client) ID.
2. **HR SPA** — platform SPA; redirect `http://localhost:5173`; API permissions → HR API → `access_as_user`.

### 2. Database

Run `database/migrations/003_azure_entra.sql` on Azure Postgres. Set an admin:

```sql
UPDATE employees SET role = 'admin' WHERE email = 'you@company.com';
```

### 3. API

```bash
cd hr-api
cp .env.example .env
# Edit DATABASE_URL, AZURE_TENANT_ID, AZURE_API_CLIENT_ID, CORS_ORIGINS
npm install
npm run dev
```

API listens on `http://localhost:3001`.

### 4. Frontend

```bash
cd hr-frontend
cp .env.example .env
# Edit VITE_AZURE_* and VITE_API_BASE_URL=http://localhost:3001
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with Microsoft.

## Deploy

### Vercel (frontend)

Environment variables:

- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID`
- `VITE_AZURE_API_SCOPE` (e.g. `api://<api-app-id>/access_as_user`)
- `VITE_API_BASE_URL` (App Service URL)

Add the Vercel URL to the SPA app registration **Redirect URIs**.

### Azure App Service (API)

1. Create Linux Node 20 Web App.
2. Deploy `hr-api` (`npm run build`, start command: `node dist/index.js`).
3. Application settings: `DATABASE_URL`, `AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`, `CORS_ORIGINS` (include Vercel URL).
4. Allow App Service outbound IPs on PostgreSQL firewall (or use VNet integration).

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| GET | `/api/me` | Profile + link Entra user to employee |
| GET | `/api/employees` | List (role-filtered) |
| GET | `/api/employees/:id` | Detail |
| PATCH | `/api/employees/:id` | Update |
| GET | `/api/leave-requests` | List |
| POST | `/api/leave-requests` | Submit |
| PATCH | `/api/leave-requests/:id/status` | Approve/reject |
| GET | `/api/dashboard/stats` | Dashboard counts |
