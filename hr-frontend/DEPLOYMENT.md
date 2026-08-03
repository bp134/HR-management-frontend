# Deployment configuration

This repository is standardized on one frontend Static Web App and one Render API.

## Canonical hosts

| Component | Host |
| --- | --- |
| Frontend | `https://lemon-grass-046e94503.7.azurestaticapps.net` |
| API | `https://hr-management-frontend-gz9u.onrender.com` |

## GitHub Actions

The frontend deploy workflow is:

```text
.github/workflows/azure-static-web-apps-lemon-grass-046e94503.yml
```

Required GitHub secrets:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GRASS_046E94503
VITE_AZURE_CLIENT_ID
VITE_AZURE_TENANT_ID
VITE_AZURE_API_SCOPE
```

`VITE_API_BASE_URL` is intentionally not a GitHub secret. It is public browser configuration and is set in `hr-frontend/.env.production`.

## Microsoft Entra

SPA app registration:

- Redirect URI: `https://lemon-grass-046e94503.7.azurestaticapps.net`
- Local redirect URI: `http://localhost:5173`
- API permission: HR API `access_as_user`

API app registration:

- Expose API scope: `api://<api-client-id>/access_as_user`
- Render `AZURE_API_CLIENT_ID` must match this API app client ID.
- Frontend `VITE_AZURE_API_SCOPE` must use this API app scope.

## Render API

Render service:

- Root directory: `hr-frontend/hr-api`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/health`

Required Render environment variables:

```text
NODE_ENV=production
DATABASE_AUTH=password
DATABASE_URL=<postgres connection string>
AZURE_TENANT_ID=<tenant id>
AZURE_API_CLIENT_ID=<HR API app client id>
CORS_ORIGINS=https://lemon-grass-046e94503.7.azurestaticapps.net
```

## Smoke checks

After deploy:

```bash
curl https://hr-management-frontend-gz9u.onrender.com/health
curl https://hr-management-frontend-gz9u.onrender.com/api/health
```

Then open the frontend and sign in:

```text
https://lemon-grass-046e94503.7.azurestaticapps.net
```
