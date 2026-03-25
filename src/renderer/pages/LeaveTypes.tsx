import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LeaveType } from '../../shared/types'
import { api } from '../lib/api'
import { Plus, Pencil, Check, X } from 'lucide-react'

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

const PRESET_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
  '#10b981', '#f59e0b', '#ef4444', '#ec4899',
  '#6b7280', '#84cc16',
]

interface FormState {
  name: string
  default_days: number
  carry_over_max: number
  color: string
}

const defaultForm = (): FormState => ({
  name: '',
  default_days: 15,
  carry_over_max: 0,
  color: '#8b5cf6',
})

export default function LeaveTypes() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm())

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.leaveTypes.list(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['leave-types'] })

  const createMutation = useMutation({
    mutationFn: (data: Omit<LeaveType, 'id'>) => api.leaveTypes.create(data),
    onSuccess: () => { invalidate(); setCreating(false); setForm(defaultForm()); toast.success('추가되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<LeaveType, 'id'>> }) =>
      api.leaveTypes.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('저장되었습니다.') },
    onError: (err) => toast.error((err as Error).message),
  })

  const openEdit = (lt: LeaveType) => {
    setForm({ name: lt.name, default_days: lt.default_days, carry_over_max: lt.carry_over_max, color: lt.color })
    setEditingId(lt.id)
    setCreating(false)
  }

  const openCreate = () => {
    setForm(defaultForm())
    setCreating(true)
    setEditingId(null)
  }

  const saveCreate = () => {
    if (!form.name.trim()) return
    createMutation.mutate({ ...form, tenant_id: '' } as unknown as Omit<LeaveType, 'id'>)
  }

  const saveEdit = (id: string) => {
    if (!form.name.trim()) return
    updateMutation.mutate({ id, data: form })
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">휴가 종류</h1>
          <p className="text-xs text-zinc-500 mt-0.5">직원 추가 시 여기 설정한 종류와 기본 일수로 잔여일수가 초기화됩니다.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} />추가
        </button>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Create row */}
        {creating && (
          <div className="border-b border-zinc-800 p-4">
            <LeaveTypeForm
              form={form}
              setForm={setForm}
              onSave={saveCreate}
              onCancel={() => setCreating(false)}
              saving={createMutation.isPending}
              inp={inp}
            />
          </div>
        )}

        {leaveTypes.length === 0 && !creating ? (
          <p className="text-center py-12 text-zinc-600 text-sm">등록된 휴가 종류가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['종류', '기본 일수', '이월 최대', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {leaveTypes.map((lt) =>
                editingId === lt.id ? (
                  <tr key={lt.id} className="bg-zinc-800/60">
                    <td colSpan={4} className="px-4 py-4">
                      <LeaveTypeForm
                        form={form}
                        setForm={setForm}
                        onSave={() => saveEdit(lt.id)}
                        onCancel={() => setEditingId(null)}
                        saving={updateMutation.isPending}
                        inp={inp}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={lt.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
                        <span className="font-medium text-zinc-200">{lt.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{lt.default_days}일</td>
                    <td className="px-4 py-3 text-zinc-400">{lt.carry_over_max}일</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(lt)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors ml-auto">
                        <Pencil size={12} />수정
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function LeaveTypeForm({
  form, setForm, onSave, onCancel, saving, inp,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
  inp: string
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">이름 *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inp}
            placeholder="연차"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">기본 일수</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={form.default_days}
            onChange={(e) => setForm((f) => ({ ...f, default_days: Number(e.target.value) }))}
            className={inp}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">이월 최대</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={form.carry_over_max}
            onChange={(e) => setForm((f) => ({ ...f, carry_over_max: Number(e.target.value) }))}
            className={inp}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">색상</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={`w-6 h-6 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-800 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            title="직접 선택"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving || !form.name.trim()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-40">
          <Check size={12} />{saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
          <X size={12} />취소
        </button>
      </div>
    </div>
  )
}
