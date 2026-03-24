/**
 * 공통 UI 컴포넌트
 * 모든 페이지에서 일관된 스타일을 위해 이 파일의 컴포넌트를 사용하세요.
 */

export const inp =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

export const inpSm =
  'bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

// ── 레이아웃 ─────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-zinc-300 mb-4">{children}</h2>
}

// ── 폼 ─────────────────────────────────────────────────

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}
        {hint && <span className="ml-1.5 text-zinc-600 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

// ── 버튼 ─────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md'

const btnBase = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const btnVariants: Record<ButtonVariant, string> = {
  primary:   'bg-violet-600 hover:bg-violet-700 text-white',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
  danger:    'bg-red-600/80 hover:bg-red-600 text-white',
  ghost:     'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
}
const btnSizes: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ── 피드백 ───────────────────────────────────────────────

export function ErrorAlert({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
      {message}
    </div>
  )
}

export function SuccessAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-300 space-y-1">
      {children}
    </div>
  )
}

export function InfoAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-sm text-violet-300 space-y-1">
      {children}
    </div>
  )
}

export function Toast({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="bg-violet-500/10 border border-violet-500/30 text-violet-300 text-sm px-4 py-3 rounded-lg">
      {message}
    </div>
  )
}

// ── 테이블 ───────────────────────────────────────────────

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
      {children}
    </th>
  )
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>
}
