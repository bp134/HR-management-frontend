# Azure Static Web Apps — frontend deploy

Deploy only the React SPA. The Express API (`hr-api`) is hosted separately on Render.

## Current Static Web App

| Field | Value |
|-------|--------|
| **Azure resource name** | `HR-API-STATICWEBAPP` |
| **Resource group** | `postgresql-db` |
| **URL** | `https://lemon-grass-046e94503.7.azurestaticapps.net` |
| **GitHub branch** | `New-HR-frontend` |
| **Workflow file** | `.github/workflows/azure-static-web-apps-lemon-grass-046e94503.yml` |
| **Deploy secret** | `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GRASS_046E94503` *(auto-created when you linked GitHub)* |

The lemon-grass Static Web App is the canonical frontend. Do not use any older Static Web App hostnames for frontend or API configuration.

---

## What Azure did when you linked GitHub

1. Created GitHub secret **`AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GRASS_046E94503`** with the correct deploy token.
2. Added workflow file **`azure-static-web-apps-lemon-grass-046e94503.yml`**.
3. Set the deployment branch to **`New-HR-frontend`**.

The auto-generated workflow used wrong build paths (`./hr-frontend` → `build`). The workflow in this repo is fixed to build **`hr-frontend/hr-frontend`** and deploy **`dist`**.

---

## Next steps (in order)

### 1. Confirm GitHub secrets

GitHub → `bp134/HR-management-frontend` → **Settings** → **Secrets and variables** → **Actions**

| Secret | Required | Notes |
|--------|----------|--------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GRASS_046E94503` | Yes | Auto-created by Azure — do not delete |
| `VITE_AZURE_CLIENT_ID` | Yes | Entra SPA client ID |
| `VITE_AZURE_TENANT_ID` | Yes | Entra tenant ID |
| `VITE_AZURE_API_SCOPE` | Yes | **Value only:** `api://e005eb5b-.../access_as_user` — do **not** paste `VITE_AZURE_API_SCOPE=` in the secret |

`VITE_API_BASE_URL` is intentionally not a GitHub secret. It is public browser configuration and is set in `hr-frontend/hr-frontend/.env.production`.

### 2. Push the fixed workflow (or re-run after push)

After the corrected workflow is on `New-HR-frontend`, run:

**Actions** → **Deploy lemon-grass Static Web App** → **Run workflow** → branch `New-HR-frontend`

### 3. Add Entra redirect URI

Microsoft Entra → App registrations → your **HR SPA** (`227a3f64-...`) → **Authentication** → add:

```
https://lemon-grass-046e94503.7.azurestaticapps.net
```

Also add the same URL under **Single-page application** redirect URIs if not already present.

### 4. Verify the site

Open `https://lemon-grass-046e94503.7.azurestaticapps.net` — you should see the HR login page.

### 5. Verify frontend API target

The frontend production build reads the Render API URL from `hr-frontend/hr-frontend/.env.production`:

```text
VITE_API_BASE_URL=https://hr-management-frontend-gz9u.onrender.com
```

Do not set `VITE_API_BASE_URL` to a Static Web App URL in GitHub secrets or workflow env.

---

## About `swa-db-connections` in the logs

You may see:

```text
Try to validate location at: '/github/workspace/swa-db-connections'.
```

**This is normal.** The deploy tool always checks for that folder. It is only used if you enable **Database connections** on the Static Web App. It is **not** in your repo and is **not** an error.

`Could not get event info. Proceeding` is also **harmless** when deploying with a token.

---

## If deploy fails: invalid token

Error: `No matching Static Web App was found or the api key was invalid`

The workflow must use the secret for **this** Static Web App:

`AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GRASS_046E94503`

**Not** the old `AZURE_STATIC_WEB_APPS_API_TOKEN` from the previous SWA.

### Reset token (if needed)

```powershell
az staticwebapp secrets reset-api-key `
  --name HR-API-STATICWEBAPP `
  --resource-group postgresql-db `
  --query properties.apiKey -o tsv
```

Copy the output and update **`AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GRASS_046E94503`** in GitHub (not the short-named secret).

Or: Azure Portal → **HR-API-STATICWEBAPP** → **Overview** → **Manage deployment token** → **Reset** → copy into GitHub.

### Checklist

| Check | What to do |
|-------|------------|
| **Correct SWA** | Token from the lemon-grass Static Web App resource |
| **Correct secret name** | `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GRASS_046E94503` |
| **Old workflow removed** | Keep only the lemon-grass workflow file |
| **Deployment authorization** | Azure → SWA → Configuration → **Deployment token** enabled |
| **Preview env limit** | Free tier: delete unused preview envs under **Environments** |

---

## Local build test

```bash
cd hr-frontend/hr-frontend
npm ci
npm run build
```

## Optional: test deploy token locally (Windows)

```powershell
cd c:\New-HR-frontend\hr-frontend\hr-frontend
npm run build
$env:SWA_CLI_DEPLOYMENT_TOKEN = "paste-token-from-azure"
npx @azure/static-web-apps-cli deploy dist --env production --verbose silly
```

Prefer **GitHub Actions** for deploy — it runs on Linux and is more reliable than local Windows CLI.
