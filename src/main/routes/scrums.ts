import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../database/data-source'
import { ScrumEntity } from '../database/entities/Scrum'
import { ChannelEntity } from '../database/entities/Channel'
import { sendWebhook } from '../integrations/webhook'
import { ScrumItem } from '../../shared/types'

const router = Router()

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatScrumDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const yy = String(y).slice(2)
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${yy}.${mm}.${dd} (${DAYS[date.getDay()]})`
}

function buildScrumMessage(name: string, date: string, items: ScrumItem[]): string {
  const dateStr = formatScrumDate(date)
  const lines = items.map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`)
  return `**[${dateStr}] ${name}**\n${lines.join('\n')}`
}

const SELECT_WITH_JOIN = `
  SELECT s.*, e.name as employee_name
  FROM scrums s
  JOIN employees e ON e.id = s.employee_id
`

// GET /api/scrums/me?date=YYYY-MM-DD
router.get('/me', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOIN} WHERE s.employee_id = $1 AND s.date = $2 AND s.tenant_id = $3`,
    [req.user!.id, date, req.user!.tenant_id]
  )
  res.json(rows[0] ?? null)
})

// GET /api/scrums/recent
router.get('/recent', async (req: Request, res: Response) => {
  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOIN} WHERE s.employee_id = $1 AND s.tenant_id = $2 ORDER BY s.date DESC LIMIT 10`,
    [req.user!.id, req.user!.tenant_id]
  )
  res.json(rows)
})

// GET /api/scrums/team?date=YYYY-MM-DD
router.get('/team', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOIN} WHERE s.date = $1 AND s.tenant_id = $2 ORDER BY e.name`,
    [date, req.user!.tenant_id]
  )
  res.json(rows)
})

// PUT /api/scrums/me?date=YYYY-MM-DD — upsert
router.put('/me', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const { items } = req.body as { items: ScrumItem[] }
  if (!Array.isArray(items)) { res.status(400).json({ error: 'items 배열이 필요합니다.' }); return }

  const repo = AppDataSource.getRepository(ScrumEntity)
  let scrum = await repo.findOne({ where: { employee_id: req.user!.id, date, tenant_id: req.user!.tenant_id } })

  if (scrum) {
    scrum.items = items
    await repo.save(scrum)
  } else {
    scrum = repo.create({ id: uuidv4(), tenant_id: req.user!.tenant_id, employee_id: req.user!.id, date, items })
    await repo.save(scrum)
  }

  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOIN} WHERE s.employee_id = $1 AND s.date = $2 AND s.tenant_id = $3`,
    [req.user!.id, date, req.user!.tenant_id]
  )
  res.json(rows[0])
})

// POST /api/scrums/me/send?date=YYYY-MM-DD
router.post('/me/send', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const tenantId = req.user!.tenant_id

  const channels = await AppDataSource.getRepository(ChannelEntity).find({
    where: { tenant_id: tenantId, type: 'scrum' },
  })
  if (channels.length === 0 || !channels.some((c) => c.config.webhook_url)) {
    res.status(400).json({ error: '스크럼 채널의 Webhook URL이 설정되지 않았습니다.' })
    return
  }

  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOIN} WHERE s.employee_id = $1 AND s.date = $2 AND s.tenant_id = $3`,
    [req.user!.id, date, tenantId]
  )
  const scrum = rows[0]
  if (!scrum || !scrum.items?.length) {
    res.status(400).json({ error: '전송할 스크럼 항목이 없습니다.' })
    return
  }

  const content = buildScrumMessage(scrum.employee_name ?? req.user!.email, date, scrum.items)

  let sent = false
  for (const ch of channels) {
    if (!ch.config.webhook_url) continue
    try {
      await sendWebhook(ch.config, { text: content })
      sent = true
    } catch (e) {
      console.error('[Scrum] webhook error:', e)
    }
  }

  if (!sent) { res.status(502).json({ error: '웹훅 전송 실패' }); return }

  await AppDataSource.getRepository(ScrumEntity).update(
    { employee_id: req.user!.id, date, tenant_id: tenantId },
    { sent_at: new Date().toISOString() }
  )
  res.json({ ok: true })
})

// POST /api/scrums/send-all?date=YYYY-MM-DD
router.post('/send-all', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const tenantId = req.user!.tenant_id

  const channels = await AppDataSource.getRepository(ChannelEntity).find({
    where: { tenant_id: tenantId, type: 'scrum' },
  })
  if (channels.length === 0 || !channels.some((c) => c.config.webhook_url)) {
    res.status(400).json({ error: '스크럼 채널의 Webhook URL이 설정되지 않았습니다.' })
    return
  }

  const scrums = await AppDataSource.query(
    `${SELECT_WITH_JOIN} WHERE s.date = $1 AND s.tenant_id = $2 ORDER BY e.name`,
    [date, tenantId]
  )
  const active = scrums.filter((s: { items?: ScrumItem[] }) => s.items?.length)
  if (active.length === 0) { res.status(400).json({ error: '전송할 스크럼이 없습니다.' }); return }

  const content = active
    .map((s: { employee_name?: string; employee_id: string; items: ScrumItem[] }) =>
      buildScrumMessage(s.employee_name ?? s.employee_id, date, s.items)
    )
    .join('\n\n')

  for (const ch of channels) {
    if (!ch.config.webhook_url) continue
    await sendWebhook(ch.config, { text: content }).catch(console.error)
  }

  for (const s of active) {
    await AppDataSource.getRepository(ScrumEntity).update(
      { employee_id: (s as ScrumEntity).employee_id, date, tenant_id: tenantId },
      { sent_at: new Date().toISOString() }
    )
  }

  res.json({ ok: true, sent: active.length })
})

export default router
