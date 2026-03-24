import { Router, Request, Response } from 'express'
import os from 'os'
import { getSettings, saveSettings } from '../ipc/settings'
import { testDiscordWebhook } from '../integrations/discord'
import { startGoogleOAuth, listGoogleCalendars } from '../integrations/google-calendar'
import { requireRole } from '../middleware/auth'

const router = Router()

// Get local network IPs (for host IP display)
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces()
  const ips: string[] = []
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address)
      }
    }
  }
  return ips
}

router.get('/', requireRole('admin'), (_req: Request, res: Response) => {
  const settings = getSettings()
  // Never expose secrets to non-admin, mask tokens
  res.json({
    ...settings,
    google_client_secret: settings.google_client_secret ? '••••••••' : '',
    google_refresh_token: settings.google_refresh_token ? '연결됨' : '',
    host_ips: getLocalIPs(),
  })
})

router.put('/', requireRole('admin'), (req: Request, res: Response) => {
  // Don't overwrite masked values
  const data = { ...req.body } as Record<string, string>
  if (data.google_client_secret === '••••••••') delete data.google_client_secret
  if (data.google_refresh_token === '연결됨') delete data.google_refresh_token
  saveSettings(data)
  res.json({ ok: true })
})

router.post('/test-discord', requireRole('admin'), async (_req: Request, res: Response) => {
  const settings = getSettings()
  if (!settings.discord_webhook_url) {
    res.json({ ok: false, error: 'Webhook URL이 설정되지 않았습니다.' })
    return
  }
  try {
    await testDiscordWebhook(settings.discord_webhook_url)
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false, error: String(e) })
  }
})

router.post('/connect-google', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    await startGoogleOAuth()
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false, error: String(e) })
  }
})

router.get('/calendars', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    res.json(await listGoogleCalendars())
  } catch {
    res.json([])
  }
})

export default router
