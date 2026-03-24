import { useState, useMemo } from 'react'
import { LeaveRequest } from '../../shared/types'

interface Props {
  requests: LeaveRequest[]
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Calendar({ requests }: Props) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Build a map: dateKey → requests[]
  const dayMap = useMemo(() => {
    const map: Record<string, LeaveRequest[]> = {}
    const active = requests.filter((r) => r.status === 'approved' || r.status === 'pending')
    for (const r of active) {
      const start = new Date(r.start_date)
      const end = new Date(r.end_date)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = dateKey(new Date(d))
        if (!map[key]) map[key] = []
        map[key].push(r)
      }
    }
    return map
  }, [requests])

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">
          {year}년 {month + 1}월
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-base"
          >‹</button>
          <button
            onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-2.5 h-7 text-xs text-zinc-500 hover:text-zinc-300 transition-colors rounded-md hover:bg-zinc-800"
          >오늘</button>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-base"
          >›</button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {DAYS.map((d, i) => (
          <div key={d} className={`py-2 text-center text-[11px] font-medium tracking-wide ${
            i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-400' : 'text-zinc-600'
          }`}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const col = idx % 7
          const key = day ? dateKey(new Date(year, month, day)) : ''
          const dayReqs = day ? (dayMap[key] ?? []) : []
          const isWeekend = col === 0 || col === 6

          return (
            <div
              key={idx}
              className={`min-h-[68px] p-1.5 border-b border-r border-zinc-800/50 ${
                !day ? 'bg-zinc-950/50' : ''
              }`}
            >
              {day && (
                <>
                  <div className="flex justify-end mb-1">
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-medium ${
                      isToday(day)
                        ? 'bg-violet-600 text-white'
                        : isWeekend
                        ? 'text-zinc-700'
                        : 'text-zinc-500'
                    }`}>{day}</span>
                  </div>
                  <div className="space-y-0.5">
                    {dayReqs.slice(0, 2).map((r) => (
                      <div
                        key={r.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate leading-tight"
                        style={{
                          backgroundColor: (r.leave_type_color ?? '#8b5cf6') + '30',
                          color: r.leave_type_color ?? '#a78bfa',
                          borderLeft: `2px solid ${r.leave_type_color ?? '#8b5cf6'}`,
                        }}
                        title={`${r.employee_name} — ${r.leave_type_name}`}
                      >
                        {r.employee_name}
                      </div>
                    ))}
                    {dayReqs.length > 2 && (
                      <div className="text-[9px] text-zinc-600 px-1">+{dayReqs.length - 2}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
