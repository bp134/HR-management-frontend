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

## Azure App Service

- **Runtime:** Node 20 LTS
- **Startup command:** `node dist/index.js`
- **Build during deploy:** `npm install && npm run build`

Ensure PostgreSQL firewall allows the App Service outbound addresses.
