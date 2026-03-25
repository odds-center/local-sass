import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LeaveStatus, LeaveUnit } from '../../shared/types'
import LeaveStatusBadge from '../components/LeaveStatusBadge'
import { api } from '../lib/api'
import { Plus } from 'lucide-react'

const STATUS_OPTIONS: { value: LeaveStatus | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'pending', label: '검토 중' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '거절' },
  { value: 'cancelled', label: '취소' },
]

function formatUnit(unit: LeaveUnit, hours: number | null, startTime?: string | null, endTime?: string | null): string {
  if (unit === 'half_am') return '오전 반차'
  if (unit === 'half_pm') return '오후 반차'
  if (unit === 'hour') {
    if (startTime && endTime) return `${startTime}~${endTime}`
    return `${hours}시간`
  }
  return ''
}

export default function LeaveRequests() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('')
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leave-requests', { status: statusFilter, year }],
    queryFn: () => api.leaveRequests.list({ status: statusFilter || undefined, year }),
  })

  const sel = 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">휴가 신청 목록</h1>
        <Link to="/leave-requests/new" className="btn-primary flex items-center gap-1.5"><Plus size={15} strokeWidth={2.5} />새 신청</Link>
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | '')} className={sel}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={sel}>
          {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {isLoading ? (
          <p className="text-center py-12 text-zinc-600 text-sm">불러오는 중...</p>
        ) : requests.length === 0 ? (
          <p className="text-center py-12 text-zinc-600 text-sm">신청 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['직원', '휴가 종류', '기간', '일수/단위', '상태', '신청일'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-800/40 cursor-pointer transition-colors" onClick={() => navigate(`/leave-requests/${r.id}`)}>
                  <td className="px-4 py-3 font-medium text-zinc-200">{r.employee_name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.leave_type_color ?? '#8b5cf6' }} />
                      <span className="text-zinc-300">{r.leave_type_name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{r.start_date}{r.start_date !== r.end_date ? ` ~ ${r.end_date}` : ''}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.leave_unit === 'day' ? `${r.total_days}일` : formatUnit(r.leave_unit, r.leave_hours, r.start_time, r.end_time)}
                  </td>
                  <td className="px-4 py-3"><LeaveStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-zinc-500">{r.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
