import { google } from 'googleapis'
import { createServer } from 'http'
import { shell } from 'electron'
import { getSettings, saveSettings } from '../ipc/settings'

function getOAuth2Client() {
  const settings = getSettings()
  const oauth2Client = new google.auth.OAuth2(
    settings.google_client_id,
    settings.google_client_secret,
    'http://localhost:19823'
  )
  if (settings.google_refresh_token) {
    oauth2Client.setCredentials({ refresh_token: settings.google_refresh_token })
  }
  return oauth2Client
}

export async function startGoogleOAuth(): Promise<void> {
  const settings = getSettings()
  if (!settings.google_client_id || !settings.google_client_secret) {
    throw new Error('Google Client ID와 Secret을 먼저 설정하세요.')
  }

  const oauth2Client = getOAuth2Client()
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.send',
    ],
  })

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, 'http://localhost:19823')
        const code = url.searchParams.get('code')
        if (!code) return

        const { tokens } = await oauth2Client.getToken(code)
        saveSettings({ google_refresh_token: tokens.refresh_token ?? '' })

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h2>✅ Google 연결 완료! 이 탭을 닫으셔도 됩니다.</h2>')
        server.close()
        resolve()
      } catch (e) {
        res.writeHead(500)
        res.end('오류 발생')
        server.close()
        reject(e)
      }
    })

    server.listen(19823, () => {
      shell.openExternal(authUrl)
    })

    server.on('error', reject)
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close()
      reject(new Error('OAuth 타임아웃 (5분)'))
    }, 5 * 60 * 1000)
  })
}

export async function listGoogleCalendars(): Promise<{ id: string; summary: string }[]> {
  const auth = getOAuth2Client()
  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.calendarList.list()
  return (res.data.items ?? []).map((item) => ({
    id: item.id ?? '',
    summary: item.summary ?? '',
  }))
}

export async function createCalendarEvent(params: {
  summary: string
  start: string
  end: string
  description: string
  calendarId: string
}): Promise<string | undefined> {
  if (!params.calendarId) return undefined
  const settings = getSettings()
  if (!settings.google_refresh_token) return undefined

  const auth = getOAuth2Client()
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

export async function deleteCalendarEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  if (!calendarId || !eventId) return
  const settings = getSettings()
  if (!settings.google_refresh_token) return

  const auth = getOAuth2Client()
  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.delete({ calendarId, eventId })
}
