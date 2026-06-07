import type { NextFunction, Request, Response } from 'express'
import { validateAccessToken } from '../auth/validateJwt.js'
import { config } from '../config.js'
import type { AuthUser } from '../types.js'

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing Bearer token' })
    return
  }

  const token = header.slice(7)
  try {
    req.authUser = await validateAccessToken(token)
    next()
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Invalid or expired token'
    if (config.nodeEnv === 'development') {
      console.error('JWT validation failed:', detail)
    }
    res.status(401).json({
      error: 'unauthorized',
      message: config.nodeEnv === 'development' ? detail : 'Invalid or expired token',
    })
  }
}
