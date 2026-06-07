/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_CLIENT_ID: 227a3f64-fd99-41cf-a5a4-859e892a3cc4
  readonly VITE_AZURE_TENANT_ID: be524202-3d24-49b4-ad01-17fffd89b958
  readonly VITE_AZURE_API_SCOPE: api://e005eb5b-ab79-4dac-acbf-219b961fc75f/access_as_user
  readonly VITE_API_BASE_URL: http://localhost:5173
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
