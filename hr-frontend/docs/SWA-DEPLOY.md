# Azure Static Web Apps — frontend deploy

Deploy only the React SPA. The Express API (`hr-api`) is hosted separately (Render, then Azure App Service later).

## Current status

| Step | Status |
|------|--------|
| Build (`npm run build`) | Works in CI |
| App path | `hr-frontend/hr-frontend` → `dist/` |
| Deploy to SWA | **Blocked until deployment token is valid** |

## Fix the deployment token (required for green deploy)

Error: `No matching Static Web App was found or the api key was invalid`

### Option A — Reconnect GitHub in Azure (recommended)

1. [Azure Portal](https://portal.azure.com) → Static Web App **ashy-dune-047ac8c03**
2. **Settings** → **Deployment**
3. **Disconnect** GitHub, then **Connect** again:
   - Repository: `bp134/HR-management-frontend`
   - Branch: `New-HR-frontend`
   - Build: **Custom**
   - App location: `hr-frontend/hr-frontend`
   - Output: `dist`
   - API location: *(empty)*
4. Azure updates the GitHub secret automatically.

### Option B — Update the secret manually

1. Azure Portal → Static Web App → **Manage deployment token**
2. Copy the token
3. GitHub → `bp134/HR-management-frontend` → **Settings** → **Secrets and variables** → **Actions**
4. Update secret **`AZURE_STATIC_WEB_APPS_API_TOKEN_ASHY_DUNE_047AC8C03`**
5. **Actions** → **Azure Static Web Apps CI/CD** → **Run workflow** (or re-run failed job)

## GitHub secrets (Actions)

| Secret | Purpose |
|--------|---------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_ASHY_DUNE_047AC8C03` | SWA deploy token (from Azure) |
| `VITE_AZURE_CLIENT_ID` | Entra SPA client ID |
| `VITE_AZURE_TENANT_ID` | Entra tenant ID |
| `VITE_AZURE_API_SCOPE` | e.g. `api://<api-id>/access_as_user` |
| `VITE_API_BASE_URL` | API URL (Render or App Service; not the SWA URL) |

Until the API is on Render, you can set `VITE_API_BASE_URL` to a placeholder — the site will deploy but login/API calls will not work until the real API URL is set and you redeploy.

## After a successful deploy

1. Open `https://ashy-dune-047ac8c03.7.azurestaticapps.net` — HR login page (not Azure placeholder)
2. Entra → HR SPA → add that URL under **Authentication** → redirect URIs
3. When API is live, set `VITE_API_BASE_URL` and re-run the workflow

## Local build test

```bash
cd hr-frontend/hr-frontend
npm ci
npm run build
```
