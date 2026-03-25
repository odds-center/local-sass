import {
  Employee,
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  AppSettings,
  LeaveRequestFilters,
  CreateLeaveRequestInput,
  Scrum,
  ScrumItem,
} from '../../shared/types'

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requiresAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (requiresAuth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/#/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>('GET', path)
const post = <T>(path: string, body?: unknown, auth = true) => request<T>('POST', path, body, auth)
const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body)
const del = <T>(path: string) => request<T>('DELETE', path)

export const api = {
  setup: {
    status: () => get<{ needsSetup: boolean }>('/setup/status'),
    init: (data: {
      companyName: string
      name: string
      email: string
      password: string
      discordWebhookUrl?: string
    }) => post<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/setup/init', data, false
    ),
  },
  auth: {
    login: (email: string, password: string) =>
      post<{ token: string; user: Pick<Employee, 'id' | 'name' | 'email' | 'role' | 'department'> }>(
        '/auth/login',
        { email, password },
        false
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
    approve: (id: string, note?: string) =>
      post<LeaveRequest>(`/leave-requests/${id}/approve`, { note }),
    reject: (id: string, note?: string) =>
      post<LeaveRequest>(`/leave-requests/${id}/reject`, { note }),
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

  import: {
    downloadTemplate: () => {
      const content = [
        '이름,시작일,종료일,항목,사용일수,상태,부여일,부여시간',
        '# 아래 예시를 참고하여 작성하세요. # 으로 시작하는 줄은 무시됩니다.',
        '# [발생 행] 연차/월차 부여 — 시작일/종료일/사용일수/상태는 비워두세요.',
        '홍길동,,,연차발생,,,2026-01-01,120',
        '# [휴가 행] 부여일/부여시간은 비워두세요.',
        '홍길동,2026-03-10,2026-03-10,연차,1,승인완료,,',
        '홍길동,2026-02-13,2026-02-13,연차,0.5,승인완료,,',
        '홍길동,2026-01-20,2026-01-20,연차,1,휴가취소,,',
        '# 상태값: 승인완료 | 휴가취소 | 반려',
        '# 사용일수: 1일=1  반차=0.5',
        '# 부여시간: 시간 단위 (1일=8 시간, 15일=120 시간)',
      ].join('\n')

      const bom = '\uFEFF'
      const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hr_import_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
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
    get: () => get<AppSettings & { host_ips: string[] }>('/settings'),
    set: (data: Partial<AppSettings>) => put<{ ok: boolean }>('/settings', data),
    testDiscord: () => post<{ ok: boolean; error?: string }>('/settings/test-discord'),
    connectGoogle: () => post<{ ok: boolean; error?: string }>('/settings/connect-google'),
    listCalendars: () => get<{ id: string; summary: string }[]>('/settings/calendars'),
  },
}
