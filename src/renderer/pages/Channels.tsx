import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Channel, ChannelConfig, ChannelType, WebhookType } from '../../shared/types'
import { api } from '../lib/api'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Send, CalendarDays, ClipboardList } from 'lucide-react'

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  leave_management: '휴가 관리',
  scrum: '스크럼',
}

const WEBHOOK_TYPE_LABELS: Record<WebhookType, string> = {
  discord: 'Discord',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  custom: '커스텀',
}

const CHANNEL_TYPE_ICONS: Record<ChannelType, React.ReactNode> = {
  leave_management: <CalendarDays size={14} />,
  scrum: <ClipboardList size={14} />,
}

interface ChannelFormData {
  name: string
  type: ChannelType
  webhook_type: WebhookType
  webhook_url: string
  google_calendar_id: string
}

const defaultForm = (): ChannelFormData => ({
  name: '',
  type: 'leave_management',
  webhook_type: 'discord',
  webhook_url: '',
  google_calendar_id: '',
})

export default function Channels() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Channel | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ChannelFormData>(defaultForm())
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.channels.list(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['channels'] })

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; type: ChannelType; config: ChannelConfig }) =>
      api.channels.create(payload),
    onSuccess: () => { invalidate(); closeModal(); toast.success('채널이 생성되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; config?: ChannelConfig } }) =>
      api.channels.update(id, data),
    onSuccess: () => { invalidate(); closeModal(); toast.success('채널이 저장되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.channels.delete(id),
    onSuccess: () => { invalidate(); toast.success('삭제되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.channels.testWebhook(id),
    onSuccess: (result, id) => {
      setTestResult((prev) => ({
        ...prev,
        [id]: { ok: result.ok, msg: result.ok ? '연결 성공!' : (result.error ?? '실패') },
      }))
      setTimeout(() => setTestResult((prev) => { const n = { ...prev }; delete n[id]; return n }), 4000)
    },
    onError: (err) => toast.error((err as Error).message),
  })

  function openCreate() {
    setForm(defaultForm())
    setCreating(true)
    setEditing(null)
  }

  function openEdit(ch: Channel) {
    setForm({
      name: ch.name,
      type: ch.type,
      webhook_type: ch.config.webhook_type ?? 'discord',
      webhook_url: ch.config.webhook_url ?? '',
      google_calendar_id: ch.config.google_calendar_id ?? '',
    })
    setEditing(ch)
    setCreating(false)
  }

  function closeModal() { setCreating(false); setEditing(null) }

  function save() {
    const config: ChannelConfig = {
      webhook_type: form.webhook_type,
      webhook_url: form.webhook_url || undefined,
      google_calendar_id: form.google_calendar_id || undefined,
    }
    if (creating) {
      createMutation.mutate({ name: form.name, type: form.type, config })
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, data: { name: form.name, config } })
    }
  }

  function deleteChannel(ch: Channel) {
    if (!confirm(`"${ch.name}" 채널을 삭제하시겠습니까?`)) return
    deleteMutation.mutate(ch.id)
  }

  const isOpen = creating || editing !== null
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">채널</h1>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} />채널 추가
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        채널은 기능별 알림 단위입니다. 각 채널에 Webhook URL을 설정하면 Discord, Slack, Teams 등으로 알림을 받을 수 있습니다.
      </p>

      {channels.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
          채널이 없습니다. 채널을 추가하여 알림을 설정하세요.
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => (
            <div key={ch.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-zinc-100 font-medium text-sm">{ch.name}</span>
                  <span className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {CHANNEL_TYPE_ICONS[ch.type]}
                    {CHANNEL_TYPE_LABELS[ch.type]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  {ch.config.webhook_url ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle size={11} />
                      {WEBHOOK_TYPE_LABELS[ch.config.webhook_type ?? 'discord']} 웹훅 설정됨
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-600">
                      <XCircle size={11} />웹훅 미설정
                    </span>
                  )}
                  {testResult[ch.id] && (
                    <span className={testResult[ch.id].ok ? 'text-emerald-400' : 'text-red-400'}>
                      {testResult[ch.id].msg}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {ch.config.webhook_url && (
                  <button onClick={() => testMutation.mutate(ch.id)} className="p-2 text-zinc-500 hover:text-violet-400 transition-colors" title="웹훅 테스트">
                    <Send size={14} />
                  </button>
                )}
                <button onClick={() => openEdit(ch)} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteChannel(ch)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-semibold text-zinc-100">
              {creating ? '채널 추가' : `채널 편집: ${editing?.name}`}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">채널 이름</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inp} placeholder="예: 개발팀 휴가 알림" />
              </div>

              {creating && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">채널 유형</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ChannelType }))} className={inp + ' pl-3 pr-8'}>
                    {(Object.keys(CHANNEL_TYPE_LABELS) as ChannelType[]).map((t) => (
                      <option key={t} value={t}>{CHANNEL_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">메신저 종류</label>
                <select value={form.webhook_type} onChange={(e) => setForm((f) => ({ ...f, webhook_type: e.target.value as WebhookType }))} className={inp + ' pl-3 pr-8'}>
                  {(Object.keys(WEBHOOK_TYPE_LABELS) as WebhookType[]).map((t) => (
                    <option key={t} value={t}>{WEBHOOK_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Webhook URL</label>
                <input
                  value={form.webhook_url}
                  onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))}
                  className={inp}
                  placeholder={
                    form.webhook_type === 'discord' ? 'https://discord.com/api/webhooks/...' :
                    form.webhook_type === 'slack' ? 'https://hooks.slack.com/services/...' :
                    form.webhook_type === 'teams' ? 'https://xxxx.webhook.office.com/...' :
                    'https://...'
                  }
                />
              </div>

              {form.type === 'leave_management' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google 캘린더 ID (선택)</label>
                  <input
                    value={form.google_calendar_id}
                    onChange={(e) => setForm((f) => ({ ...f, google_calendar_id: e.target.value }))}
                    className={inp}
                    placeholder="example@group.calendar.google.com"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className="flex-1 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                취소
              </button>
              <button onClick={save} disabled={isSaving || !form.name} className="flex-1 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-40">
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
