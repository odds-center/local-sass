import { LeaveStatus } from '../../shared/types'

const CONFIG: Record<LeaveStatus, { label: string; className: string }> = {
  pending:   { label: '검토 중', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  approved:  { label: '승인',    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  rejected:  { label: '거절',    className: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  cancelled: { label: '취소',    className: 'bg-zinc-700/50 text-zinc-500 border border-zinc-700' },
}

export default function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
