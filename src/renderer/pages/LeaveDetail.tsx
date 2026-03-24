import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LeaveRequest, LeaveUnit } from '../../shared/types'
import LeaveStatusBadge from '../components/LeaveStatusBadge'
import ConfirmDialog from '../components/ConfirmDialog'
import { api } from '../lib/api'
import { ArrowLeft, Check, CheckCircle, XCircle, Ban } from 'lucide-react'

function formatUnit(unit: LeaveUnit, hours: number | null, days: number, startTime?: string | null, endTime?: string | null): string {
  if (unit === 'half_am') return '오전 반차'
  if (unit === 'half_pm') return '오후 반차'
  if (unit === 'hour') {
    if (startTime && endTime) return `${startTime} ~ ${endTime} (${hours}시간)`
    return `${hours}시간`
  }
  return `${days}일`
}

export default function LeaveDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [request, setRequest] = useState<LeaveRequest | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [_loading, setLoading] = useState(false)

  const load = async () => {
    const [requests, me] = await Promise.all([api.leaveRequests.list(), api.auth.me()])
    setRequest(requests.find((r) => r.id === id) ?? null)
    setCurrentUser(me)
  }

  useEffect(() => { load() }, [id])

  const handleApprove = async () => {
    if (!request) return
    setLoading(true)
    await api.leaveRequests.approve(request.id, reviewNote)
    setDialog(null); await load(); setLoading(false)
  }
  const handleReject = async () => {
    if (!request) return
    setLoading(true)
    await api.leaveRequests.reject(request.id, reviewNote)
    setDialog(null); await load(); setLoading(false)
  }
  const handleCancel = async () => {
    if (!request) return
    setLoading(true)
    await api.leaveRequests.cancel(request.id)
    setDialog(null); await load(); setLoading(false)
  }

  if (!request) return <div className="text-zinc-500 text-sm pt-20 text-center">불러오는 중...</div>

  const isManagerOrAdmin = currentUser && ['manager', 'admin'].includes(currentUser.role)
  const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none h-20'

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"><ArrowLeft size={15} />뒤로</button>
        <h1 className="text-xl font-bold text-zinc-100">휴가 신청 상세</h1>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">{request.employee_name}</h2>
          <LeaveStatusBadge status={request.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <InfoRow label="휴가 종류" value={request.leave_type_name ?? '-'} />
          <InfoRow label="신청" value={formatUnit(request.leave_unit, request.leave_hours, request.total_days, request.start_time, request.end_time)} />
          <InfoRow label="시작일" value={request.start_date} />
          <InfoRow label="종료일" value={request.end_date} />
          <InfoRow label="신청일" value={request.created_at.slice(0, 10)} />
          {request.reviewer_name && <InfoRow label="검토자" value={request.reviewer_name} />}
          {request.reviewed_at && <InfoRow label="검토일" value={request.reviewed_at.slice(0, 10)} />}
        </dl>

        {request.reason && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">사유</p>
            <p className="text-sm text-zinc-300 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">{request.reason}</p>
          </div>
        )}

        {request.reviewer_note && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">검토 의견</p>
            <p className="text-sm text-zinc-300 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">{request.reviewer_note}</p>
          </div>
        )}

        {request.google_calendar_event_id && (
          <p className="flex items-center gap-1 text-xs text-emerald-400"><Check size={12} strokeWidth={2.5} />Google Calendar 이벤트 등록됨</p>
        )}
      </div>

      {request.status === 'pending' && isManagerOrAdmin && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">검토</h3>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">검토 의견 (선택)</label>
            <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} className={inp} placeholder="승인/거절 사유를 입력하세요" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDialog('approve')} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"><CheckCircle size={15} />승인</button>
            <button onClick={() => setDialog('reject')} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors"><XCircle size={15} />거절</button>
          </div>
        </div>
      )}

      {['pending', 'approved'].includes(request.status) && (
        <button onClick={() => setDialog('cancel')} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-zinc-500 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300 rounded-lg transition-colors">
          <Ban size={14} />신청 취소
        </button>
      )}

      <ConfirmDialog open={dialog === 'approve'} title="휴가 승인" message="이 휴가 신청을 승인하시겠습니까?" confirmLabel="승인" onConfirm={handleApprove} onCancel={() => setDialog(null)} />
      <ConfirmDialog open={dialog === 'reject'} title="휴가 거절" message="이 휴가 신청을 거절하시겠습니까?" confirmLabel="거절" onConfirm={handleReject} onCancel={() => setDialog(null)} />
      <ConfirmDialog open={dialog === 'cancel'} title="신청 취소" message="이 신청을 취소하시겠습니까?" confirmLabel="취소하기" onConfirm={handleCancel} onCancel={() => setDialog(null)} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-zinc-200">{value}</dd>
    </div>
  )
}
