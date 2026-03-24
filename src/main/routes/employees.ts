import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  activateEmployee,
  deleteEmployee,
} from '../database/queries/employees'
import { initBalancesForEmployee } from '../database/queries/leave-balances'
import { requireRole } from '../middleware/auth'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(listEmployees())
})

router.post('/', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { password, ...data } = req.body as { password?: string; [key: string]: unknown }

  if (!password) {
    res.status(400).json({ error: '비밀번호를 입력하세요.' })
    return
  }

  const password_hash = await bcrypt.hash(password, 10)
  const employee = createEmployee({ ...data, is_active: 1 } as Parameters<typeof createEmployee>[0])

  // Save password hash
  const { getDb } = await import('../database/db')
  getDb().prepare('UPDATE employees SET password_hash = ? WHERE id = ?').run(password_hash, employee.id)

  initBalancesForEmployee(employee.id, new Date().getFullYear())
  res.status(201).json(employee)
})

router.put('/:id', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { password, ...data } = req.body as { password?: string; [key: string]: unknown }

  const employee = updateEmployee(String(req.params.id), data as Parameters<typeof updateEmployee>[1])

  if (password) {
    const password_hash = await bcrypt.hash(password, 10)
    const { getDb } = await import('../database/db')
    getDb().prepare('UPDATE employees SET password_hash = ? WHERE id = ?').run(password_hash, employee.id)
  }

  res.json(employee)
})

// 비활성화
router.delete('/:id/deactivate', requireRole('admin', 'manager'), (req: Request, res: Response) => {
  try {
    deactivateEmployee(String(req.params.id))
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 활성화
router.patch('/:id/activate', requireRole('admin', 'manager'), (req: Request, res: Response) => {
  try {
    activateEmployee(String(req.params.id))
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 완전 삭제 (관련 데이터 포함)
router.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  try {
    deleteEmployee(String(req.params.id))
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
