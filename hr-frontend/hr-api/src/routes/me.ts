import { Router } from 'express'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import { linkAndLoadEmployee } from '../services/employeeContext.js'

export const meRouter = Router()

meRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const auth = req.authUser!
  const result = await linkAndLoadEmployee(auth)
  res.json(result)
})
