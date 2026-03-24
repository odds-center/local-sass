import { getDb } from '../db'
import { LeaveType } from '../../../shared/types'
import { v4 as uuidv4 } from 'uuid'

export function listLeaveTypes(): LeaveType[] {
  return getDb().prepare('SELECT * FROM leave_types ORDER BY name ASC').all() as LeaveType[]
}

export function getLeaveType(id: string): LeaveType | undefined {
  return getDb().prepare('SELECT * FROM leave_types WHERE id = ?').get(id) as LeaveType | undefined
}

export function createLeaveType(data: Omit<LeaveType, 'id'>): LeaveType {
  const id = uuidv4()
  getDb()
    .prepare(
      `INSERT INTO leave_types (id, name, default_days, carry_over_max, color)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, data.name, data.default_days, data.carry_over_max, data.color)
  return getLeaveType(id)!
}

export function updateLeaveType(id: string, data: Partial<Omit<LeaveType, 'id'>>): LeaveType {
  const fields = Object.entries(data)
    .map(([k]) => `${k} = ?`)
    .join(', ')
  const values = Object.values(data)
  getDb()
    .prepare(`UPDATE leave_types SET ${fields} WHERE id = ?`)
    .run(...values, id)
  return getLeaveType(id)!
}
