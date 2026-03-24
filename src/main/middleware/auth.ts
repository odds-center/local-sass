import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'local-sass-secret-key-change-in-prod'

export interface AuthPayload {
  id: string
  email: string
  role: string
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

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    req.user = payload
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
