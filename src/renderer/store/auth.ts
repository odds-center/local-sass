import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  department?: string | null
}

interface AuthStore {
  user: AuthUser | null
  setUser: (user: AuthUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user, token) => {
    localStorage.setItem('token', token)
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null })
  },
}))
