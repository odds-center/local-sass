import { getDb } from '../db'
import { LeaveBalance } from '../../../shared/types'
import { v4 as uuidv4 } from 'uuid'

export function listLeaveBalancesByYear(year: number): LeaveBalance[] {
  return getDb()
    .prepare(
      `SELECT lb.*, e.name as employee_name, lt.name as leave_type_name, lt.color as leave_type_color
       FROM leave_balances lb
       JOIN employees e ON e.id = lb.employee_id
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.year = ?
       ORDER BY e.name, lt.name`
    )
    .all(year) as LeaveBalance[]
}

export function getLeaveBalancesByEmployee(employeeId: string, year: number): LeaveBalance[] {
  return getDb()
    .prepare(
      `SELECT lb.*, lt.name as leave_type_name, lt.color as leave_type_color
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.employee_id = ? AND lb.year = ?`
    )
    .all(employeeId, year) as LeaveBalance[]
}

export function upsertLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  allocatedDays: number
): LeaveBalance {
  const existing = getDb()
    .prepare(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?'
    )
    .get(employeeId, leaveTypeId, year) as LeaveBalance | undefined

  if (existing) {
    getDb()
      .prepare('UPDATE leave_balances SET allocated_days = ? WHERE id = ?')
      .run(allocatedDays, existing.id)
    return { ...existing, allocated_days: allocatedDays }
  }

  const id = uuidv4()
  getDb()
    .prepare(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, allocated_days, used_days)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
    .run(id, employeeId, leaveTypeId, year, allocatedDays)
  return getDb()
    .prepare('SELECT * FROM leave_balances WHERE id = ?')
    .get(id) as LeaveBalance
}

export function adjustLeaveBalance(id: string, allocatedDays: number): LeaveBalance {
  getDb()
    .prepare('UPDATE leave_balances SET allocated_days = ? WHERE id = ?')
    .run(allocatedDays, id)
  return getDb()
    .prepare('SELECT * FROM leave_balances WHERE id = ?')
    .get(id) as LeaveBalance
}

export function deductLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  days: number
): void {
  getDb()
    .prepare(
      `UPDATE leave_balances SET used_days = used_days + ?
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?`
    )
    .run(days, employeeId, leaveTypeId, year)
}

export function restoreLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  days: number
): void {
  getDb()
    .prepare(
      `UPDATE leave_balances SET used_days = MAX(0, used_days - ?)
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?`
    )
    .run(days, employeeId, leaveTypeId, year)
}

export function initBalancesForEmployee(employeeId: string, year: number): void {
  const leaveTypes = getDb()
    .prepare('SELECT * FROM leave_types')
    .all() as { id: string; default_days: number }[]

  for (const lt of leaveTypes) {
    upsertLeaveBalance(employeeId, lt.id, year, lt.default_days)
  }
}
