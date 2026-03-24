import { getDb } from '../db'
import { Employee } from '../../../shared/types'
import { v4 as uuidv4 } from 'uuid'

export function listEmployees(): Employee[] {
  return getDb()
    .prepare('SELECT * FROM employees ORDER BY name ASC')
    .all() as Employee[]
}

export function getEmployee(id: string): Employee | undefined {
  return getDb().prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee | undefined
}

export function createEmployee(data: Omit<Employee, 'id' | 'created_at'>): Employee {
  const id = uuidv4()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO employees (id, name, email, department, role, discord_tag, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, data.name, data.email, data.department ?? null, data.role, data.discord_tag ?? null, data.is_active, now)
  return getEmployee(id)!
}

export function updateEmployee(id: string, data: Partial<Omit<Employee, 'id' | 'created_at'>>): Employee {
  const fields = Object.entries(data)
    .map(([k]) => `${k} = ?`)
    .join(', ')
  const values = Object.values(data)
  getDb()
    .prepare(`UPDATE employees SET ${fields} WHERE id = ?`)
    .run(...values, id)
  return getEmployee(id)!
}

export function deactivateEmployee(id: string): void {
  getDb().prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(id)
}

export function activateEmployee(id: string): void {
  getDb().prepare('UPDATE employees SET is_active = 1 WHERE id = ?').run(id)
}

export function deleteEmployee(id: string): void {
  const db = getDb()
  // FK 연결된 관련 데이터 먼저 삭제
  db.prepare('DELETE FROM leave_balances WHERE employee_id = ?').run(id)
  db.prepare('DELETE FROM leave_requests WHERE employee_id = ?').run(id)
  db.prepare('DELETE FROM employees WHERE id = ?').run(id)
}
