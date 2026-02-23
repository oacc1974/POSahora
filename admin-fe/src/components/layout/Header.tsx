import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

export default function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">
          Panel de Administración
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">{user?.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
