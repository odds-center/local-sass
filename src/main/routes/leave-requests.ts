import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../database/data-source'
import { LeaveRequestEntity } from '../database/entities/LeaveRequest'
import { EmployeeEntity } from '../database/entities/Employee'
import { ChannelEntity } from '../database/entities/Channel'
import { TenantEntity } from '../database/entities/Tenant'
import { sendLeaveNotification } from '../integrations/discord'
import { createCalendarEvent, deleteCalendarEvent } from '../integrations/google-calendar'
import { requireRole } from '../middleware/auth'
import { LeaveRequest, LeaveRequestFilters } from '../../shared/types'

const router = Router()

const SELECT_WITH_JOINS = `
  SELECT lr.*,
    e.name as employee_name, e.email as employee_email,
    lt.name as leave_type_name, lt.color as leave_type_color,
    rv.name as reviewer_name
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  JOIN leave_types lt ON lt.id = lr.leave_type_id
  LEFT JOIN employees rv ON rv.id = lr.reviewed_by
`

router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const filters = req.query as LeaveRequestFilters & Record<string, unknown>

  const conds = ['lr.tenant_id = $1']
  const params: unknown[] = [tenantId]
  let n = 2

  if (filters.status) { conds.push(`lr.status = $${n++}`); params.push(filters.status) }
  if (filters.employee_id) { conds.push(`lr.employee_id = $${n++}`); params.push(filters.employee_id) }
  if (filters.leave_type_id) { conds.push(`lr.leave_type_id = $${n++}`); params.push(filters.leave_type_id) }
  if (filters.year) { conds.push(`EXTRACT(YEAR FROM lr.start_date::date) = $${n++}`); params.push(Number(filters.year)) }

  const rows = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE ${conds.join(' AND ')} ORDER BY lr.created_at DESC`,
    params
  )
  res.json(rows)
})

router.post('/', async (req: Request, res: Response) => {
  const data = req.body as {
    employee_id: string; leave_type_id: string; start_date: string; end_date: string
    total_days: number; leave_unit?: string; leave_hours?: number
    start_time?: string; end_time?: string; reason?: string
  }

  const tenantId = req.user!.tenant_id
  const id = uuidv4()

  await AppDataSource.getRepository(LeaveRequestEntity).save({
    id, tenant_id: tenantId,
    employee_id: data.employee_id,
    leave_type_id: data.leave_type_id,
    start_date: data.start_date, end_date: data.end_date,
    total_days: data.total_days,
    leave_unit: data.leave_unit ?? 'day',
    leave_hours: data.leave_hours ?? null,
    start_time: data.start_time ?? null, end_time: data.end_time ?? null,
    reason: data.reason ?? null,
    status: 'pending',
  })

  const [request] = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lr.id = $1 AND lr.tenant_id = $2`, [id, tenantId]
  ) as LeaveRequest[]

  // Notify leave_management channels
  const channels = await AppDataSource.getRepository(ChannelEntity).find({
    where: { tenant_id: tenantId, type: 'leave_management' },
  })
  const employee = await AppDataSource.getRepository(EmployeeEntity).findOneBy({ id: data.employee_id })
  for (const ch of channels) {
    sendLeaveNotification(ch.config, 'new_request', request, employee?.name ?? '').catch(console.error)
  }

  res.status(201).json(request)
})

