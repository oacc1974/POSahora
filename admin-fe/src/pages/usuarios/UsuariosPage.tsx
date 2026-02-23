import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

interface UserData {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  empresas: string[]
}

export default function UsuariosPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role: 'operador',
  })

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/users/roles')
      return response.data
    },
  })

  const createUserMutation = useMutation({
    mutationFn: (data: typeof newUser) => api.post('/users', data),
    onSuccess: () => {
      toast({ title: 'Usuario creado correctamente' })
      setShowCreate(false)
      setNewUser({ email: '', username: '', password: '', full_name: '', role: 'operador' })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al crear usuario',
      })
    },
  })

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.put(`/users/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.username || !newUser.password || !newUser.full_name) {
      toast({ variant: 'destructive', title: 'Complete todos los campos' })
      return
    }
    createUserMutation.mutate(newUser)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700'
      case 'operador': return 'bg-blue-100 text-blue-700'
      case 'reporteria': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500">Gestiona los usuarios del sistema</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users?.map((user: UserData) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                  
                  <Button
                    variant={user.is_active ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => toggleUserMutation.mutate({ id: user.id, is_active: !user.is_active })}
                  >
                    {user.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
                
                {user.empresas.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {user.empresas.length} empresa(s) asignada(s)
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Nuevo Usuario</h2>
            
            <div className="space-y-4">
              <div>
                <Label>Nombre Completo *</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Username *</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Contraseña *</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Rol *</Label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {roles?.map((role: any) => (
                    <option key={role.name} value={role.name}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Usuario
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
