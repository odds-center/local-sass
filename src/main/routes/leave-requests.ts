import { Router, Request, Response } from 'express'
import { getDb } from '../database/db'
import {
  listLeaveRequests,
  createLeaveRequest,
  getLeaveRequest,
  updateLeaveRequestStatus,
  clearCalendarEventId,
} from '../database/queries/leave-requests'
import { deductLeaveBalance, restoreLeaveBalance } from '../database/queries/leave-balances'
import { getEmployee } from '../database/queries/employees'
import { sendDiscordNotification } from '../integrations/discord'
import { createCalendarEvent, deleteCalendarEvent } from '../integrations/google-calendar'
import { getSettings } from '../ipc/settings'
import { requireRole } from '../middleware/auth'
import { LeaveRequestFilters } from '../../shared/types'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const filters: LeaveRequestFilters = {
    status: req.query.status as LeaveRequestFilters['status'],
    employee_id: req.query.employee_id as string | undefined,
    leave_type_id: req.query.leave_type_id as string | undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
  }
  // Remove undefined keys
  Object.keys(filters).forEach((k) => {
    if ((filters as Record<string, unknown>)[k] === undefined) {
      delete (filters as Record<string, unknown>)[k]
    }
  })
  res.json(listLeaveRequests(filters))
})

router.post('/', async (req: Request, res: Response) => {
  const request = createLeaveRequest(req.body)
  res.status(201).json(request)
})

router.post('/:id/approve', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const request = getLeaveRequest(String(req.params.id))
  if (!request) { res.status(404).json({ error: '신청을 찾을 수 없습니다.' }); return }
  if (request.status !== 'pending') { res.status(400).json({ error: '대기 중인 신청만 승인할 수 있습니다.' }); return }

  const { note } = req.body as { note?: string }
  const reviewerId = req.user!.id
  const settings = getSettings()

  const updated = getDb().transaction(() => {
    const year = new Date(request.start_date).getFullYear()
    deductLeaveBalance(request.employee_id, request.leave_type_id, year, request.total_days)
    return updateLeaveRequestStatus(String(req.params.id), 'approved', reviewerId, note)
  })()

  const employee = getEmployee(request.employee_id)

  // Google Calendar event
  createCalendarEvent({
    summary: `[휴가] ${employee?.name ?? ''} - ${request.leave_type_name ?? ''}`,
    start: request.start_date,
    end: request.end_date,
    description: request.reason ?? '',
    calendarId: settings.google_calendar_id,
  }).then((eventId) => {
    if (eventId) updateLeaveRequestStatus(String(req.params.id), 'approved', reviewerId, note, eventId)
  }).catch(console.error)

  void sendDiscordNotification({ type: 'approved', request: updated, employeeName: employee?.name ?? '', reviewerNote: note }).catch(console.error)

  res.json(getLeaveRequest(String(req.params.id)))
})

router.post('/:id/reject', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const request = getLeaveRequest(String(req.params.id))
  if (!request) { res.status(404).json({ error: '신청을 찾을 수 없습니다.' }); return }
  if (request.status !== 'pending') { res.status(400).json({ error: '대기 중인 신청만 거절할 수 있습니다.' }); return }

  const { note } = req.body as { note?: string }
  const updated = updateLeaveRequestStatus(String(req.params.id), 'rejected', req.user!.id, note)
  const employee = getEmployee(request.employee_id)

  void sendDiscordNotification({ type: 'rejected', request: updated, employeeName: employee?.name ?? '', reviewerNote: note }).catch(console.error)

  res.json(updated)
})

router.post('/:id/cancel', async (req: Request, res: Response) => {
  const request = getLeaveRequest(String(req.params.id))
  if (!request) { res.status(404).json({ error: '신청을 찾을 수 없습니다.' }); return }
  if (!['pending', 'approved'].includes(request.status)) {
    res.status(400).json({ error: '취소할 수 없는 상태입니다.' }); return
  }

  // Only the requester or admin/manager can cancel
  if (req.user!.id !== request.employee_id && !['admin', 'manager'].includes(req.user!.role)) {
    res.status(403).json({ error: '본인의 신청만 취소할 수 있습니다.' }); return
  }

  const updated = getDb().transaction(() => {
    if (request.status === 'approved') {
      const year = new Date(request.start_date).getFullYear()
      restoreLeaveBalance(request.employee_id, request.leave_type_id, year, request.total_days)
    }
    return updateLeaveRequestStatus(String(req.params.id), 'cancelled')
  })()

  if (request.google_calendar_event_id) {
    const settings = getSettings()
    deleteCalendarEvent(settings.google_calendar_id, request.google_calendar_event_id).catch(console.error)
    clearCalendarEventId(String(req.params.id))
  }

  res.json(updated)
})

export default router
