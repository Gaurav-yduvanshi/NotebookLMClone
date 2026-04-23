'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, logoutUser } from '@/lib/api'

interface User { _id: string; name: string; email: string; image: string }
type AuthMeResponse = User | { authData?: User }
type UserContextValue = {
  user: User | null
  logout: () => Promise<void>
}

const UserCtx = createContext<UserContextValue | null>(null)
export const useCurrentUser = () => useContext(UserCtx)

function normalizeUser(payload: AuthMeResponse): User | null {
  if (!payload || typeof payload !== 'object') return null
  if ('_id' in payload && payload._id) return payload as User
  if ('authData' in payload && payload.authData?._id) return payload.authData
  return null
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    authApi
      .get<AuthMeResponse>('/auth/me', {
      })
      .then(r => setUser(normalizeUser(r.data)))
      .catch(() => setUser(null))
  }, [])

  const logout = async () => {
    try {
      await logoutUser()
    } finally {
      setUser(null)
    }
  }

  return <UserCtx.Provider value={{ user, logout }}>{children}</UserCtx.Provider>
}
