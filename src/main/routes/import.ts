import { Router, Request, Response } from 'express'
import { getDb } from '../database/db'
import { createEmployee } from '../database/queries/employees'
import { upsertLeaveBalance, deductLeaveBalance } from '../database/queries/leave-balances'
import { requireRole } from '../middleware/auth'
import { parseCsvTemplate, getCsvTemplate } from '../utils/flexHrParser'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// GET /api/import/template  —  CSV 템플릿 다운로드
router.get('/template', (_req: Request, res: Response) => {
  const csv = getCsvTemplate()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="hr_import_template.csv"')
  res.send('\uFEFF' + csv)  // BOM for Excel UTF-8 compatibility
})

function getOrCreateLeaveType(name: string): string {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM leave_types WHERE name = ?').get(name) as { id: string } | undefined
  if (existing) return existing.id
  const id = uuidv4()
  db.prepare(
    'INSERT INTO leave_types (id, name, default_days, carry_over_max, color) VALUES (?, ?, 0, 0, ?)'
  ).run(id, name, '#6b7280')
  return id
}

// POST /api/import  —  CSV 텍스트 파싱 후 DB 저장 (admin/manager only)
// body: { csvText: string, employeeId?: string }
router.post('/', requireRole('admin', 'manager'), (req: Request, res: Response) => {
  const { csvText, employeeId } = req.body as { csvText: string; employeeId?: string }

  if (!csvText?.trim()) {
    res.status(400).json({ error: 'CSV 데이터가 없습니다.' })
    return
  }

  const { rows, skippedLines } = parseCsvTemplate(csvText)

  if (rows.length === 0) {
    res.status(400).json({ error: '파싱된 데이터가 없습니다. CSV 형식을 확인하세요.' })
    return
  }

  const db = getDb()
  let resolvedEmployeeId: string | null = employeeId ?? null
  let importedRequests = 0
  let importedBalances = 0
  let skipped = skippedLines

  db.transaction(() => {
    for (const row of rows) {
      // Resolve employee (all rows in one file should be the same employee)
      if (!resolvedEmployeeId) {
        const emp = db
          .prepare('SELECT id FROM employees WHERE name = ? AND is_active = 1')
          .get(row.employeeName) as { id: string } | undefined
        if (emp) {
          resolvedEmployeeId = emp.id
        } else {
          const newEmp = createEmployee({
            name: row.employeeName,
            email: `${row.employeeName.replace(/\s+/g, '').toLowerCase()}@import.local`,
            department: null,
            role: 'employee',
            discord_tag: null,
            is_active: 1,
          })
          resolvedEmployeeId = newEmp.id
        }
      }

      if (row.kind === 'balance') {
        const year = parseInt(row.grantDate.slice(0, 4))
        const leaveTypeId = getOrCreateLeaveType(row.leaveTypeName)
        upsertLeaveBalance(resolvedEmployeeId, leaveTypeId, year, row.allocatedDays)
        importedBalances++
        continue
      }

      // kind === 'request'
      const leaveTypeId = getOrCreateLeaveType(row.leaveTypeName)
      const year = parseInt(row.startDate.slice(0, 4))

      // Dedup: skip identical record
      const dup = db
        .prepare(
          'SELECT id FROM leave_requests WHERE employee_id=? AND start_date=? AND end_date=? AND total_days=? AND leave_type_id=? AND status=?'
        )
        .get(resolvedEmployeeId, row.startDate, row.endDate, row.totalDays, leaveTypeId, row.status)
      if (dup) { skipped++; continue }

      const id = uuidv4()
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO leave_requests
          (id, employee_id, leave_type_id, start_date, end_date, total_days, leave_unit, leave_hours,
           reason, status, reviewed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`
      ).run(
        id, resolvedEmployeeId, leaveTypeId,
        row.startDate, row.endDate, row.totalDays, row.leaveUnit, row.leaveHours,
        row.status,
        row.status !== 'pending' ? now : null,
        now, now
      )

      if (row.status === 'approved') {
        const existing = db
          .prepare('SELECT id FROM leave_balances WHERE employee_id=? AND leave_type_id=? AND year=?')
          .get(resolvedEmployeeId, leaveTypeId, year)
        if (!existing) upsertLeaveBalance(resolvedEmployeeId, leaveTypeId, year, 0)
        deductLeaveBalance(resolvedEmployeeId, leaveTypeId, year, row.totalDays)
      }

      importedRequests++
    }
  })()

  res.json({ ok: true, importedRequests, importedBalances, skipped, employeeId: resolvedEmployeeId })
})

export default router
