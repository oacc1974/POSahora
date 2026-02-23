import { useQuery } from '@tanstack/react-query'
import { Building2, FileText, CheckCircle, AlertCircle, Plug } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Empresas',
      value: data?.total_empresas || 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Documentos Total',
      value: data?.total_documentos || 0,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      title: 'Documentos Hoy',
      value: data?.documentos_hoy || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Integraciones Activas',
      value: data?.integraciones_activas || 0,
      icon: Plug,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Documentos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data?.por_estado || {}).map(([estado, count]) => (
                <div key={estado} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {estado === 'AUTORIZADO' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm">{estado}</span>
                  </div>
                  <span className="font-semibold">{count as number}</span>
                </div>
              ))}
              {Object.keys(data?.por_estado || {}).length === 0 && (
                <p className="text-sm text-gray-500">Sin documentos</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data?.por_tipo || {}).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center justify-between">
                  <span className="text-sm">{tipo}</span>
                  <span className="font-semibold">{count as number}</span>
                </div>
              ))}
              {Object.keys(data?.por_tipo || {}).length === 0 && (
                <p className="text-sm text-gray-500">Sin documentos</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
