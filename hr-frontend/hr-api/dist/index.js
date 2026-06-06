import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { pool } from './db.js';
import { authenticate } from './middleware/authenticate.js';
import { dashboardRouter } from './routes/dashboard.js';
import { employeesRouter } from './routes/employees.js';
import { leaveRouter } from './routes/leave.js';
import { meRouter } from './routes/me.js';
const app = express();
app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
}));
app.use(express.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
const api = express.Router();
api.use(authenticate);
api.use('/me', meRouter);
api.use('/employees', employeesRouter);
api.use('/leave-requests', leaveRouter);
api.use('/dashboard', dashboardRouter);
app.use('/api', api);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'internal_error', message: 'An unexpected error occurred' });
});
async function start() {
    try {
        await pool.query('SELECT 1');
        console.log('Database connection OK');
    }
    catch (err) {
        console.warn('Database connection failed at startup (API will retry on requests):', err);
    }
    app.listen(config.port, () => {
        console.log(`HR API listening on port ${config.port}`);
    });
}
start();
