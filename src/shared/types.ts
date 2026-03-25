export type EmployeeRole = 'employee' | 'manager' | 'admin'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type LeaveUnit = 'day' | 'half_am' | 'half_pm' | 'hour'

export interface Employee {
  id: string
  name: string
  email: string
  department: string | null
  role: EmployeeRole
  discord_tag: string | null
  is_active: 1 | 0
  created_at: string
}

export interface LeaveType {
  id: string
  name: string
  default_days: number
  carry_over_max: number
  color: string
}

export interface LeaveBalance {
  id: string
  employee_id: string
  leave_type_id: string
  year: number
  allocated_days: number
  used_days: number
  employee_name?: string
  leave_type_name?: string
  leave_type_color?: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  leave_unit: LeaveUnit
  leave_hours: number | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  status: LeaveStatus
  reviewed_by: string | null
  reviewed_at: string | null
  reviewer_note: string | null
  google_calendar_event_id: string | null
  created_at: string
  updated_at: string
  employee_name?: string
  employee_email?: string
  leave_type_name?: string
  leave_type_color?: string
  reviewer_name?: string
}

export interface AppSettings {
  discord_webhook_url: string
  scrum_webhook_url: string
  google_client_id: string
  google_client_secret: string
  google_refresh_token: string
  google_calendar_id: string
  app_company_name: string
  current_user_id: string
}

export interface ScrumItem {
  text: string
  done: boolean
}

export interface Scrum {
  id: string
  employee_id: string
  date: string
  items: ScrumItem[]
  sent_at: string | null
  created_at: string
  updated_at: string
  employee_name?: string
}

export interface Api {
  employees: {
    list: () => Promise<Employee[]>
    create: (data: Omit<Employee, 'id' | 'created_at'>) => Promise<Employee>
    update: (id: string, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => Promise<Employee>
    deactivate: (id: string) => Promise<void>
    activate: (id: string) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  leaveRequests: {
    list: (filters?: LeaveRequestFilters) => Promise<LeaveRequest[]>
    create: (data: CreateLeaveRequestInput) => Promise<LeaveRequest>
    approve: (id: string, reviewerId: string, note?: string) => Promise<LeaveRequest>
    reject: (id: string, reviewerId: string, note?: string) => Promise<LeaveRequest>
    cancel: (id: string) => Promise<LeaveRequest>
  }
  leaveBalances: {
    listByYear: (year: number) => Promise<LeaveBalance[]>
    getByEmployee: (employeeId: string, year: number) => Promise<LeaveBalance[]>
    adjust: (id: string, allocated_days: number) => Promise<LeaveBalance>
  }
  leaveTypes: {
    list: () => Promise<LeaveType[]>
    create: (data: Omit<LeaveType, 'id'>) => Promise<LeaveType>
    update: (id: string, data: Partial<Omit<LeaveType, 'id'>>) => Promise<LeaveType>
  }
  settings: {
    get: () => Promise<AppSettings>
    set: (data: Partial<AppSettings>) => Promise<void>
    testDiscord: () => Promise<{ ok: boolean; error?: string }>
    connectGoogle: () => Promise<{ ok: boolean; error?: string }>
    listCalendars: () => Promise<{ id: string; summary: string }[]>
  }
}

export interface LeaveRequestFilters {
  status?: LeaveStatus
  employee_id?: string
  leave_type_id?: string
  year?: number
}

export interface CreateLeaveRequestInput {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  leave_unit: LeaveUnit
  leave_hours?: number
  start_time?: string
  end_time?: string
  reason?: string
}
