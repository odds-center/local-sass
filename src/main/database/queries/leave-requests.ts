import { getDb } from '../db'
import { LeaveRequest, LeaveRequestFilters, CreateLeaveRequestInput } from '../../../shared/types'
import { v4 as uuidv4 } from 'uuid'

const SELECT_WITH_JOINS = `
  SELECT lr.*,
    e.name as employee_name,
    e.email as employee_email,
    lt.name as leave_type_name,
    lt.color as leave_type_color,
    rv.name as reviewer_name
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  JOIN leave_types lt ON lt.id = lr.leave_type_id
  LEFT JOIN employees rv ON rv.id = lr.reviewed_by
`

export function listLeaveRequests(filters?: LeaveRequestFilters): LeaveRequest[] {
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters?.status) {
    conditions.push('lr.status = ?')
    params.push(filters.status)
  }
  if (filters?.employee_id) {
    conditions.push('lr.employee_id = ?')
    params.push(filters.employee_id)
  }
  if (filters?.leave_type_id) {
    conditions.push('lr.leave_type_id = ?')
    params.push(filters.leave_type_id)
  }
  if (filters?.year) {
    conditions.push("strftime('%Y', lr.start_date) = ?")
    params.push(String(filters.year))
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return getDb()
    .prepare(`${SELECT_WITH_JOINS} ${where} ORDER BY lr.created_at DESC`)
    .all(...params) as LeaveRequest[]
}

export function getLeaveRequest(id: string): LeaveRequest | undefined {
  return getDb()
    .prepare(`${SELECT_WITH_JOINS} WHERE lr.id = ?`)
    .get(id) as LeaveRequest | undefined
}

export function createLeaveRequest(data: CreateLeaveRequestInput): LeaveRequest {
  const id = uuidv4()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO leave_requests
        (id, employee_id, leave_type_id, start_date, end_date, total_days, leave_unit, leave_hours, start_time, end_time, reason, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
    .run(
      id,
      data.employee_id,
      data.leave_type_id,
      data.start_date,
      data.end_date,
      data.total_days,
      data.leave_unit ?? 'day',
      data.leave_hours ?? null,
      data.start_time ?? null,
      data.end_time ?? null,
      data.reason ?? null,
      now,
      now
    )
  return getLeaveRequest(id)!
}

export function updateLeaveRequestStatus(
  id: string,
  status: 'approved' | 'rejected' | 'cancelled',
  reviewedBy?: string,
  reviewerNote?: string,
  calendarEventId?: string
): LeaveRequest {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE leave_requests SET
         status = ?,
         reviewed_by = ?,
         reviewed_at = ?,
         reviewer_note = ?,
         google_calendar_event_id = COALESCE(?, google_calendar_event_id),
         updated_at = ?
       WHERE id = ?`
    )
    .run(status, reviewedBy ?? null, reviewedBy ? now : null, reviewerNote ?? null, calendarEventId ?? null, now, id)
  return getLeaveRequest(id)!
}

export function clearCalendarEventId(id: string): void {
  getDb()
    .prepare("UPDATE leave_requests SET google_calendar_event_id = NULL WHERE id = ?")
    .run(id)
}
