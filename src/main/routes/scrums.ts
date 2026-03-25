import { Router, Request, Response } from 'express'
import { getScrum, upsertScrum, markScrumSent, listScrumsByDate, listMyRecentScrums } from '../database/queries/scrums'
import { getSettings } from '../ipc/settings'
import { ScrumItem } from '../../shared/types'

const router = Router()

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatScrumDate(dateStr: string): string {
  // Parse as local date to avoid timezone shift
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

// GET /api/scrums/me?date=YYYY-MM-DD
router.get('/me', (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const scrum = getScrum(req.user!.id, date)
  res.json(scrum ?? null)
})

// GET /api/scrums/recent — my recent scrums
router.get('/recent', (req: Request, res: Response) => {
  res.json(listMyRecentScrums(req.user!.id))
})

// GET /api/scrums/team?date=YYYY-MM-DD — all scrums for a date
router.get('/team', (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  res.json(listScrumsByDate(date))
})

// PUT /api/scrums/me?date=YYYY-MM-DD — upsert
router.put('/me', (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const { items } = req.body as { items: ScrumItem[] }
  if (!Array.isArray(items)) { res.status(400).json({ error: 'items 배열이 필요합니다.' }); return }
  const scrum = upsertScrum(req.user!.id, date, items)
  res.json(scrum)
})

// POST /api/scrums/me/send?date=YYYY-MM-DD
router.post('/me/send', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const settings = getSettings()

  if (!settings.scrum_webhook_url) {
    res.status(400).json({ error: '스크럼 Webhook URL이 설정되지 않았습니다.' })
    return
  }

  const scrum = getScrum(req.user!.id, date)
  if (!scrum || scrum.items.length === 0) {
    res.status(400).json({ error: '전송할 스크럼 항목이 없습니다.' })
    return
  }

  const content = buildScrumMessage(scrum.employee_name ?? req.user!.email, date, scrum.items)

  const response = await fetch(settings.scrum_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    res.status(502).json({ error: `Discord 전송 실패: ${response.statusText}` })
    return
  }

  markScrumSent(req.user!.id, date)
  res.json({ ok: true })
})

// POST /api/scrums/send-all?date=YYYY-MM-DD — send all team scrums
router.post('/send-all', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const settings = getSettings()

  if (!settings.scrum_webhook_url) {
    res.status(400).json({ error: '스크럼 Webhook URL이 설정되지 않았습니다.' })
    return
  }

  const scrums = listScrumsByDate(date).filter((s) => s.items.length > 0)
  if (scrums.length === 0) {
    res.status(400).json({ error: '전송할 스크럼이 없습니다.' })
    return
  }

  const content = scrums
    .map((s) => buildScrumMessage(s.employee_name ?? s.employee_id, date, s.items))
    .join('\n\n')

  const response = await fetch(settings.scrum_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    res.status(502).json({ error: `Discord 전송 실패: ${response.statusText}` })
    return
  }

  for (const s of scrums) {
    markScrumSent(s.employee_id, date)
  }

  res.json({ ok: true, sent: scrums.length })
})

export default router
