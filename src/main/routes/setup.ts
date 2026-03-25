import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../database/data-source'
import { TenantEntity } from '../database/entities/Tenant'
import { EmployeeEntity } from '../database/entities/Employee'
import { LeaveBalanceEntity } from '../database/entities/LeaveBalance'
import { LeaveTypeEntity } from '../database/entities/LeaveType'
import { JWT_SECRET } from '../middleware/auth'

const router = Router()

// 초기 설정이 필요한지 확인 (인증 불필요)
router.get('/status', async (_req: Request, res: Response) => {
  const count = await AppDataSource.getRepository(TenantEntity).count()
  res.json({ needsSetup: count === 0 })
})

// 초기 설정 실행 (인증 불필요, 테넌트가 없을 때만 허용)
router.post('/init', async (req: Request, res: Response) => {
  const tenantCount = await AppDataSource.getRepository(TenantEntity).count()
  if (tenantCount > 0) {
    res.status(403).json({ error: '이미 설정이 완료되었습니다.' })
    return
  }

  const { companyName, name, email, password } = req.body as {
    companyName: string
    name: string
    email: string
    password: string
  }

  if (!name || !email || !password) {
    res.status(400).json({ error: '이름, 이메일, 비밀번호는 필수입니다.' })
    return
  }

  try {
    const result = await AppDataSource.transaction(async (manager) => {
      // 1. 테넌트 생성
      const tenant = manager.create(TenantEntity, {
        id: uuidv4(),
        name: companyName || name,
        slug: (companyName || name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'default',
        app_company_name: companyName || '',
      })
      await manager.save(tenant)

      // 2. 관리자 직원 생성
      const password_hash = await bcrypt.hash(password, 10)
      const employee = manager.create(EmployeeEntity, {
        id: uuidv4(),
        tenant_id: tenant.id,
        name,
        email: email.toLowerCase().trim(),
        department: null,
        role: 'admin',
        discord_tag: null,
        is_active: 1,
        password_hash,
      })
      await manager.save(employee)

      // 3. 기본 연차 종류 생성
      const leaveType = manager.create(LeaveTypeEntity, {
        id: uuidv4(),
        tenant_id: tenant.id,
        name: '연차',
        default_days: 15,
        carry_over_max: 0,
        color: '#8b5cf6',
      })
      await manager.save(leaveType)

      // 4. 현재 연도 잔여 일수 초기화
      const balance = manager.create(LeaveBalanceEntity, {
        id: uuidv4(),
        tenant_id: tenant.id,
        employee_id: employee.id,
        leave_type_id: leaveType.id,
        year: new Date().getFullYear(),
        allocated_days: 15,
        used_days: 0,
      })
      await manager.save(balance)

      return { tenant, employee }
    })

    const token = jwt.sign(
      { id: result.employee.id, email: result.employee.email, role: 'admin', tenant_id: result.tenant.id },
      JWT_SECRET,
      { expiresIn: '1y' }
    )

    res.status(201).json({
      token,
      user: { id: result.employee.id, name, email: result.employee.email, role: 'admin' },
    })
  } catch (e) {
    console.error('[Setup] init error:', e)
    res.status(500).json({ error: '설정 중 오류가 발생했습니다.' })
  }
})

export default router
