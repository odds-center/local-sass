import { getDb } from '../db'
import { Scrum, ScrumItem } from '../../../shared/types'
import { v4 as uuidv4 } from 'uuid'

function parseItems(raw: string): ScrumItem[] {
  try { return JSON.parse(raw) } catch { return [] }
}

const SELECT_WITH_JOIN = `
  SELECT s.*, e.name as employee_name
  FROM scrums s
  JOIN employees e ON e.id = s.employee_id
`

function toScrum(row: Record<string, unknown>): Scrum {
  return { ...row, items: parseItems(row.items as string) } as Scrum
}

export function getScrum(employeeId: string, date: string): Scrum | undefined {
  const row = getDb()
    .prepare(`${SELECT_WITH_JOIN} WHERE s.employee_id = ? AND s.date = ?`)
    .get(employeeId, date) as Record<string, unknown> | undefined
  return row ? toScrum(row) : undefined
}

export function upsertScrum(employeeId: string, date: string, items: ScrumItem[]): Scrum {
  const db = getDb()
  const now = new Date().toISOString()
  const itemsJson = JSON.stringify(items)

  const existing = db.prepare('SELECT id FROM scrums WHERE employee_id = ? AND date = ?').get(employeeId, date) as { id: string } | undefined

  if (existing) {
    db.prepare('UPDATE scrums SET items = ?, updated_at = ? WHERE id = ?').run(itemsJson, now, existing.id)
  } else {
    const id = uuidv4()
    db.prepare('INSERT INTO scrums (id, employee_id, date, items, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, employeeId, date, itemsJson, now, now)
  }

  return getScrum(employeeId, date)!
}

export function markScrumSent(employeeId: string, date: string): void {
  getDb()
    .prepare('UPDATE scrums SET sent_at = ? WHERE employee_id = ? AND date = ?')
    .run(new Date().toISOString(), employeeId, date)
}

export function listScrumsByDate(date: string): Scrum[] {
  const rows = getDb()
    .prepare(`${SELECT_WITH_JOIN} WHERE s.date = ? ORDER BY e.name`)
    .all(date) as Record<string, unknown>[]
  return rows.map(toScrum)
}

export function listMyRecentScrums(employeeId: string, limit = 10): Scrum[] {
  const rows = getDb()
    .prepare(`${SELECT_WITH_JOIN} WHERE s.employee_id = ? ORDER BY s.date DESC LIMIT ?`)
    .all(employeeId, limit) as Record<string, unknown>[]
  return rows.map(toScrum)
}
