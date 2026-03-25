import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../database/data-source'
import { LeaveTypeEntity } from '../database/entities/LeaveType'
import { requireRole } from '../middleware/auth'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const types = await AppDataSource.getRepository(LeaveTypeEntity).find({
    where: { tenant_id: req.user!.tenant_id },
    order: { name: 'ASC' },
  })
  res.json(types)
})

router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const data = req.body as { name: string; default_days?: number; carry_over_max?: number; color?: string }
  const repo = AppDataSource.getRepository(LeaveTypeEntity)
  const lt = repo.create({
    id: uuidv4(),
    tenant_id: req.user!.tenant_id,
    name: data.name,
    default_days: data.default_days ?? 15,
    carry_over_max: data.carry_over_max ?? 0,
    color: data.color ?? '#8b5cf6',
  })
  await repo.save(lt)
  res.status(201).json(lt)
})

router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(LeaveTypeEntity)
  const lt = await repo.findOne({ where: { id: String(req.params.id), tenant_id: req.user!.tenant_id } })
  if (!lt) { res.status(404).json({ error: '휴가 종류를 찾을 수 없습니다.' }); return }
  Object.assign(lt, req.body)
  await repo.save(lt)
  res.json(lt)
})

export default router
