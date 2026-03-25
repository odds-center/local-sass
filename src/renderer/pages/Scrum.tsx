import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { ScrumItem } from '../../shared/types'
import { Plus, Trash2, Send, RotateCcw, Check, ChevronDown, ChevronUp, Users } from 'lucide-react'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${String(y).slice(2)}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} (${DAYS[date.getDay()]})`
}

function prevDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return toLocalDateStr(date)
}

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

export default function Scrum() {
  const today = toLocalDateStr(new Date())
  const qc = useQueryClient()
  const [date, setDate] = useState(today)
  const [items, setItems] = useState<ScrumItem[]>([])
  const [newText, setNewText] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: scrum } = useQuery({
    queryKey: ['scrum-me', date],
    queryFn: () => api.scrums.getMe(date),
  })

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['scrum-history'],
    queryFn: () => api.scrums.recent(),
    enabled: showHistory,
  })

  const { data: teamScrums = [], refetch: refetchTeam } = useQuery({
    queryKey: ['scrum-team', date],
    queryFn: () => api.scrums.team(date),
    enabled: showTeam,
  })

  useEffect(() => {
    setItems(scrum?.items ?? [])
  }, [scrum])

  const saveMutation = useMutation({
    mutationFn: (nextItems: ScrumItem[]) => api.scrums.save(date, nextItems),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scrum-me', date] }),
    onError: (err) => toast.error((err as Error).message),
  })

  const sendMutation = useMutation({
    mutationFn: () => api.scrums.send(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scrum-me', date] })
      toast.success('전송했습니다!')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const updateItems = (next: ScrumItem[]) => {
    setItems(next)
    saveMutation.mutate(next)
  }

  const addItem = () => {
    const text = newText.trim()
    if (!text) return
    const next = [...items, { text, done: false }]
    setNewText('')
    inputRef.current?.focus()
    updateItems(next)
  }

  const toggleDone = (i: number) => {
    updateItems(items.map((item, idx) => idx === i ? { ...item, done: !item.done } : item))
  }

  const removeItem = (i: number) => {
    updateItems(items.filter((_, idx) => idx !== i))
  }

  const importYesterdayUndone = async () => {
    const yesterdayScrum = await api.scrums.getMe(prevDay(date))
    if (!yesterdayScrum || yesterdayScrum.items.length === 0) { toast.info('어제 스크럼 항목이 없습니다.'); return }
    const undone = yesterdayScrum.items.filter((it) => !it.done)
    if (undone.length === 0) { toast.info('어제 미완료 항목이 없습니다.'); return }
    const existingTexts = new Set(items.map((it) => it.text))
    const toAdd = undone.filter((it) => !existingTexts.has(it.text))
    if (toAdd.length === 0) { toast.info('이미 모두 추가되어 있습니다.'); return }
    updateItems([...items, ...toAdd])
    toast.success(`${toAdd.length}개 가져왔습니다.`)
  }

  const loadTeam = () => {
    setShowTeam(true)
    refetchTeam()
  }

  const loadHistory = () => {
    setShowHistory(true)
    refetchHistory()
  }

  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">스크럼</h1>
          <p className="text-xs text-zinc-500 mt-0.5">일일 업무 현황을 기록하고 Discord로 전송합니다.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-zinc-200">[{formatHeader(date)}]</span>
            {items.length > 0 && (
              <span className="text-xs text-zinc-500">{doneCount}/{items.length} 완료</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saveMutation.isPending && <span className="text-xs text-zinc-600">저장 중...</span>}
            {scrum?.sent_at && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check size={11} strokeWidth={2.5} />전송됨
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-zinc-800/50">
          {items.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-zinc-600">항목을 추가하세요.</p>
          )}
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 group transition-colors">
              <button
                onClick={() => toggleDone(i)}
                className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                  item.done
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'border-zinc-600 hover:border-zinc-400'
                }`}
              >
                {item.done && <Check size={11} strokeWidth={3} />}
              </button>
              <span className={`flex-1 text-sm ${item.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                {item.text}
              </span>
              <button
                onClick={() => removeItem(i)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 flex gap-2">
          <input
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="항목 추가 (Enter)"
            className={inp}
          />
          <button
            onClick={addItem}
            disabled={!newText.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm transition-colors disabled:opacity-40 shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={importYesterdayUndone}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 rounded-lg transition-colors"
        >
          <RotateCcw size={13} />어제 미완료 가져오기
        </button>
        <button
          onClick={loadTeam}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 rounded-lg transition-colors"
        >
          <Users size={13} />팀 스크럼 보기
        </button>
        <div className="flex-1" />
        <button
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending || items.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-40"
        >
          <Send size={14} />{sendMutation.isPending ? '전송 중...' : '전송'}
        </button>
      </div>

      {showTeam && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-200">팀 스크럼 — {formatHeader(date)}</span>
            <button onClick={() => setShowTeam(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">닫기</button>
          </div>
          {teamScrums.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-600">등록된 스크럼이 없습니다.</p>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {teamScrums.map((s, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-zinc-300">{s.employee_name}</span>
                    {s.sent_at && <span className="flex items-center gap-1 text-xs text-emerald-400"><Check size={11} />전송됨</span>}
                  </div>
                  <div className="space-y-1">
                    {s.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${item.done ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {item.done ? '[x]' : '[ ]'}
                        </span>
                        <span className={`text-sm ${item.done ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <button
          onClick={showHistory ? () => setShowHistory(false) : loadHistory}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          내 스크럼 히스토리
        </button>
        {showHistory && (
          <div className="mt-3 space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-zinc-600">히스토리가 없습니다.</p>
            ) : (
              history.map((h, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">[{formatHeader(h.date)}]</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">{h.items.filter(it=>it.done).length}/{h.items.length} 완료</span>
                      {h.sent_at && <span className="flex items-center gap-1 text-xs text-emerald-400"><Check size={10} />전송됨</span>}
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-1">
                    {h.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className={`text-xs font-mono shrink-0 ${item.done ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {item.done ? '[x]' : '[ ]'}
                        </span>
                        <span className={`text-xs ${item.done ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
