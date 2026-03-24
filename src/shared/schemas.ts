import { z } from 'zod'

export const employeeSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  email: z.string().email('올바른 이메일을 입력하세요'),
  department: z.string().optional(),
  role: z.enum(['employee', 'manager', 'admin']),
  discord_tag: z.string().optional(),
  is_active: z.union([z.literal(1), z.literal(0)]).default(1),
})

export const leaveRequestSchema = z.object({
  employee_id: z.string().min(1, '직원을 선택하세요'),
  leave_type_id: z.string().min(1, '휴가 종류를 선택하세요'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
  total_days: z.number().positive(),
  leave_unit: z.enum(['day', 'half_am', 'half_pm', 'hour']).default('day'),
  leave_hours: z.number().min(0.5).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().optional(),
})

export const leaveTypeSchema = z.object({
  name: z.string().min(1),
  default_days: z.number().int().positive(),
  carry_over_max: z.number().int().min(0).default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#8b5cf6'),
})

export const settingsSchema = z.object({
  discord_webhook_url: z.string().url().optional().or(z.literal('')),
  google_client_id: z.string().optional(),
  google_client_secret: z.string().optional(),
  google_refresh_token: z.string().optional(),
  google_calendar_id: z.string().optional(),
  app_company_name: z.string().optional(),
  current_user_id: z.string().optional(),
})

export type EmployeeFormData = z.infer<typeof employeeSchema>
export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>
export type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>
export type SettingsFormData = z.infer<typeof settingsSchema>
