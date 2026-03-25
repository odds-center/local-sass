import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
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
import { api } from './lib/api'

function isLoggedIn(): boolean {
  return !!localStorage.getItem('token')
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Checks setup status on first load and redirects to /setup if needed
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
        </Route>
      </Routes>
    </HashRouter>
  )
}
