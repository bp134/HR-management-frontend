# HR Management — Entra ID + Azure

Monorepo for the HR application after migrating off Supabase.

| Package | Description |
|---------|-------------|
| [`hr-frontend/`](hr-frontend/) | React SPA (Azure Static Web Apps) — MSAL sign-in, calls HR API |
| [`hr-api/`](hr-api/) | Node/Express API (Render) — JWT auth, PostgreSQL |
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

### Azure Static Web Apps (frontend)

Environment variables:

- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID`
- `VITE_AZURE_API_SCOPE` (e.g. `api://<api-app-id>/access_as_user`)
- `VITE_API_BASE_URL` (Render API URL)

Add the Static Web App URL to the SPA app registration **Redirect URIs**. The frontend redirects Microsoft sign-in back to the site origin, for example:

```text
https://<your-static-web-app>.azurestaticapps.net
```

The Vite `public/staticwebapp.config.json` file is copied into `dist/` at build time and rewrites SPA routes such as `/login` back to `/index.html`.

### Render (API)

1. Create a Node service rooted at `hr-frontend/hr-api`.
2. Build command: `npm ci && npm run build`.
3. Start command: `npm start`.
4. Environment variables: `DATABASE_URL`, `AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`, `CORS_ORIGINS` (include the Static Web App URL).

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
