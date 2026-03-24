import { useEffect, useState } from 'react'
import BigNumber from 'bignumber.js'
import { LeaveBalance } from '../../shared/types'
import { api } from '../lib/api'
import { Pencil, Check, X } from 'lucide-react'

// 1일 = 8시간, 0.5시간(30분) 단위
const HPD = new BigNumber(8) // hours per day

function daysToHours(days: number): number {
  return new BigNumber(days).multipliedBy(HPD).decimalPlaces(1).toNumber()
}

function hoursToDays(hours: number): number {
  return new BigNumber(hours).dividedBy(HPD).decimalPlaces(3).toNumber()
}

function formatDays(days: number): string {
  const bn = new BigNumber(days)
  const wholeDays = bn.integerValue(BigNumber.ROUND_FLOOR).toNumber()
  const remainHours = bn.minus(wholeDays).multipliedBy(HPD).decimalPlaces(1).toNumber()
  if (remainHours === 0) return `${wholeDays}일`
  if (wholeDays === 0) return `${remainHours}시간`
  return `${wholeDays}일 ${remainHours}시간`
}

function adjustHours(current: number, delta: number): number {
  return BigNumber.max(0, new BigNumber(current).plus(delta)).decimalPlaces(1).toNumber()
}

// 0.5시간 단위 선택 옵션 (0.5h ~ 200h)
const HOUR_OPTIONS: number[] = Array.from({ length: 400 }, (_, i) =>
  new BigNumber(i + 1).multipliedBy(0.5).toNumber()
)

type EditMode = 'hours' | 'quick'

export default function LeaveBalances() {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editHours, setEditHours] = useState<number>(0)
  const [editMode, setEditMode] = useState<EditMode>('hours')

  const load = async () => {
    setLoading(true)
    setBalances(await api.leaveBalances.listByYear(year))
    setLoading(false)
  }

  useEffect(() => { load() }, [year])

  const openEdit = (b: LeaveBalance) => {
    setEditingId(b.id)
    setEditHours(daysToHours(b.allocated_days))
    setEditMode('hours')
  }

  const handleAdjust = async (id: string) => {
    if (editHours < 0) return
    const days = hoursToDays(editHours)
    await api.leaveBalances.adjust(id, days)
    setEditingId(null)
    await load()
  }

  const filtered = balances.filter((b) => b.leave_type_name?.includes('연차'))

  const byEmployee: Record<string, LeaveBalance[]> = {}
  for (const b of filtered) {
    const key = b.employee_name ?? b.employee_id
    if (!byEmployee[key]) byEmployee[key] = []
    byEmployee[key].push(b)
  }

  const sel = 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">잔여 일수</h1>
          <p className="text-xs text-zinc-500 mt-0.5">1일 = 8시간 · 30분 단위 조정 가능</p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={sel}>
          {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-zinc-600 text-sm">불러오는 중...</p>
      ) : Object.keys(byEmployee).length === 0 ? (
        <p className="text-center py-12 text-zinc-600 text-sm">데이터가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byEmployee).map(([employeeName, bals]) => (
            <div key={employeeName} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800">
                <h3 className="font-semibold text-zinc-200 text-sm">{employeeName}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/60">
                    <th className="px-5 py-2 text-xs text-zinc-500 font-medium text-left">종류</th>
                    <th className="px-5 py-2 text-xs text-zinc-500 font-medium text-right">부여</th>
                    <th className="px-5 py-2 text-xs text-zinc-500 font-medium text-right">사용</th>
                    <th className="px-5 py-2 text-xs text-zinc-500 font-medium text-right">잔여</th>
                    <th className="px-5 py-2 text-xs text-zinc-500 font-medium text-right">조정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {bals.map((b) => {
                    const remaining = b.allocated_days - b.used_days
                    const isEditing = editingId === b.id

                    return (
                      <tr key={b.id} className={`transition-colors ${isEditing ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'}`}>
                        {/* 종류 */}
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.leave_type_color ?? '#8b5cf6' }} />
                            <span className="text-zinc-300">{b.leave_type_name}</span>
                          </span>
                        </td>

                        {/* 부여 */}
                        <td className="px-5 py-3 text-right">
                          <span className="text-zinc-400">{formatDays(b.allocated_days)}</span>
                          <span className="text-zinc-600 text-xs ml-1">({daysToHours(b.allocated_days)}h)</span>
                        </td>

                        {/* 사용 */}
                        <td className="px-5 py-3 text-right">
                          <span className="text-zinc-400">{formatDays(b.used_days)}</span>
                          <span className="text-zinc-600 text-xs ml-1">({daysToHours(b.used_days)}h)</span>
                        </td>

                        {/* 잔여 */}
                        <td className={`px-5 py-3 text-right font-semibold ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatDays(remaining)}
                          <span className="text-xs font-normal ml-1 opacity-60">({daysToHours(remaining)}h)</span>
                        </td>

                        {/* 조정 */}
                        <td className="px-5 py-3 text-right">
                          {isEditing ? (
                            <div className="flex flex-col gap-2 items-end">
                              {/* 시간 직접 입력 */}
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={editHours}
                                  onChange={(e) => setEditHours(Number(e.target.value))}
                                  className="bg-zinc-700 border border-zinc-600 rounded-lg pl-2 pr-7 py-1 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 w-28"
                                >
                                  {HOUR_OPTIONS.map((h) => (
                                    <option key={h} value={h}>
                                      {h}시간 ({formatDays(hoursToDays(h))})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* +/- 빠른 조정 버튼 */}
                              <div className="flex items-center gap-1">
                                {[-4, -0.5, +0.5, +4].map((delta) => (
                                  <button
                                    key={delta}
                                    onClick={() => setEditHours((h) => adjustHours(h, delta))}
                                    className="px-1.5 py-0.5 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                                  >
                                    {delta > 0 ? `+${delta}h` : `${delta}h`}
                                  </button>
                                ))}
                              </div>

                              <div className="text-[10px] text-zinc-500">
                                = {hoursToDays(editHours)}일
                              </div>

                              <div className="flex gap-2">
                                <button onClick={() => handleAdjust(b.id)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"><Check size={12} />저장</button>
                                <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"><X size={12} />취소</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openEdit(b)}
                              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              <Pencil size={12} />수정
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
