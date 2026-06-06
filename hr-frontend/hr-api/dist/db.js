import pg from 'pg';
import { config } from './config.js';
const { Pool } = pg;
let connectionString = config.databaseUrl;
if (!connectionString.includes('sslmode=')) {
    const sep = connectionString.includes('?') ? '&' : '?';
    connectionString += `${sep}sslmode=require`;
}
export const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
});
export async function query(text, params) {
    return pool.query(text, params);
}
