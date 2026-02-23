import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plug, CheckCircle, AlertCircle, Settings, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

export default function IntegracionesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('')
  const [showConfig, setShowConfig] = useState(false)
  const [loyverseConfig, setLoyverseConfig] = useState({
    api_key: '',
    sync_interval_minutes: 15,
    auto_sync: true,
  })

  const { data: empresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const response = await api.get('/empresas')
      return response.data.empresas
    },
  })

  const { data: loyverseStatus } = useQuery({
    queryKey: ['loyverse-status', selectedEmpresa],
    queryFn: async () => {
      if (!selectedEmpresa) return null
      const response = await api.get(`/integrations/loyverse/${selectedEmpresa}/status`)
      return response.data
    },
    enabled: !!selectedEmpresa,
  })

  const configureLoyverseMutation = useMutation({
    mutationFn: () => api.post(`/integrations/loyverse/${selectedEmpresa}`, loyverseConfig),
    onSuccess: () => {
      toast({ title: 'Integración configurada correctamente' })
      setShowConfig(false)
      queryClient.invalidateQueries({ queryKey: ['loyverse-status', selectedEmpresa] })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al configurar integración',
      })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post(`/integrations/loyverse/${selectedEmpresa}/sync`),
    onSuccess: (response) => {
      toast({
        title: 'Sincronización completada',
        description: response.data.message,
      })
      queryClient.invalidateQueries({ queryKey: ['loyverse-status', selectedEmpresa] })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error en sincronización',
      })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
        <p className="text-gray-500">Conecta sistemas externos para sincronizar ventas</p>
      </div>

      <div className="max-w-xs">
        <Label>Seleccionar Empresa</Label>
        <select
          value={selectedEmpresa}
          onChange={(e) => setSelectedEmpresa(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
        >
          <option value="">Seleccione una empresa</option>
          {empresas?.map((emp: any) => (
            <option key={emp.tenant_id} value={emp.tenant_id}>
              {emp.razon_social}
            </option>
          ))}
        </select>
      </div>

      {selectedEmpresa && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Plug className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Loyverse POS</CardTitle>
                    <CardDescription>Sincroniza ventas desde Loyverse</CardDescription>
                  </div>
                </div>
                {loyverseStatus?.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loyverseStatus?.configured ? (
                <>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-700">Conectado</p>
                    <p className="text-xs text-green-600 mt-1">
                      Merchant: {loyverseStatus.merchant?.name}
                    </p>
                    {loyverseStatus.last_sync && (
                      <p className="text-xs text-green-600">
                        Última sync: {new Date(loyverseStatus.last_sync).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfig(true)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sincronizar Ahora
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Conecta tu cuenta de Loyverse para sincronizar ventas automáticamente.
                  </p>
                  <Button onClick={() => setShowConfig(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar Integración
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowConfig(false)} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Configurar Loyverse</h2>
            
            <div className="space-y-4">
              <div>
                <Label>API Key de Loyverse *</Label>
                <Input
                  type="password"
                  value={loyverseConfig.api_key}
                  onChange={(e) => setLoyverseConfig({ ...loyverseConfig, api_key: e.target.value })}
                  placeholder="Ingrese su API Key"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Obtenga su API Key en Loyverse Back Office → Configuración → API
                </p>
              </div>
              
              <div>
                <Label>Intervalo de sincronización (minutos)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={loyverseConfig.sync_interval_minutes}
                  onChange={(e) => setLoyverseConfig({ ...loyverseConfig, sync_interval_minutes: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto_sync"
                  checked={loyverseConfig.auto_sync}
                  onChange={(e) => setLoyverseConfig({ ...loyverseConfig, auto_sync: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="auto_sync">Sincronización automática</Label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowConfig(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => configureLoyverseMutation.mutate()}
                  disabled={configureLoyverseMutation.isPending || !loyverseConfig.api_key}
                >
                  {configureLoyverseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Configuración
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
