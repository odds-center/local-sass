import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { AppDataSource } from '../database/data-source'
import { EmployeeEntity } from '../database/entities/Employee'
import { JWT_SECRET, requireAuth } from '../middleware/auth'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 20,
  message: { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' })
    return
  }

  const repo = AppDataSource.getRepository(EmployeeEntity)
  const employee = await repo.findOne({
    where: { email: email.toLowerCase().trim(), is_active: 1 },
  })

  if (!employee || !employee.password_hash) {
    res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다.' })
    return
  }

  const valid = await bcrypt.compare(password, employee.password_hash)
  if (!valid) {
    res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다.' })
    return
  }

  const token = jwt.sign(
    { id: employee.id, email: employee.email, role: employee.role, tenant_id: employee.tenant_id },
    JWT_SECRET,
    { expiresIn: '1y' }
  )

  res.json({
    token,
    user: { id: employee.id, name: employee.name, email: employee.email, role: employee.role, department: employee.department },
  })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(EmployeeEntity)
  const employee = await repo.findOne({ where: { id: req.user!.id, tenant_id: req.user!.tenant_id } })

  if (!employee) { res.status(404).json({ error: '사용자를 찾을 수 없습니다.' }); return }

  res.json({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    department: employee.department,
    discord_tag: employee.discord_tag,
  })
})

export default router
