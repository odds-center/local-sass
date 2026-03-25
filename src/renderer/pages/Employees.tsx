import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Employee, EmployeeRole } from '../../shared/types'
import Modal from '../components/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { useState } from 'react'
import { Plus, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react'

const employeeFormSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  email: z.string().email('올바른 이메일을 입력하세요'),
  department: z.string().optional(),
  role: z.enum(['employee', 'manager', 'admin']),
  discord_tag: z.string().optional(),
  password: z.string().optional(),
})
type EmployeeFormData = z.infer<typeof employeeFormSchema>

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

export default function Employees() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees.list(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['employees'] })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.employees.deactivate(id),
    onSuccess: () => { invalidate(); toast.success('비활성화되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.employees.activate(id),
    onSuccess: () => { invalidate(); toast.success('활성화되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.employees.delete(id),
    onSuccess: () => { invalidate(); toast.success('삭제되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (e: Employee) => { setEditing(e); setModalOpen(true) }

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`"${name}" 직원을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">직원 관리</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5"><Plus size={15} strokeWidth={2.5} />직원 추가</button>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {employees.length === 0 ? (
          <p className="text-center py-12 text-zinc-600 text-sm">등록된 직원이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['이름', '이메일', '부서', '권한', '상태', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-200">{emp.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{emp.email}</td>
                  <td className="px-4 py-3 text-zinc-500">{emp.department ?? '-'}</td>
                  <td className="px-4 py-3"><RoleBadge role={emp.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${emp.is_active ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {emp.is_active ? '재직 중' : '퇴직'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => openEdit(emp)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"><Pencil size={12} />수정</button>
                      {emp.is_active === 1 ? (
                        <button onClick={() => deactivateMutation.mutate(emp.id)} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"><UserX size={12} />비활성</button>
                      ) : (
                        <button onClick={() => activateMutation.mutate(emp.id)} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"><UserCheck size={12} />활성화</button>
                      )}
                      <button onClick={() => handleDelete(emp.id, emp.name)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors"><Trash2 size={12} />삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EmployeeModal
        open={modalOpen}
        employee={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); invalidate() }}
        inp={inp}
      />
    </div>
  )
}

function RoleBadge({ role }: { role: EmployeeRole }) {
  const config = {
    admin:    { label: '관리자', className: 'bg-violet-500/15 text-violet-400 border border-violet-500/30' },
    manager:  { label: '매니저', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
    employee: { label: '직원',   className: 'bg-zinc-700/50 text-zinc-400 border border-zinc-700' },
  }
  const { label, className } = config[role]
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${className}`}>{label}</span>
}

function EmployeeModal({ open, employee, onClose, onSaved, inp }: {
  open: boolean; employee: Employee | null; onClose: () => void; onSaved: () => void; inp: string
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
  })

  useEffect(() => {
    if (!open) return
    reset(employee
      ? { ...employee, department: employee.department ?? undefined, discord_tag: employee.discord_tag ?? undefined, password: '' }
      : { name: '', email: '', department: '', discord_tag: '', role: 'employee', password: '' }
    )
  }, [open, employee, reset])

  const onSubmit = async (data: EmployeeFormData) => {
    const payload = { ...data, department: data.department ?? null, discord_tag: data.discord_tag ?? null }
    if (employee) {
      await api.employees.update(employee.id, payload)
      toast.success('저장되었습니다.')
    } else {
      if (!data.password) return
      await api.employees.create({ ...payload, is_active: 1, password: data.password })
      toast.success('직원이 추가되었습니다.')
    }
    onSaved()
  }

  return (
    <Modal open={open} title={employee ? '직원 수정' : '직원 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="이름 *" error={errors.name?.message}>
          <input {...register('name')} className={inp} placeholder="홍길동" />
        </Field>
        <Field label="이메일 *" error={errors.email?.message}>
          <input {...register('email')} type="email" className={inp} placeholder="hong@company.com" />
        </Field>
        <Field label="부서">
          <input {...register('department')} className={inp} placeholder="개발팀" />
        </Field>
        <Field label="Discord 사용자명">
          <input {...register('discord_tag')} className={inp} placeholder="username" />
        </Field>
        <Field label="권한">
          <select {...register('role')} className={inp}>
            <option value="employee">직원</option>
            <option value="manager">매니저</option>
            <option value="admin">관리자</option>
          </select>
        </Field>
        <Field label={employee ? '비밀번호 (변경 시만 입력)' : '비밀번호 *'} error={errors.password?.message}>
          <input {...register('password')} type="password" className={inp} placeholder="••••••••" />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">취소</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-40">
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
