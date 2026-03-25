import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => api.auth.login(email, password),
    onSuccess: ({ token, user }) => {
      setUser(user, token)
      navigate('/dashboard')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="fixed top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-violet-600 rounded-xl items-center justify-center text-white font-bold text-lg mb-4">
            HR
          </div>
          <h1 className="text-xl font-bold text-zinc-100">HR</h1>
          <p className="text-sm text-zinc-500 mt-1">사내 휴가 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="inp"
              placeholder="hong@company.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="inp"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loginMutation.isPending} className="btn-primary w-full py-2.5 mt-2">
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
