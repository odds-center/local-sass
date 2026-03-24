import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Props {
  value: string  // 'YYYY-MM-DD'
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function DatePicker({ value, onChange, placeholder = '날짜 선택', disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = value && isValid(parse(value, 'yyyy-MM-dd', new Date()))
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'))
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:border-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-40"
      >
        <span className={selected ? 'text-zinc-100' : 'text-zinc-500'}>
          {selected ? format(selected, 'yyyy년 M월 d일 (eee)', { locale: ko }) : placeholder}
        </span>
        <span className="text-zinc-500 text-xs ml-2">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ko}
            defaultMonth={selected ?? new Date()}
            weekStartsOn={0}
            classNames={{
              root: 'p-3',
              month: 'space-y-2',
              month_caption: 'flex items-center justify-between px-1 mb-2',
              caption_label: 'text-sm font-semibold text-zinc-200',
              nav: 'flex items-center gap-1',
              button_previous: 'w-7 h-7 flex items-center justify-center rounded-md text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors text-base',
              button_next: 'w-7 h-7 flex items-center justify-center rounded-md text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors text-base',
              month_grid: 'w-full',
              weekdays: 'flex',
              weekday: 'w-9 text-center text-[11px] font-medium text-zinc-600 pb-1',
              week: 'flex',
              day: 'w-9 h-9 flex items-center justify-center',
              day_button: 'w-8 h-8 flex items-center justify-center rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer focus:outline-none',
              selected: '[&>button]:bg-violet-600 [&>button]:text-white [&>button]:hover:bg-violet-700',
              today: '[&>button]:text-violet-400 [&>button]:font-bold',
              outside: '[&>button]:text-zinc-700',
              disabled: '[&>button]:opacity-30 [&>button]:cursor-not-allowed',
              hidden: 'invisible',
            }}
          />
        </div>
      )}
    </div>
  )
}
