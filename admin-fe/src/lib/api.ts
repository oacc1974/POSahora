import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003/admin'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = useAuthStore.getState().refreshToken
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          
          const { access_token, refresh_token, user } = response.data
          
          useAuthStore.getState().login(
            user,
            access_token,
            refresh_token,
            response.data.permissions || []
          )
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      } else {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
