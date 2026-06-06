import { Router } from 'express';
import { linkAndLoadEmployee } from '../services/employeeContext.js';
export const meRouter = Router();
meRouter.get('/', async (req, res) => {
    const auth = req.authUser;
    const result = await linkAndLoadEmployee(auth);
    res.json(result);
});
