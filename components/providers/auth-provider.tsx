'use client'

import { createContext, useContext } from 'react'

type AuthContextValue = {
  isLoggedIn: boolean
  userId: string | null
}

const AuthContext = createContext<AuthContextValue>({ isLoggedIn: false, userId: null })

export function AuthProvider({
  children,
  isLoggedIn,
  userId,
}: AuthContextValue & { children: React.ReactNode }) {
  return <AuthContext.Provider value={{ isLoggedIn, userId }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
