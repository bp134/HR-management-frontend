import 'dotenv/config';
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
export const config = {
    port: parseInt(process.env.PORT ?? '3001', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    azureTenantId: required('AZURE_TENANT_ID'),
    azureApiClientId: required('AZURE_API_CLIENT_ID'),
    databaseUrl: required('DATABASE_URL'),
};
export const azureIssuer = `https://login.microsoftonline.com/${config.azureTenantId}/v2.0`;
export const azureJwksUrl = new URL(`https://login.microsoftonline.com/${config.azureTenantId}/discovery/v2.0/keys`);
