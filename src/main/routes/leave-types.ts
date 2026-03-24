import { Router, Request, Response } from 'express'
import { listLeaveTypes, createLeaveType, updateLeaveType } from '../database/queries/leave-types'
import { requireRole } from '../middleware/auth'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(listLeaveTypes())
})

router.post('/', requireRole('admin'), (req: Request, res: Response) => {
  res.status(201).json(createLeaveType(req.body))
})

router.put('/:id', requireRole('admin'), (req: Request, res: Response) => {
  res.json(updateLeaveType(String(req.params.id), req.body))
})

export default router
