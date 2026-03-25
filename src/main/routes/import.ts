import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../database/data-source'
import { EmployeeEntity } from '../database/entities/Employee'
import { LeaveTypeEntity } from '../database/entities/LeaveType'
import { requireRole } from '../middleware/auth'
import { parseCsvTemplate, getCsvTemplate } from '../utils/flexHrParser'

const router = Router()

router.get('/template', (_req: Request, res: Response) => {
  const csv = getCsvTemplate()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="hr_import_template.csv"')
  res.send('\uFEFF' + csv)
})

router.post('/', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const { csvText, employeeId } = req.body as { csvText: string; employeeId?: string }
  const tenantId = req.user!.tenant_id

  if (!csvText?.trim()) { res.status(400).json({ error: 'CSV 데이터가 없습니다.' }); return }

  const { rows, skippedLines } = parseCsvTemplate(csvText)
  if (rows.length === 0) { res.status(400).json({ error: '파싱된 데이터가 없습니다.' }); return }

  let resolvedEmployeeId: string | null = employeeId ?? null
  let importedRequests = 0
  let importedBalances = 0
  let skipped = skippedLines

  await AppDataSource.transaction(async (manager) => {
    // Helper: get or create leave type for this tenant
    async function getOrCreateLeaveType(name: string): Promise<string> {
      const existing = await manager.findOneBy(LeaveTypeEntity, { tenant_id: tenantId, name })
      if (existing) return existing.id
      const lt = manager.create(LeaveTypeEntity, {
        id: uuidv4(), tenant_id: tenantId, name,
        default_days: 0, carry_over_max: 0, color: '#6b7280',
      })
      await manager.save(lt)
      return lt.id
    }

    for (const row of rows) {
      // Resolve employee
      if (!resolvedEmployeeId) {
        const emp = await manager.findOne(EmployeeEntity, {
          where: { tenant_id: tenantId, name: row.employeeName, is_active: 1 },
        })
        if (emp) {
          resolvedEmployeeId = emp.id
        } else {
          const newEmp = manager.create(EmployeeEntity, {
            id: uuidv4(), tenant_id: tenantId,
            name: row.employeeName,
            email: `${row.employeeName.replace(/\s+/g, '').toLowerCase()}@import.local`,
            department: null, role: 'employee', discord_tag: null, is_active: 1, password_hash: null,
          })
          await manager.save(newEmp)
          resolvedEmployeeId = newEmp.id
        }
      }

      if (row.kind === 'balance') {
        const year = parseInt(row.grantDate.slice(0, 4))
        const leaveTypeId = await getOrCreateLeaveType(row.leaveTypeName)
        await manager.query(
          `INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, allocated_days, used_days)
           VALUES ($1,$2,$3,$4,$5,$6,0)
           ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET allocated_days = $6`,
          [uuidv4(), tenantId, resolvedEmployeeId, leaveTypeId, year, row.allocatedDays]
        )
        importedBalances++
        continue
      }

      // kind === 'request'
      const leaveTypeId = await getOrCreateLeaveType(row.leaveTypeName)
      const year = parseInt(row.startDate.slice(0, 4))

      // Dedup check
      const dup = await manager.query(
        `SELECT id FROM leave_requests WHERE tenant_id=$1 AND employee_id=$2 AND start_date=$3 AND end_date=$4 AND total_days=$5 AND leave_type_id=$6 AND status=$7`,
        [tenantId, resolvedEmployeeId, row.startDate, row.endDate, row.totalDays, leaveTypeId, row.status]
      )
      if (dup.length > 0) { skipped++; continue }

      const now = new Date().toISOString()
      await manager.query(
        `INSERT INTO leave_requests (id, tenant_id, employee_id, leave_type_id, start_date, end_date, total_days, leave_unit, leave_hours, reason, status, reviewed_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11,$12,$12)`,
        [uuidv4(), tenantId, resolvedEmployeeId, leaveTypeId, row.startDate, row.endDate,
         row.totalDays, row.leaveUnit, row.leaveHours, row.status,
         row.status !== 'pending' ? now : null, now]
      )

      if (row.status === 'approved') {
        // Ensure balance row exists
        await manager.query(
          `INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, allocated_days, used_days)
           VALUES ($1,$2,$3,$4,$5,0,0) ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
          [uuidv4(), tenantId, resolvedEmployeeId, leaveTypeId, year]
        )
        await manager.query(
          `UPDATE leave_balances SET used_days = used_days + $1 WHERE employee_id=$2 AND leave_type_id=$3 AND year=$4 AND tenant_id=$5`,
          [row.totalDays, resolvedEmployeeId, leaveTypeId, year, tenantId]
        )
      }

      importedRequests++
    }
  })

  res.json({ ok: true, importedRequests, importedBalances, skipped, employeeId: resolvedEmployeeId })
})

export default router
