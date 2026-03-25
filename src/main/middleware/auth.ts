import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'localsass-secret-change-in-prod'

export interface AuthPayload {
  id: string
  email: string
  role: string
  tenant_id: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '인증이 필요합니다.' })
    return
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload
    next()
  } catch {
    res.status(401).json({ error: '토큰이 유효하지 않습니다.' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: '권한이 없습니다.' })
      return
    }
    next()
  }
}
