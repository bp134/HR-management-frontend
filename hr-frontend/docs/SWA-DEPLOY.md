# Azure Static Web Apps — frontend deploy

Deploy only the React SPA. The Express API (`hr-api`) is hosted separately (Render, then Azure App Service later).

## Current status

| Step | Status |
|------|--------|
| Build (`npm run build`) | Works in CI |
| App path | `hr-frontend/hr-frontend/dist` |
| Deploy to SWA | Needs valid **`AZURE_STATIC_WEB_APPS_API_TOKEN`** |

## About `swa-db-connections` in the logs

You may see:

```text
Try to validate location at: '/github/workspace/swa-db-connections'.
```

**This is normal.** The Azure deploy tool always checks for that folder. It is used only if you enable **Database connections** on your Static Web App in Azure. You do not need it in your GitHub repo, and **it is not the cause of the token error**.

---

## Fix: invalid deployment token

Error: `No matching Static Web App was found or the api key was invalid`

The build is fine. The deploy step cannot authenticate to your Static Web App.

### Step-by-step (do in this order)

**1. Reset the token in Azure** (important — old tokens stop working)

1. [Azure Portal](https://portal.azure.com) → Static Web App **ashy-dune-047ac8c03**
2. **Overview** → **Manage deployment token**
3. Click **Reset token**, then **Copy** the new value immediately

**2. Create ONE GitHub secret with the simple name**

1. GitHub → `bp134/HR-management-frontend` → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** (or update if it exists):
   - **Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN` *(exactly this — no long suffix)*
   - **Value:** paste the token from step 1 — no spaces, no quotes
3. Save

**3. Remove confusion from old secrets (optional)**

If you have older secrets like `AZURE_STATIC_WEB_APPS_API_TOKEN_ASHY_DUNE_047AC8C03`, the workflow no longer uses them. You can delete them to avoid updating the wrong one.

**4. Check deployment authorization in Azure**

Azure Portal → Static Web App → **Configuration** (or **Deployment** settings):

- **Deployment authorization policy** should allow **Deployment token** (not GitHub-only if you paste the token manually).

**5. Re-run the workflow**

**Actions** → **Azure Static Web Apps CI/CD** → **Run workflow** → branch `New-HR-frontend`

The workflow now deploys with **SWA CLI** (`swa deploy`) instead of the Docker-based GitHub action, which avoids some "event info" / token sync problems.

---

## If it still fails — checklist

| Check | What to do |
|-------|------------|
| **Correct Static Web App** | Token copied from **ashy-dune-047ac8c03** (URL ends in `.7.azurestaticapps.net`) |
| **Repository secret** | Under **bp134/HR-management-frontend** → Settings → Secrets, not only org-level |
| **Secret name** | Must be `AZURE_STATIC_WEB_APPS_API_TOKEN` |
| **Fresh token** | Reset in Azure, copy once, paste into GitHub immediately |
| **Azure deployment link** | Azure → SWA → Deployment → repo = `bp134/HR-management-frontend` |
| **No fork** | Deploying from the same repo Azure is connected to |
| **Same Azure subscription** | Token copied from the SWA that owns `ashy-dune-047ac8c03.7.azurestaticapps.net` |

### Test the token locally (optional, Windows)

From your PC, after `npm run build` in `hr-frontend/hr-frontend`:

```powershell
cd c:\New-HR-frontend\hr-frontend\hr-frontend
$env:SWA_CLI_DEPLOYMENT_TOKEN = "paste-token-here"
npx @azure/static-web-apps-cli deploy dist --env production --verbose silly
```

**Do not pipe to `Select-Object -Last 30`** — that hides the real error line.

#### If you see `StaticSitesClient.exe` exit code 1

This is common on Windows. The CLI downloads `StaticSitesClient.exe` first (normal). Exit code 1 is a wrapper — scroll up in the **full** output for the real reason, usually one of:

| Hidden message | Fix |
|----------------|-----|
| `api key was invalid` | Reset token in Azure, update `AZURE_STATIC_WEB_APPS_API_TOKEN` |
| `maximum number of staging environments (3)` | Azure Portal → SWA → **Environments** → delete old preview envs |
| `Failed to validate staticwebapp.config.json` | Fix `public/staticwebapp.config.json` |

**Prefer GitHub Actions for deploy** — it runs on Linux and is more reliable than local Windows CLI.

If local CLI fails but you need to confirm the token, check **Azure Portal → Static Web App → Environments** after a GitHub Actions run.

### Check what secrets GitHub actually has

On the **Actions secrets** page, look for any name starting with `AZURE_STATIC_WEB_APPS`. If Azure auto-created one with a long suffix (e.g. `..._ASHY_DUNE_047AC8C03_7`), that name reflects the app hostname — but our workflow uses the short name `AZURE_STATIC_WEB_APPS_API_TOKEN` only.

---

## Other GitHub secrets (for the Vite build)

| Secret | Purpose |
|--------|---------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | **Required** — SWA deploy token |
| `VITE_AZURE_CLIENT_ID` | Entra SPA client ID |
| `VITE_AZURE_TENANT_ID` | Entra tenant ID |
| `VITE_AZURE_API_SCOPE` | e.g. `api://<api-id>/access_as_user` |
| `VITE_API_BASE_URL` | API URL (Render later; not the SWA URL) |

---

## After a successful deploy

1. Open `https://ashy-dune-047ac8c03.7.azurestaticapps.net` — HR login page
2. Entra → HR SPA → add that URL as a redirect URI
3. When API is on Render, update `VITE_API_BASE_URL` and re-run the workflow

## Local build test

```bash
cd hr-frontend/hr-frontend
npm ci
npm run build
```