router.post('/:id/approve', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { id } = req.params
  const tenantId = req.user!.tenant_id
  const [request] = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lr.id = $1 AND lr.tenant_id = $2`, [id, tenantId]
  ) as LeaveRequest[]

  if (!request) { res.status(404).json({ error: '신청을 찾을 수 없습니다.' }); return }
  if (request.status !== 'pending') { res.status(400).json({ error: '대기 중인 신청만 승인할 수 있습니다.' }); return }

  const { note } = req.body as { note?: string }
  const reviewerId = req.user!.id
  const year = new Date(request.start_date).getFullYear()

  await AppDataSource.transaction(async (manager) => {
    // Deduct balance
    await manager.query(
      `UPDATE leave_balances SET used_days = used_days + $1
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 AND tenant_id = $5`,
      [request.total_days, request.employee_id, request.leave_type_id, year, tenantId]
    )
    // Update status
    await manager.query(
      `UPDATE leave_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), reviewer_note = $2, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4`,
      [reviewerId, note ?? null, id, tenantId]
    )
  })

  const [updated] = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lr.id = $1 AND lr.tenant_id = $2`, [id, tenantId]
  ) as LeaveRequest[]

  const employee = await AppDataSource.getRepository(EmployeeEntity).findOneBy({ id: request.employee_id })
  const channels = await AppDataSource.getRepository(ChannelEntity).find({
    where: { tenant_id: tenantId, type: 'leave_management' },
  })

  // Google Calendar (async, non-blocking)
  const tenant = await AppDataSource.getRepository(TenantEntity).findOneBy({ id: tenantId })
  const calendarId = tenant?.google_calendar_id
  if (calendarId) {
    createCalendarEvent({
      tenantId, calendarId,
      summary: `[휴가] ${employee?.name ?? ''} - ${request.leave_type_name ?? ''}`,
      start: request.start_date, end: request.end_date, description: request.reason ?? '',
    }).then(async (eventId) => {
      if (eventId) {
        await AppDataSource.query(
          `UPDATE leave_requests SET google_calendar_event_id = $1 WHERE id = $2 AND tenant_id = $3`,
          [eventId, id, tenantId]
        )
      }
    }).catch(console.error)
  }

  for (const ch of channels) {
    sendLeaveNotification(ch.config, 'approved', updated, employee?.name ?? '', note).catch(console.error)
  }

  res.json(updated)
})

router.post('/:id/reject', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { id } = req.params
  const tenantId = req.user!.tenant_id
  const [request] = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lr.id = $1 AND lr.tenant_id = $2`, [id, tenantId]
  ) as LeaveRequest[]

  if (!request) { res.status(404).json({ error: '신청을 찾을 수 없습니다.' }); return }
  if (request.status !== 'pending') { res.status(400).json({ error: '대기 중인 신청만 거절할 수 있습니다.' }); return }

  const { note } = req.body as { note?: string }
  await AppDataSource.query(
    `UPDATE leave_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), reviewer_note = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4`,
    [req.user!.id, note ?? null, id, tenantId]
  )

  const [updated] = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lr.id = $1 AND lr.tenant_id = $2`, [id, tenantId]
  ) as LeaveRequest[]

  const employee = await AppDataSource.getRepository(EmployeeEntity).findOneBy({ id: request.employee_id })
  const channels = await AppDataSource.getRepository(ChannelEntity).find({
    where: { tenant_id: tenantId, type: 'leave_management' },
  })
  for (const ch of channels) {
    sendLeaveNotification(ch.config, 'rejected', updated, employee?.name ?? '', note).catch(console.error)
  }

  res.json(updated)
})

router.post('/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params
  const tenantId = req.user!.tenant_id
  const [request] = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lr.id = $1 AND lr.tenant_id = $2`, [id, tenantId]
  ) as LeaveRequest[]

  if (!request) { res.status(404).json({ error: '신청을 찾을 수 없습니다.' }); return }
  if (!['pending', 'approved'].includes(request.status)) {
    res.status(400).json({ error: '취소할 수 없는 상태입니다.' }); return
  }
  if (req.user!.id !== request.employee_id && !['admin', 'manager'].includes(req.user!.role)) {
    res.status(403).json({ error: '본인의 신청만 취소할 수 있습니다.' }); return
  }

  await AppDataSource.transaction(async (manager) => {
    if (request.status === 'approved') {
      const year = new Date(request.start_date).getFullYear()
      await manager.query(
        `UPDATE leave_balances SET used_days = GREATEST(0, used_days - $1)
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 AND tenant_id = $5`,
        [request.total_days, request.employee_id, request.leave_type_id, year, tenantId]
      )
    }
    await manager.query(
      `UPDATE leave_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )
  })

  if (request.google_calendar_event_id) {
    const tenant = await AppDataSource.getRepository(TenantEntity).findOneBy({ id: tenantId })
    const calId = tenant?.google_calendar_id
    if (calId) deleteCalendarEvent(tenantId, calId, request.google_calendar_event_id).catch(console.error)
    await AppDataSource.query(
      `UPDATE leave_requests SET google_calendar_event_id = NULL WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )
  }

  const [updated] = await AppDataSource.query(
    `${SELECT_WITH_JOINS} WHERE lr.id = $1 AND lr.tenant_id = $2`, [id, tenantId]
  ) as LeaveRequest[]
  res.json(updated)
})

export default router
