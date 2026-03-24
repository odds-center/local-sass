import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-full bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 pt-10">
        <Outlet />
      </main>
    </div>
  )
}
