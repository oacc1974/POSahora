import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, FileText, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

export default function DiagnosticoPage() {
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('')

  const { data: empresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const response = await api.get('/empresas')
      return response.data.empresas
    },
  })

  const { data: syncLogs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['sync-logs', selectedEmpresa],
    queryFn: async () => {
      if (!selectedEmpresa) return null
      const response = await api.get(`/diagnostico/sync-logs/${selectedEmpresa}`)
      return response.data
    },
    enabled: !!selectedEmpresa,
  })

  const { data: dbStats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['db-stats', selectedEmpresa],
    queryFn: async () => {
      if (!selectedEmpresa) return null
      const response = await api.get(`/diagnostico/stats/${selectedEmpresa}`)
      return response.data
    },
    enabled: !!selectedEmpresa,
  })

  const { data: recentDocs, isLoading: loadingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['recent-docs', selectedEmpresa],
    queryFn: async () => {
      if (!selectedEmpresa) return null
      const response = await api.get(`/diagnostico/recent-documents/${selectedEmpresa}`)
      return response.data
    },
    enabled: !!selectedEmpresa,
  })

  const refreshAll = () => {
    refetchLogs()
    refetchStats()
    refetchDocs()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnóstico</h1>
          <p className="text-gray-500">Revisa el estado de sincronización y errores</p>
        </div>
        {selectedEmpresa && (
          <Button onClick={refreshAll} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        )}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estadísticas de BD */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estado de Base de Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : dbStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Documentos:</span>
                    <span className="font-semibold">{dbStats.total_documents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Autorizados:</span>
                    <span className="font-semibold text-green-600">{dbStats.authorized}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pendientes:</span>
                    <span className="font-semibold text-yellow-600">{dbStats.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rechazados:</span>
                    <span className="font-semibold text-red-600">{dbStats.rejected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Con Error:</span>
                    <span className="font-semibold text-red-600">{dbStats.error}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-xs text-gray-500">Tenant ID: {selectedEmpresa}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Sin datos</p>
              )}
            </CardContent>
          </Card>

          {/* Logs de Sincronización */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Últimas Sincronizaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ) : syncLogs?.logs?.length > 0 ? (
                <div className="space-y-3">
                  {syncLogs.logs.map((log: any) => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {log.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : log.status === 'failed' ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                          )}
                          <span className="text-sm font-medium capitalize">{log.status}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Procesados: {log.records_processed} | Exitosos: {log.records_success} | Fallidos: {log.records_failed}</div>
                        {log.errors?.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-red-700">
                            <strong>Errores:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {log.errors.slice(0, 3).map((err: any, i: number) => (
                                <li key={i} className="truncate">
                                  Recibo {err.receipt_number}: {err.error}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No hay sincronizaciones registradas</p>
              )}
            </CardContent>
          </Card>

          {/* Documentos Recientes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : recentDocs?.documents?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Número</th>
                        <th className="text-left py-2 px-2">Tipo</th>
                        <th className="text-left py-2 px-2">Cliente</th>
                        <th className="text-left py-2 px-2">Total</th>
                        <th className="text-left py-2 px-2">Estado</th>
                        <th className="text-left py-2 px-2">Fecha</th>
                        <th className="text-left py-2 px-2">Error SRI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDocs.documents.map((doc: any) => (
                        <tr key={doc.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 font-mono text-xs">{doc.doc_number}</td>
                          <td className="py-2 px-2">{doc.doc_type}</td>
                          <td className="py-2 px-2">{doc.client_name || 'Consumidor Final'}</td>
                          <td className="py-2 px-2">${doc.total?.toFixed(2)}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              doc.status === 'AUTORIZADO' ? 'bg-green-100 text-green-700' :
                              doc.status === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
                              doc.status === 'ERROR' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs">{new Date(doc.created_at).toLocaleString()}</td>
                          <td className="py-2 px-2 text-xs text-red-600 max-w-xs truncate">
                            {doc.sri_error || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-gray-500">No hay documentos para esta empresa</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Verifica que el tenant_id sea correcto y que se hayan sincronizado ventas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
