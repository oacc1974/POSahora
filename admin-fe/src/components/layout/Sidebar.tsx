import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Plug,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
  { name: 'Empresas', href: '/empresas', icon: Building2, permission: 'empresas:read' },
  { name: 'Documentos', href: '/documentos', icon: FileText, permission: 'documents:read' },
  { name: 'Usuarios', href: '/usuarios', icon: Users, permission: 'users:read' },
  { name: 'Integraciones', href: '/integraciones', icon: Plug, permission: 'integrations:read' },
]

export default function Sidebar() {
  const location = useLocation()
  const hasPermission = useAuthStore((state) => state.hasPermission)

  return (
    <div className="flex flex-col w-64 bg-gray-900">
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <span className="text-white text-xl font-bold">Admin FE</span>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href)
          const canAccess = hasPermission(item.permission)
          
          if (!canAccess) return null
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400">Facturación Electrónica</p>
        <p className="text-xs text-gray-500">v1.0.0</p>
      </div>
    </div>
  )
}
