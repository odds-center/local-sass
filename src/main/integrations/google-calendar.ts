import { google } from 'googleapis'
import { createServer } from 'http'
import { shell } from 'electron'
import { AppDataSource } from '../database/data-source'
import { TenantEntity } from '../database/entities/Tenant'

async function getTenant(tenantId: string): Promise<TenantEntity | null> {
  return AppDataSource.getRepository(TenantEntity).findOneBy({ id: tenantId })
}

async function saveTenantField(tenantId: string, field: Partial<TenantEntity>): Promise<void> {
  await AppDataSource.getRepository(TenantEntity).update({ id: tenantId }, field)
}

function makeOAuth2Client(clientId: string, clientSecret: string, refreshToken?: string) {
  const client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:19823')
  if (refreshToken) client.setCredentials({ refresh_token: refreshToken })
  return client
}

export async function startGoogleOAuth(tenantId: string): Promise<void> {
  const tenant = await getTenant(tenantId)
  if (!tenant?.google_client_id || !tenant?.google_client_secret) {
    throw new Error('Google Client ID와 Secret을 먼저 설정하세요.')
  }

  const oauth2Client = makeOAuth2Client(tenant.google_client_id, tenant.google_client_secret)
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  })

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, 'http://localhost:19823')
        const code = url.searchParams.get('code')
        if (!code) return
        const { tokens } = await oauth2Client.getToken(code)
        await saveTenantField(tenantId, { google_refresh_token: tokens.refresh_token ?? '' })
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h2>✅ Google 연결 완료! 이 탭을 닫으셔도 됩니다.</h2>')
        server.close()
        resolve()
      } catch (e) {
        res.writeHead(500); res.end('오류 발생'); server.close(); reject(e)
      }
    })
    server.listen(19823, () => shell.openExternal(authUrl))
    server.on('error', reject)
    setTimeout(() => { server.close(); reject(new Error('OAuth 타임아웃 (5분)')) }, 5 * 60 * 1000)
  })
}

export async function listGoogleCalendars(tenantId: string): Promise<{ id: string; summary: string }[]> {
  const tenant = await getTenant(tenantId)
  if (!tenant?.google_refresh_token) return []
  const auth = makeOAuth2Client(tenant.google_client_id, tenant.google_client_secret, tenant.google_refresh_token)
  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.calendarList.list()
  return (res.data.items ?? []).map((item) => ({ id: item.id ?? '', summary: item.summary ?? '' }))
}

export async function createCalendarEvent(params: {
  tenantId: string
  calendarId: string
  summary: string
  start: string
  end: string
  description: string
}): Promise<string | undefined> {
  if (!params.calendarId) return undefined
  const tenant = await getTenant(params.tenantId)
  if (!tenant?.google_refresh_token) return undefined
  const auth = makeOAuth2Client(tenant.google_client_id, tenant.google_client_secret, tenant.google_refresh_token)
  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.events.insert({
    calendarId: params.calendarId,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { date: params.start },
      end: { date: params.end },
    },
  })
  return res.data.id ?? undefined
}

export async function deleteCalendarEvent(tenantId: string, calendarId: string, eventId: string): Promise<void> {
  if (!calendarId || !eventId) return
  const tenant = await getTenant(tenantId)
  if (!tenant?.google_refresh_token) return
  const auth = makeOAuth2Client(tenant.google_client_id, tenant.google_client_secret, tenant.google_refresh_token)
  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.delete({ calendarId, eventId })
}
