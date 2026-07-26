# HR Frontend

React SPA using **Microsoft Entra ID** (MSAL) and the **HR API** on Azure App Service.

See the [monorepo README](../README.md) for Entra setup, database migration, and deployment.

## Environment

Copy `.env.example` to `.env`:

```
VITE_AZURE_CLIENT_ID=...
VITE_AZURE_TENANT_ID=...
VITE_AZURE_API_SCOPE=api://<api-client-id>/access_as_user
VITE_API_BASE_URL=http://localhost:3001
```

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle
```

## Auth flow

1. User clicks **Sign in with Microsoft** on `/login`.
2. Entra redirects back with a session; MSAL acquires an access token for the HR API scope.
3. App calls `GET /api/me` — links `employees.user_id` to Entra `oid` on first login (by email).
4. Protected routes use `employees.role` for UI; the API enforces the same rules server-side.
