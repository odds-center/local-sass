import axios from 'axios'
import {
  Employee,
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  TenantSettings,
  Channel,
  ChannelConfig,
  ChannelType,
  LeaveRequestFilters,
  CreateLeaveRequestInput,
  Scrum,
  ScrumItem,
} from '../../shared/types'

const client = axios.create({ baseURL: '/api' })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/#/login'
    }
    const message = error.response?.data?.error ?? error.message
    return Promise.reject(new Error(message))
  }
)

const get = <T>(path: string) => client.get<T>(path).then((r) => r.data)
const post = <T>(path: string, body?: unknown) => client.post<T>(path, body).then((r) => r.data)
const put = <T>(path: string, body?: unknown) => client.put<T>(path, body).then((r) => r.data)
const patch = <T>(path: string, body?: unknown) => client.patch<T>(path, body).then((r) => r.data)
const del = <T>(path: string) => client.delete<T>(path).then((r) => r.data)

export const api = {
  setup: {
    status: () => get<{ needsSetup: boolean }>('/setup/status'),
    init: (data: { companyName: string; name: string; email: string; password: string }) =>
      post<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
        '/setup/init', data
      ),
  },

  auth: {
    login: (email: string, password: string) =>
      post<{ token: string; user: Pick<Employee, 'id' | 'name' | 'email' | 'role' | 'department'> }>(
        '/auth/login', { email, password }
      ),
    me: () => get<Pick<Employee, 'id' | 'name' | 'email' | 'role' | 'department'>>('/auth/me'),
  },

  employees: {
    list: () => get<Employee[]>('/employees'),
    create: (data: Omit<Employee, 'id' | 'created_at'> & { password: string }) =>
      post<Employee>('/employees', data),
    update: (id: string, data: Partial<Omit<Employee, 'id' | 'created_at'>> & { password?: string }) =>
      put<Employee>(`/employees/${id}`, data),
    deactivate: (id: string) => del<void>(`/employees/${id}/deactivate`),
    activate: (id: string) => patch<void>(`/employees/${id}/activate`),
    delete: (id: string) => del<void>(`/employees/${id}`),
  },

  leaveRequests: {
    list: (filters?: LeaveRequestFilters) => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.employee_id) params.set('employee_id', filters.employee_id)
      if (filters?.leave_type_id) params.set('leave_type_id', filters.leave_type_id)
      if (filters?.year) params.set('year', String(filters.year))
      const qs = params.toString()
      return get<LeaveRequest[]>(`/leave-requests${qs ? `?${qs}` : ''}`)
    },
    create: (data: CreateLeaveRequestInput) => post<LeaveRequest>('/leave-requests', data),
    approve: (id: string, note?: string) => post<LeaveRequest>(`/leave-requests/${id}/approve`, { note }),
    reject: (id: string, note?: string) => post<LeaveRequest>(`/leave-requests/${id}/reject`, { note }),
    cancel: (id: string) => post<LeaveRequest>(`/leave-requests/${id}/cancel`),
  },

  leaveBalances: {
    listByYear: (year: number) => get<LeaveBalance[]>(`/leave-balances/${year}`),
    getByEmployee: (employeeId: string, year: number) =>
      get<LeaveBalance[]>(`/leave-balances/employee/${employeeId}/${year}`),
    adjust: (id: string, allocated_days: number) =>
      put<LeaveBalance>(`/leave-balances/${id}`, { allocated_days }),
  },

  leaveTypes: {
    list: () => get<LeaveType[]>('/leave-types'),
    create: (data: Omit<LeaveType, 'id'>) => post<LeaveType>('/leave-types', data),
    update: (id: string, data: Partial<Omit<LeaveType, 'id'>>) =>
      put<LeaveType>(`/leave-types/${id}`, data),
  },

  channels: {
    list: () => get<Channel[]>('/channels'),
    create: (data: { name: string; type: ChannelType; config?: ChannelConfig }) =>
      post<Channel>('/channels', data),
    update: (id: string, data: { name?: string; config?: ChannelConfig }) =>
      put<Channel>(`/channels/${id}`, data),
    delete: (id: string) => del<void>(`/channels/${id}`),
    testWebhook: (id: string) => post<{ ok: boolean; error?: string }>(`/channels/${id}/test-webhook`),
  },

  import: {
    downloadTemplate: () => {
      const content = [
        '이름,시작일,종료일,항목,사용일수,상태,부여일,부여시간',
        '# 아래 예시를 참고하여 작성하세요. # 으로 시작하는 줄은 무시됩니다.',
        '홍길동,,,연차발생,,,2026-01-01,120',
        '홍길동,2026-03-10,2026-03-10,연차,1,승인완료,,',
        '홍길동,2026-02-13,2026-02-13,연차,0.5,승인완료,,',
        '# 상태값: 승인완료 | 휴가취소 | 반려',
        '# 사용일수: 1일=1  반차=0.5',
        '# 부여시간: 시간 단위 (15일=120 시간)',
      ].join('\n')
      const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'hr_import_template.csv'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    },
    upload: (csvText: string, employeeId?: string) =>
      post<{ ok: boolean; importedRequests: number; importedBalances: number; skipped: number; employeeId: string }>(
        '/import', { csvText, employeeId }
      ),
  },

  scrums: {
    getMe: (date: string) => get<Scrum | null>(`/scrums/me?date=${date}`),
    recent: () => get<Scrum[]>('/scrums/recent'),
    team: (date: string) => get<Scrum[]>(`/scrums/team?date=${date}`),
    save: (date: string, items: ScrumItem[]) => put<Scrum>(`/scrums/me?date=${date}`, { items }),
    send: (date: string) => post<{ ok: boolean }>(`/scrums/me/send?date=${date}`),
    sendAll: (date: string) => post<{ ok: boolean; sent: number }>(`/scrums/send-all?date=${date}`),
  },

  settings: {
    get: () => get<TenantSettings>('/settings'),
    set: (data: Partial<TenantSettings>) => put<{ ok: boolean }>('/settings', data),
    testDiscord: (webhook_url: string) =>
      post<{ ok: boolean; error?: string }>('/settings/test-discord', { webhook_url }),
    connectGoogle: () => post<{ ok: boolean; error?: string }>('/settings/connect-google'),
    listCalendars: () => get<{ id: string; summary: string }[]>('/settings/calendars'),
  },
}
