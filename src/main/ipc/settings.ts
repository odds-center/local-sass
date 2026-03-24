import { IpcMain } from 'electron'
import Store from 'electron-store'
import { AppSettings } from '../../shared/types'
import { testDiscordWebhook } from '../integrations/discord'
import { startGoogleOAuth, listGoogleCalendars } from '../integrations/google-calendar'

const DEFAULT_SETTINGS: AppSettings = {
  discord_webhook_url: '',
  google_client_id: '',
  google_client_secret: '',
  google_refresh_token: '',
  google_calendar_id: '',
  app_company_name: '',
  current_user_id: '',
}

const store = new Store<AppSettings>({
  name: 'settings',
  defaults: DEFAULT_SETTINGS,
})

export function getSettings(): AppSettings {
  return store.store as AppSettings
}

export function saveSettings(data: Partial<AppSettings>): void {
  for (const [key, value] of Object.entries(data)) {
    store.set(key, value)
  }
}

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', (_event, data: Partial<AppSettings>) => {
    saveSettings(data)
  })

  ipcMain.handle('settings:testDiscord', async () => {
    const settings = getSettings()
    if (!settings.discord_webhook_url) {
      return { ok: false, error: 'Webhook URL이 설정되지 않았습니다.' }
    }
    try {
      await testDiscordWebhook(settings.discord_webhook_url)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('settings:connectGoogle', async () => {
    try {
      await startGoogleOAuth()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('settings:listCalendars', async () => {
    try {
      return await listGoogleCalendars()
    } catch (e) {
      console.error('[Calendar] listCalendars failed:', e)
      return []
    }
  })
}
