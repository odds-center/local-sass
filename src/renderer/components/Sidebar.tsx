import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart2,
  Upload,
  Settings,
  LogOut,
  Plus,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard',     label: '대시보드',    Icon: LayoutDashboard },
  { to: '/leave-requests',label: '휴가 신청',   Icon: CalendarDays },
  { to: '/employees',     label: '직원 관리',   Icon: Users },
  { to: '/leave-balances',label: '잔여 일수',   Icon: BarChart2 },
  { to: '/import',        label: '데이터 임포트', Icon: Upload },
  { to: '/settings',      label: '설정',        Icon: Settings },
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="w-52 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Drag region for macOS traffic lights */}
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Logo */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            HR
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100 leading-none">HR</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">휴가 관리 시스템</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-zinc-800 space-y-2">
        <NavLink
          to="/leave-requests/new"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          휴가 신청
        </NavLink>
        <button
          onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
          className="flex items-center justify-center gap-2 w-full py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <LogOut size={13} strokeWidth={1.75} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
