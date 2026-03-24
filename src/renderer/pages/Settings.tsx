import { useEffect, useState } from 'react'
import { AppSettings } from '../../shared/types'
import { api } from '../lib/api'
import { Send, Link2, RefreshCw, CheckCircle, XCircle, Save } from 'lucide-react'

type SettingsWithIPs = AppSettings & { host_ips: string[] }

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

export default function Settings() {
  const [settings, setSettings] = useState<SettingsWithIPs | null>(null)
  const [calendars, setCalendars] = useState<{ id: string; summary: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    api.settings.get().then(setSettings).catch(() => {
      showToast('설정을 불러오는 중 오류가 발생했습니다. (관리자 권한 필요)')
    })
  }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    await api.settings.set(settings)
    setSaving(false)
    showToast('저장되었습니다.')
  }

  const testDiscord = async () => {
    const result = await api.settings.testDiscord()
    showToast(result.ok ? 'Discord 연결 성공!' : `실패: ${result.error}`)
  }

  const connectGoogle = async () => {
    showToast('브라우저에서 Google 계정으로 로그인하세요...')
    const result = await api.settings.connectGoogle()
    if (result.ok) {
      showToast('Google 연결 완료!')
      const cals = await api.settings.listCalendars()
      setCalendars(cals)
    } else {
      showToast(`실패: ${result.error}`)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  if (!settings) return (
    <div className="text-zinc-500 text-sm p-4">{toast || '설정 페이지는 관리자만 접근할 수 있습니다.'}</div>
  )

  const set = (key: keyof AppSettings, val: string) =>
    setSettings((s) => s ? { ...s, [key]: val } : s)

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">설정</h1>

      {toast && (
        <div className="bg-violet-500/10 border border-violet-500/30 text-violet-300 text-sm px-4 py-3 rounded-lg">{toast}</div>
      )}

      {settings.host_ips.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-400">팀원 접속 주소</p>
          <div className="bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-0.5">mDNS (추천)</p>
            <p className="text-sm font-mono text-emerald-300 font-semibold">http://localsass.local:8888</p>
          </div>
          <div className="bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-0.5">IP 직접 접속</p>
            {settings.host_ips.map((ip) => (
              <p key={ip} className="text-sm font-mono text-zinc-300">http://{ip}:8888</p>
            ))}
          </div>
          <p className="text-xs text-zinc-500">같은 와이파이에 연결된 팀원은 위 주소로 접속하세요.</p>
        </div>
      )}

      <Section title="일반">
        <Field label="회사 이름">
          <input value={settings.app_company_name} onChange={(e) => set('app_company_name', e.target.value)} className={inp} placeholder="우리 회사" />
        </Field>
      </Section>

      <Section title="Discord 웹훅">
        <Field label="Webhook URL">
          <input value={settings.discord_webhook_url} onChange={(e) => set('discord_webhook_url', e.target.value)} className={inp} placeholder="https://discord.com/api/webhooks/..." />
        </Field>
        <button onClick={testDiscord} className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"><Send size={13} />테스트 메시지 전송</button>
      </Section>

      <Section title="Google Calendar">
        <p className="text-xs text-zinc-500 mb-3">
          GCP Console에서 OAuth 2.0 클라이언트 ID를 생성하고 리디렉션 URI에{' '}
          <code className="bg-zinc-800 px-1 rounded text-zinc-300">http://localhost:19823</code>를 추가하세요.
        </p>
        <Field label="Client ID">
          <input value={settings.google_client_id} onChange={(e) => set('google_client_id', e.target.value)} className={inp} placeholder="xxxxxxxxxx.apps.googleusercontent.com" />
        </Field>
        <Field label="Client Secret">
          <input type="password" value={settings.google_client_secret} onChange={(e) => set('google_client_secret', e.target.value)} className={inp} />
        </Field>
        <div className="flex gap-3 items-center flex-wrap">
          <button onClick={connectGoogle} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors"><Link2 size={14} />Google 계정 연결</button>
          {settings.google_refresh_token === '연결됨' && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={13} />연결됨</span>}
        </div>
        {settings.google_refresh_token === '연결됨' && (
          <Field label="Google 캘린더">
            <div className="flex gap-2">
              <select value={settings.google_calendar_id} onChange={(e) => set('google_calendar_id', e.target.value)} className={inp}>
                <option value="">캘린더 선택</option>
                {calendars.map((c) => <option key={c.id} value={c.id}>{c.summary}</option>)}
              </select>
              <button onClick={() => api.settings.listCalendars().then(setCalendars)} className="flex items-center gap-1 px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors shrink-0"><RefreshCw size={12} />새로고침</button>
            </div>
          </Field>
        )}
      </Section>

      <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40">
        {saving ? '저장 중...' : <><Save size={15} />설정 저장</>}
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
