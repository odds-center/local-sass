import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../database/data-source'
import { EmployeeEntity } from '../database/entities/Employee'
import { LeaveBalanceEntity } from '../database/entities/LeaveBalance'
import { LeaveTypeEntity } from '../database/entities/LeaveType'
import { requireRole } from '../middleware/auth'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const employees = await AppDataSource.getRepository(EmployeeEntity).find({
    where: { tenant_id: req.user!.tenant_id },
    order: { name: 'ASC' },
  })
  res.json(employees.map(({ password_hash: _ph, ...e }) => e))
})

router.post('/', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { password, ...data } = req.body as { password?: string; name: string; email: string; role?: string; department?: string; discord_tag?: string }

  if (!password) { res.status(400).json({ error: '비밀번호를 입력하세요.' }); return }
  if (!data.name || !data.email) { res.status(400).json({ error: '이름과 이메일은 필수입니다.' }); return }

  try {
    const password_hash = await bcrypt.hash(password, 10)
    const repo = AppDataSource.getRepository(EmployeeEntity)
    const employee = repo.create({
      id: uuidv4(),
      tenant_id: req.user!.tenant_id,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      department: data.department ?? null,
      role: data.role ?? 'employee',
      discord_tag: data.discord_tag ?? null,
      is_active: 1,
      password_hash,
    })
    await repo.save(employee)

    // 현재 연도 연차 잔액 초기화
    const leaveTypes = await AppDataSource.getRepository(LeaveTypeEntity).find({
      where: { tenant_id: req.user!.tenant_id },
    })
    const year = new Date().getFullYear()
    const balances = leaveTypes.map((lt) =>
      AppDataSource.getRepository(LeaveBalanceEntity).create({
        id: uuidv4(),
        tenant_id: req.user!.tenant_id,
        employee_id: employee.id,
        leave_type_id: lt.id,
        year,
        allocated_days: lt.default_days,
        used_days: 0,
      })
    )
    if (balances.length > 0) {
      await AppDataSource.getRepository(LeaveBalanceEntity).save(balances)
    }

    const { password_hash: _ph, ...safe } = employee
    res.status(201).json(safe)
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(400).json({ error: '이미 사용 중인 이메일입니다.' })
    } else {
      res.status(500).json({ error: msg })
    }
  }
})

router.put('/:id', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { password, ...data } = req.body as { password?: string; [key: string]: unknown }
  const repo = AppDataSource.getRepository(EmployeeEntity)
  const employee = await repo.findOne({ where: { id: String(req.params.id), tenant_id: req.user!.tenant_id } })
  if (!employee) { res.status(404).json({ error: '직원을 찾을 수 없습니다.' }); return }

  Object.assign(employee, data)
  if (password) employee.password_hash = await bcrypt.hash(password, 10)
  await repo.save(employee)

  const { password_hash: _ph, ...safe } = employee
  res.json(safe)
})

// 비활성화
router.delete('/:id/deactivate', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  await AppDataSource.getRepository(EmployeeEntity).update(
    { id: String(req.params.id), tenant_id: req.user!.tenant_id },
    { is_active: 0 }
  )
  res.status(204).send()
})

// 활성화
router.patch('/:id/activate', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  await AppDataSource.getRepository(EmployeeEntity).update(
    { id: String(req.params.id), tenant_id: req.user!.tenant_id },
    { is_active: 1 }
  )
  res.status(204).send()
})

// 완전 삭제
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  await AppDataSource.getRepository(EmployeeEntity).delete({
    id: String(req.params.id),
    tenant_id: req.user!.tenant_id,
  })
  res.status(204).send()
})

export default router
