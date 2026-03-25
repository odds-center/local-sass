import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../database/data-source'
import { ChannelEntity, ChannelConfig, ChannelType } from '../database/entities/Channel'
import { testWebhook } from '../integrations/webhook'
import { requireRole } from '../middleware/auth'

const router = Router()

// GET /api/channels
router.get('/', async (req: Request, res: Response) => {
  const channels = await AppDataSource.getRepository(ChannelEntity).find({
    where: { tenant_id: req.user!.tenant_id },
    order: { created_at: 'ASC' },
  })
  res.json(channels)
})

// POST /api/channels
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const { name, type, config } = req.body as { name: string; type: ChannelType; config?: ChannelConfig }
  if (!name || !type) { res.status(400).json({ error: '이름과 타입은 필수입니다.' }); return }

  const repo = AppDataSource.getRepository(ChannelEntity)
  const channel = repo.create({
    id: uuidv4(),
    tenant_id: req.user!.tenant_id,
    name,
    type,
    config: config ?? {},
  })
  await repo.save(channel)
  res.status(201).json(channel)
})

// PUT /api/channels/:id
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(ChannelEntity)
  const channel = await repo.findOne({ where: { id: String(req.params.id), tenant_id: req.user!.tenant_id } })
  if (!channel) { res.status(404).json({ error: '채널을 찾을 수 없습니다.' }); return }

  const { name, config } = req.body as { name?: string; config?: ChannelConfig }
  if (name) channel.name = name
  if (config !== undefined) channel.config = config
  await repo.save(channel)
  res.json(channel)
})

// DELETE /api/channels/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  await AppDataSource.getRepository(ChannelEntity).delete({
    id: String(req.params.id),
    tenant_id: req.user!.tenant_id,
  })
  res.status(204).send()
})

// POST /api/channels/:id/test-webhook
router.post('/:id/test-webhook', requireRole('admin'), async (req: Request, res: Response) => {
  const channel = await AppDataSource.getRepository(ChannelEntity).findOne({
    where: { id: String(req.params.id), tenant_id: req.user!.tenant_id },
  })
  if (!channel) { res.status(404).json({ error: '채널을 찾을 수 없습니다.' }); return }
  if (!channel.config.webhook_url) { res.json({ ok: false, error: 'Webhook URL이 설정되지 않았습니다.' }); return }

  try {
    await testWebhook(channel.config)
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false, error: String(e) })
  }
})

export default router
