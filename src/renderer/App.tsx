import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import Layout from './components/Layout'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import LeaveRequests from './pages/LeaveRequests'
import NewLeaveRequest from './pages/NewLeaveRequest'
import LeaveDetail from './pages/LeaveDetail'
import LeaveBalances from './pages/LeaveBalances'
import Settings from './pages/Settings'
import Import from './pages/Import'
import Scrum from './pages/Scrum'
import Channels from './pages/Channels'
import LeaveTypes from './pages/LeaveTypes'
import { api } from './lib/api'

function isLoggedIn(): boolean {
  return !!localStorage.getItem('token')
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function SetupGuard() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    api.setup.status().then(({ needsSetup }) => {
      if (needsSetup) navigate('/setup', { replace: true })
      else setChecked(true)
    }).catch(() => setChecked(true))
  }, [navigate])

  if (!checked) return null
  return <Navigate to={isLoggedIn() ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<SetupGuard />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/leave-requests" element={<LeaveRequests />} />
            <Route path="/leave-requests/new" element={<NewLeaveRequest />} />
            <Route path="/leave-requests/:id" element={<LeaveDetail />} />
            <Route path="/leave-balances" element={<LeaveBalances />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/import" element={<Import />} />
            <Route path="/scrum" element={<Scrum />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/leave-types" element={<LeaveTypes />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: { background: '#18181b', border: '1px solid #3f3f46', color: '#f4f4f5' },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
