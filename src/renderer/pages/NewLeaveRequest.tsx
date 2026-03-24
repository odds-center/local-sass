import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { leaveRequestSchema, LeaveRequestFormData } from '../../shared/schemas'
import { Employee, LeaveType, LeaveBalance, LeaveUnit } from '../../shared/types'
import { differenceInBusinessDays, parseISO, addDays } from 'date-fns'
import DatePicker from '../components/DatePicker'
import { api } from '../lib/api'

const UNIT_OPTIONS: { value: LeaveUnit; label: string; desc: string }[] = [
  { value: 'day',     label: '종일',    desc: '하루 또는 여러 날' },
  { value: 'half_am', label: '오전 반차', desc: '오전 09:00~13:00' },
  { value: 'half_pm', label: '오후 반차', desc: '오후 14:00~18:00' },
  { value: 'hour',    label: '시간 단위', desc: '시작~종료 시간 선택' },
]

// 07:00 ~ 22:00, 30분 단위
const TIME_SLOTS: string[] = []
for (let h = 7; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutesToHours(m: number) {
  return Math.round((m / 60) * 10) / 10
}

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'
const sel = inp

export default function NewLeaveRequest() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { leave_unit: 'day', total_days: 1 },
  })

  const startDate = watch('start_date')
  const endDate = watch('end_date')
  const leaveTypeId = watch('leave_type_id')
  const employeeId = watch('employee_id')
  const leaveUnit = watch('leave_unit')
  const startTime = watch('start_time')
  const endTime = watch('end_time')

  const isHalfDay = leaveUnit === 'half_am' || leaveUnit === 'half_pm'
  const isHourly = leaveUnit === 'hour'
  const isSingleDay = isHalfDay || isHourly

  // end time options: only slots after start_time
  const endTimeSlots = startTime
    ? TIME_SLOTS.filter((t) => timeToMinutes(t) > timeToMinutes(startTime))
    : TIME_SLOTS

  useEffect(() => {
    if (isHalfDay) {
      setValue('total_days', 0.5)
    } else if (isHourly && startTime && endTime) {
      const hours = minutesToHours(timeToMinutes(endTime) - timeToMinutes(startTime))
      setValue('leave_hours', hours)
      setValue('total_days', hours / 8)
    } else if (startDate && endDate && endDate >= startDate && leaveUnit === 'day') {
      const days = differenceInBusinessDays(addDays(parseISO(endDate), 1), parseISO(startDate))
      setValue('total_days', Math.max(1, days))
    }
  }, [startDate, endDate, leaveUnit, startTime, endTime, setValue, isHalfDay, isHourly])

  useEffect(() => {
    if (isSingleDay && startDate) setValue('end_date', startDate)
  }, [isSingleDay, startDate, setValue])

  useEffect(() => {
    if (employeeId) api.leaveBalances.getByEmployee(employeeId, new Date().getFullYear()).then(setBalances)
  }, [employeeId])

  useEffect(() => {
    Promise.all([api.employees.list(), api.leaveTypes.list(), api.auth.me()]).then(([emps, types, me]) => {
      setEmployees(emps.filter((e) => e.is_active))
      setLeaveTypes(types)
      setValue('employee_id', me.id)
    })
  }, [setValue])

  const selectedBalance = balances.find((b) => b.leave_type_id === leaveTypeId)
  const totalDays = watch('total_days') ?? 0
  const remaining = selectedBalance ? selectedBalance.allocated_days - selectedBalance.used_days - totalDays : null

  const onSubmit = async (data: LeaveRequestFormData) => {
    await api.leaveRequests.create(data)
    navigate('/leave-requests')
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"><ArrowLeft size={15} />뒤로</button>
        <h1 className="text-xl font-bold text-zinc-100">새 휴가 신청</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-5">

        <Field label="직원 *" error={errors.employee_id?.message}>
          <select {...register('employee_id')} className={sel}>
            <option value="">선택하세요</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>

        <Field label="휴가 종류 *" error={errors.leave_type_id?.message}>
          <select {...register('leave_type_id')} className={sel}>
            <option value="">선택하세요</option>
            {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        {/* Leave unit */}
        <Field label="휴가 단위 *">
          <div className="grid grid-cols-2 gap-2">
            {UNIT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  leaveUnit === opt.value
                    ? 'bg-violet-600/15 border-violet-500 text-violet-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                <input type="radio" className="hidden" value={opt.value} {...register('leave_unit')} />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-[10px] mt-0.5 opacity-60">{opt.desc}</span>
              </label>
            ))}
          </div>
        </Field>

        {/* Time range (hourly only) */}
        {isHourly && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작 시간 *">
                <Controller
                  name="start_time"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={sel}
                      onChange={(e) => {
                        field.onChange(e.target.value)
                        // end_time이 start_time보다 같거나 앞이면 초기화
                        if (endTime && timeToMinutes(endTime) <= timeToMinutes(e.target.value)) {
                          setValue('end_time', undefined)
                        }
                      }}
                    >
                      <option value="">시간 선택</option>
                      {TIME_SLOTS.slice(0, -1).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
                />
              </Field>
              <Field label="종료 시간 *">
                <Controller
                  name="end_time"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className={sel} disabled={!startTime}>
                      <option value="">시간 선택</option>
                      {endTimeSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
                />
              </Field>
            </div>
            {startTime && endTime && (
              <p className="text-xs text-zinc-500">
                {startTime} ~ {endTime} ={' '}
                <span className="text-zinc-300 font-medium">
                  {minutesToHours(timeToMinutes(endTime) - timeToMinutes(startTime))}시간
                </span>
              </p>
            )}
          </div>
        )}

        {/* Balance info */}
        {selectedBalance && (
          <div className="bg-violet-600/10 border border-violet-500/20 rounded-lg px-4 py-3 text-sm">
            <span className="text-violet-300">
              잔여 {selectedBalance.leave_type_name}: {selectedBalance.allocated_days - selectedBalance.used_days}일
            </span>
            {totalDays > 0 && remaining !== null && (
              <span className={`ml-2 font-semibold ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                → 신청 후 {remaining}일
              </span>
            )}
          </div>
        )}

        {/* Date picker */}
        {isSingleDay ? (
          <Field label="날짜 *" error={errors.start_date?.message}>
            <Controller
              name="start_date"
              control={control}
              render={({ field }) => (
                <DatePicker value={field.value ?? ''} onChange={field.onChange} placeholder="날짜를 선택하세요" />
              )}
            />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="시작일 *" error={errors.start_date?.message}>
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value ?? ''} onChange={field.onChange} placeholder="시작일" />
                )}
              />
            </Field>
            <Field label="종료일 *" error={errors.end_date?.message}>
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value ?? ''} onChange={(v) => { field.onChange(v); }} placeholder="종료일" />
                )}
              />
            </Field>
          </div>
        )}

        {leaveUnit === 'day' && totalDays > 0 && (
          <p className="text-xs text-zinc-500">영업일 기준 <span className="text-zinc-300 font-medium">{totalDays}일</span></p>
        )}

        <Field label="사유">
          <textarea {...register('reason')} className={`${inp} h-24 resize-none`} placeholder="사유를 입력하세요 (선택)" />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">취소</button>
          <button
            type="submit"
            disabled={isSubmitting || (remaining !== null && remaining < 0)}
            className="btn-primary"
          >
            {isSubmitting ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </form>
    </div>
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
