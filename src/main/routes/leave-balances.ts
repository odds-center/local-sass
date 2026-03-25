import { Router, Request, Response } from 'express'
import { AppDataSource } from '../database/data-source'
import { LeaveBalanceEntity } from '../database/entities/LeaveBalance'
import { requireRole } from '../middleware/auth'

const router = Router()

const SELECT_WITH_JOINS = `
  SELECT lb.*,
    e.name as employee_name,
    lt.name as leave_type_name, lt.color as leave_type_color
  FROM leave_balances lb
  JOIN employees e ON e.id = lb.employee_id
  JOIN leave_types lt ON lt.id = lb.leave_type_id
`

router.get('/:year', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const year = Number(req.params.year)
  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lb.tenant_id = $1 AND lb.year = $2 AND lt.name = '연차' ORDER BY e.name`,
    [tenantId, year]
  )
  res.json(rows)
})

router.get('/employee/:employeeId/:year', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lb.tenant_id = $1 AND lb.employee_id = $2 AND lb.year = $3 ORDER BY lt.name`,
    [tenantId, req.params.employeeId, Number(req.params.year)]
  )
  res.json(rows)
})

router.put('/:id', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { allocated_days } = req.body as { allocated_days: number }
  await AppDataSource.getRepository(LeaveBalanceEntity).update(
    { id: String(req.params.id), tenant_id: req.user!.tenant_id },
    { allocated_days }
  )
  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lb.id = $1 AND lb.tenant_id = $2`,
    [req.params.id, req.user!.tenant_id]
  )
  res.json(rows[0])
})

export default router
