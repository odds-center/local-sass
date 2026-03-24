import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../database/db'
import { createEmployee } from '../database/queries/employees'
import { initBalancesForEmployee } from '../database/queries/leave-balances'
import { saveSettings } from '../ipc/settings'
import { JWT_SECRET } from '../middleware/auth'

const router = Router()

// 초기 설정이 필요한지 확인 (인증 불필요)
router.get('/status', (_req: Request, res: Response) => {
  const count = (getDb()
    .prepare('SELECT COUNT(*) as count FROM employees WHERE is_active = 1')
    .get() as { count: number }).count

  res.json({ needsSetup: count === 0 })
})

// 초기 설정 실행 (인증 불필요, 직원이 0명일 때만 허용)
router.post('/init', async (req: Request, res: Response) => {
  const count = (getDb()
    .prepare('SELECT COUNT(*) as count FROM employees')
    .get() as { count: number }).count

  if (count > 0) {
    res.status(403).json({ error: '이미 설정이 완료되었습니다.' })
    return
  }

  const { companyName, name, email, password, discordWebhookUrl } = req.body as {
    companyName: string
    name: string
    email: string
    password: string
    discordWebhookUrl?: string
  }

  if (!name || !email || !password) {
    res.status(400).json({ error: '이름, 이메일, 비밀번호는 필수입니다.' })
    return
  }

  const password_hash = await bcrypt.hash(password, 10)

  // 첫 관리자 직원 생성
  const employee = createEmployee({
    name,
    email: email.toLowerCase().trim(),
    department: null,
    role: 'admin',
    discord_tag: null,
    is_active: 1,
  })

  // 비밀번호 해시 저장
  getDb()
    .prepare('UPDATE employees SET password_hash = ? WHERE id = ?')
    .run(password_hash, employee.id)

  // 현재 연도 잔여 일수 초기화
  initBalancesForEmployee(employee.id, new Date().getFullYear())

  // 설정 저장
  saveSettings({
    app_company_name: companyName ?? '',
    current_user_id: employee.id,
    discord_webhook_url: discordWebhookUrl ?? '',
  })

  // 자동 로그인용 JWT 발급
  const token = jwt.sign(
    { id: employee.id, email: employee.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1y' }
  )

  res.status(201).json({ token, user: { id: employee.id, name, email, role: 'admin' } })
})

export default router
