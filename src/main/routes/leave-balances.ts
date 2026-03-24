import { Router, Request, Response } from 'express'
import {
  listLeaveBalancesByYear,
  getLeaveBalancesByEmployee,
  adjustLeaveBalance,
} from '../database/queries/leave-balances'
import { requireRole } from '../middleware/auth'

const router = Router()

router.get('/:year', (req: Request, res: Response) => {
  res.json(listLeaveBalancesByYear(Number(String(req.params.year))))
})

router.get('/employee/:employeeId/:year', (req: Request, res: Response) => {
  res.json(getLeaveBalancesByEmployee(String(req.params.employeeId), Number(String(req.params.year))))
})

router.put('/:id', requireRole('admin', 'manager'), (req: Request, res: Response) => {
  const { allocated_days } = req.body as { allocated_days: number }
  res.json(adjustLeaveBalance(String(req.params.id), allocated_days))
})

export default router
