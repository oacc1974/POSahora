import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Building2, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import api from '@/lib/api'
import CreateEmpresaDialog from './CreateEmpresaDialog'

interface Empresa {
  tenant_id: string
  ruc: string
  razon_social: string
  nombre_comercial?: string
  ambiente: string
  has_certificate: boolean
  certificate_expires?: string
}

export default function EmpresasPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['empresas', search],
    queryFn: async () => {
      const params = search ? { search } : {}
      const response = await api.get('/empresas', { params })
      return response.data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500">Gestiona las empresas registradas</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Empresa
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por RUC o razón social..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.empresas?.map((empresa: Empresa) => (
            <Link key={empresa.tenant_id} to={`/empresas/${empresa.tenant_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 line-clamp-1">
                          {empresa.razon_social}
                        </h3>
                        <p className="text-sm text-gray-500">{empresa.ruc}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      empresa.ambiente === 'produccion' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {empresa.ambiente}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      {empresa.has_certificate ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-gray-500">
                        {empresa.has_certificate ? 'Certificado OK' : 'Sin certificado'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          
          {data?.empresas?.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Sin empresas</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza creando una nueva empresa
              </p>
            </div>
          )}
        </div>
      )}

      <CreateEmpresaDialog 
        open={showCreate} 
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          refetch()
        }}
      />
    </div>
  )
}
