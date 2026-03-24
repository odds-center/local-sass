import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../database/db'
import { Employee } from '../../shared/types'
import { JWT_SECRET, requireAuth } from '../middleware/auth'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' })
    return
  }

  const employee = getDb()
    .prepare('SELECT * FROM employees WHERE email = ? AND is_active = 1')
    .get(email.toLowerCase().trim()) as (Employee & { password_hash?: string }) | undefined

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
    { id: employee.id, email: employee.email, role: employee.role },
    JWT_SECRET,
    { expiresIn: '1y' }
  )

  res.json({
    token,
    user: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
    },
  })
})

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const employee = getDb()
    .prepare('SELECT id, name, email, role, department, discord_tag FROM employees WHERE id = ?')
    .get(req.user!.id) as Omit<Employee, 'password_hash' | 'is_active' | 'created_at'> | undefined

  if (!employee) {
    res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
    return
  }

  res.json(employee)
})

export default router
