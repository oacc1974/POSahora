import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  empresas: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  permissions: string[]
  
  login: (user: User, accessToken: string, refreshToken: string, permissions: string[]) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      permissions: [],

      login: (user, accessToken, refreshToken, permissions) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          permissions,
        })
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          permissions: [],
        })
      },

      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } })
        }
      },

      hasPermission: (permission) => {
        const permissions = get().permissions
        if (permissions.includes('*')) return true
        return permissions.includes(permission)
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
)
