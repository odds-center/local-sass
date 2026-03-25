import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LeaveRequest } from '../../shared/types'
import LeaveStatusBadge from '../components/LeaveStatusBadge'
import Calendar from '../components/Calendar'
import { api } from '../lib/api'
import { ChevronRight } from 'lucide-react'

function formatDays(r: LeaveRequest): string {
  if (r.leave_unit === 'half_am') return '오전 반차'
  if (r.leave_unit === 'half_pm') return '오후 반차'
  if (r.leave_unit === 'hour') return r.start_time && r.end_time ? `${r.start_time}~${r.end_time}` : `${r.leave_hours}시간`
  return `${r.total_days}일`
}

export default function Dashboard() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leave-requests', { year: new Date().getFullYear() }],
    queryFn: () => api.leaveRequests.list({ year: new Date().getFullYear() }),
  })

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const recentRequests = requests.slice(0, 8)

  if (isLoading) return <div className="text-zinc-500 text-sm pt-20 text-center">불러오는 중...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">대시보드</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="대기 중인 신청" value={String(pendingCount)} accent="amber" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400">팀 휴가 달력</h2>
        </div>
        <Calendar requests={requests} />
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400">최근 신청 내역</h2>
          <Link to="/leave-requests" className="flex items-center gap-0.5 text-xs text-violet-400 hover:text-violet-300">전체 보기 <ChevronRight size={13} /></Link>
        </div>
        {recentRequests.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-600">신청 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {recentRequests.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/leave-requests/${r.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-sm text-zinc-200">{r.employee_name}</span>
                    <span className="text-zinc-500 text-xs ml-2">
                      {r.leave_type_name} · {r.start_date}
                      {r.start_date !== r.end_date && ` ~ ${r.end_date}`}
                      {' '}({formatDays(r)})
                    </span>
                  </div>
                  <LeaveStatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, suffix = '', accent }: {
  label: string; value: string; suffix?: string; accent: 'amber' | 'violet'
}) {
  const color = accent === 'amber' ? 'text-amber-400' : 'text-violet-400'
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <p className="text-xs text-zinc-500 mb-1.5 truncate">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value}
        {suffix && <span className="text-sm font-normal ml-1 text-zinc-500">{suffix}</span>}
      </p>
    </div>
  )
}
