export type EmployeeRole = 'employee' | 'manager' | 'admin'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type LeaveUnit = 'day' | 'half_am' | 'half_pm' | 'hour'
export type ChannelType = 'leave_management' | 'scrum'
export type WebhookType = 'discord' | 'slack' | 'teams' | 'custom'

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

export interface ChannelConfig {
  webhook_url?: string
  webhook_type?: WebhookType
  google_calendar_id?: string
}

export interface Channel {
  id: string
  tenant_id: string
  name: string
  type: ChannelType
  config: ChannelConfig
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  app_company_name: string
  google_client_id: string
  google_client_secret: string
  google_refresh_token: string
  google_calendar_id: string
  host_ips: string[]
}

/** @deprecated use TenantSettings + Channel */
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
