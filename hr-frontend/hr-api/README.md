# HR API

Express API for Azure App Service. Validates Entra JWTs and reads/writes Azure PostgreSQL.

## Environment

See `.env.example`.

## Scripts

```bash
npm install
npm run dev     # watch mode with tsx
npm run build   # compile to dist/
npm start       # run dist/index.js (App Service)
```

## Render

The API lives in a monorepo. **Root Directory must be `hr-frontend/hr-api`** — not `src`, not the repo root.

| Setting | Value |
|---------|--------|
| **Root Directory** | `hr-frontend/hr-api` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm start` |
| **Health check path** | `/health` |

If `NODE_ENV=production` is set in Render env vars, plain `npm install` skips devDependencies (`typescript`, `@types/*`). Use `--include=dev` in the build command (see table above).

If Start Command runs from the wrong folder you will see:

```text
ENOENT: no such file or directory, open '/opt/render/project/src/package.json'
```

That means Root Directory is set to `hr-frontend/hr-api/src` (wrong) or build/start paths are mismatched.

**Environment variables** (Render → Environment):

- `NODE_ENV` = `production`
- `AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`
- `CORS_ORIGINS` = `https://lemon-grass-046e94503.7.azurestaticapps.net,http://localhost:5173`
- `DATABASE_AUTH` = `password`
- **Database (pick one approach):**
  - **Recommended on Render** — separate vars (no URL encoding issues):
    - `DATABASE_HOST` = `your-server.postgres.database.azure.com`
    - `DATABASE_PORT` = `5432`
    - `DATABASE_NAME` = `Employeedb`
    - `DATABASE_USER` = admin username (plain text, `@` is fine)
    - `DATABASE_PASSWORD` = admin password (plain text)
  - **Or** `DATABASE_URL` = full `postgresql://...` URL (encode `@` in username/password as `%40`)

`getaddrinfo ENOTFOUND base` means the hostname in `DATABASE_URL` was parsed wrong — usually an unencoded `@` in the Azure username (e.g. `user@domain`) or a truncated connection string.

After deploy, test `https://<your-service>.onrender.com/health` → `{"status":"ok"}`.

See also `render.yaml` at the repo root.

## Azure App Service

- **Runtime:** Node 20 LTS
- **Startup command:** `node dist/index.js`
- **Build during deploy:** `npm install && npm run build`

Ensure PostgreSQL firewall allows the App Service outbound addresses.
