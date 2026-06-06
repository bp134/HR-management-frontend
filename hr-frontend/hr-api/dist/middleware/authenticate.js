import { validateAccessToken } from '../auth/validateJwt.js';
export async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'unauthorized', message: 'Missing Bearer token' });
        return;
    }
    const token = header.slice(7);
    try {
        req.authUser = await validateAccessToken(token);
        next();
    }
    catch {
        res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
    }
}
