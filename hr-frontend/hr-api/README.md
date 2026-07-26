# HR API

Express API for Render. Validates Microsoft Entra JWTs and reads/writes PostgreSQL.

## Environment

See `.env.example`.

## Scripts

```bash
npm install
npm run dev     # watch mode with tsx
npm run build   # compile to dist/
npm start       # run dist/index.js
```

## Render

- **Root directory:** `hr-frontend/hr-api`
- **Runtime:** Node 22
- **Build command:** `npm ci && npm run build`
- **Startup command:** `node dist/index.js`
- **Health check path:** `/health`

Required environment variables:

```text
NODE_ENV=production
DATABASE_AUTH=password
DATABASE_URL=postgresql://...
AZURE_TENANT_ID=...
AZURE_API_CLIENT_ID=...
CORS_ORIGINS=https://lemon-grass-046e94503.7.azurestaticapps.net
```

If your PostgreSQL firewall restricts inbound traffic, allow Render outbound connectivity or use the database provider's recommended Render integration.
