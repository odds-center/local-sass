import { Router, Request, Response } from 'express'
import os from 'os'
import { AppDataSource } from '../database/data-source'
import { TenantEntity } from '../database/entities/Tenant'
import { testDiscordWebhook } from '../integrations/discord'
import { startGoogleOAuth, listGoogleCalendars } from '../integrations/google-calendar'
import { requireRole } from '../middleware/auth'

const router = Router()

function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces()
  const ips: string[] = []
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address)
    }
  }
  return ips
}

router.get('/', requireRole('admin'), async (req: Request, res: Response) => {
  const tenant = await AppDataSource.getRepository(TenantEntity).findOneBy({ id: req.user!.tenant_id })
  if (!tenant) { res.status(404).json({ error: '설정을 찾을 수 없습니다.' }); return }
  res.json({
    app_company_name: tenant.app_company_name,
    google_client_id: tenant.google_client_id,
    google_client_secret: tenant.google_client_secret ? '••••••••' : '',
    google_refresh_token: tenant.google_refresh_token ? '연결됨' : '',
    google_calendar_id: tenant.google_calendar_id,
    host_ips: getLocalIPs(),
  })
})

router.put('/', requireRole('admin'), async (req: Request, res: Response) => {
  const data = { ...req.body } as Record<string, string>
  // Don't overwrite masked values
  if (data.google_client_secret === '••••••••') delete data.google_client_secret
  if (data.google_refresh_token === '연결됨') delete data.google_refresh_token

  const allowed = ['app_company_name', 'google_client_id', 'google_client_secret', 'google_calendar_id']
  const update: Partial<TenantEntity> = {}
  for (const key of allowed) {
    if (key in data) (update as Record<string, string>)[key] = data[key]
  }

  await AppDataSource.getRepository(TenantEntity).update({ id: req.user!.tenant_id }, update)
  res.json({ ok: true })
})

router.post('/test-discord', requireRole('admin'), async (req: Request, res: Response) => {
  const { webhook_url } = req.body as { webhook_url?: string }
  if (!webhook_url) { res.json({ ok: false, error: 'Webhook URL을 입력하세요.' }); return }
  try {
    await testDiscordWebhook(webhook_url)
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false, error: String(e) })
  }
})

router.post('/connect-google', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await startGoogleOAuth(req.user!.tenant_id)
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false, error: String(e) })
  }
})

router.get('/calendars', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    res.json(await listGoogleCalendars(req.user!.tenant_id))
  } catch {
    res.json([])
  }
})

export default router
