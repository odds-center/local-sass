import { IpcMain } from 'electron'
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
import { getSettings } from './settings'

export function registerLeaveRequestHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('leaveRequests:list', (_event, filters) => listLeaveRequests(filters))

  ipcMain.handle('leaveRequests:create', async (_event, data) => {
    const request = createLeaveRequest(data)
    const employee = getEmployee(data.employee_id)

    void sendDiscordNotification({
      type: 'new_request',
      request,
      employeeName: employee?.name ?? '알 수 없음',
    }).catch(console.error)

    return request
  })

  ipcMain.handle('leaveRequests:approve', async (_event, id, reviewerId, note) => {
    const request = getLeaveRequest(id)
    if (!request) throw new Error('Leave request not found')
    if (request.status !== 'pending') throw new Error('Only pending requests can be approved')

    const updated = getDb().transaction(() => {
      const year = new Date(request.start_date).getFullYear()
      deductLeaveBalance(request.employee_id, request.leave_type_id, year, request.total_days)
      return updateLeaveRequestStatus(id, 'approved', reviewerId, note)
    })()

    const settings = getSettings()
    const employee = getEmployee(request.employee_id)

    createCalendarEvent({
      summary: `[휴가] ${employee?.name ?? ''} - ${request.leave_type_name ?? ''}`,
      start: request.start_date,
      end: request.end_date,
      description: request.reason ?? '',
      calendarId: settings.google_calendar_id,
    }).then((calendarEventId) => {
      if (calendarEventId) {
        updateLeaveRequestStatus(id, 'approved', reviewerId, note, calendarEventId)
      }
    }).catch(console.error)

    void sendDiscordNotification({
      type: 'approved',
      request: updated,
      employeeName: employee?.name ?? '알 수 없음',
      reviewerNote: note,
    }).catch(console.error)

    return getLeaveRequest(id)!
  })

  ipcMain.handle('leaveRequests:reject', async (_event, id, reviewerId, note) => {
    const request = getLeaveRequest(id)
    if (!request) throw new Error('Leave request not found')
    if (request.status !== 'pending') throw new Error('Only pending requests can be rejected')

    const updated = updateLeaveRequestStatus(id, 'rejected', reviewerId, note)
    const employee = getEmployee(request.employee_id)

    void sendDiscordNotification({
      type: 'rejected',
      request: updated,
      employeeName: employee?.name ?? '알 수 없음',
      reviewerNote: note,
    }).catch(console.error)

    return updated
  })

  ipcMain.handle('leaveRequests:cancel', async (_event, id) => {
    const request = getLeaveRequest(id)
    if (!request) throw new Error('Leave request not found')
    if (!['pending', 'approved'].includes(request.status)) {
      throw new Error('Cannot cancel this request')
    }

    const updated = getDb().transaction(() => {
      if (request.status === 'approved') {
        const year = new Date(request.start_date).getFullYear()
        restoreLeaveBalance(request.employee_id, request.leave_type_id, year, request.total_days)
      }
      return updateLeaveRequestStatus(id, 'cancelled')
    })()

    if (request.google_calendar_event_id) {
      const settings = getSettings()
      deleteCalendarEvent(settings.google_calendar_id, request.google_calendar_event_id).catch(console.error)
      clearCalendarEventId(id)
    }

    return updated
  })
}
