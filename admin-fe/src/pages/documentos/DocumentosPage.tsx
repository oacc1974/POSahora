import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Eye, Search, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

export default function DocumentosPage() {
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: empresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const response = await api.get('/empresas')
      return response.data.empresas
    },
  })

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', selectedEmpresa, page, search, statusFilter],
    queryFn: async () => {
      if (!selectedEmpresa) return null
      const params = new URLSearchParams({
        tenant_id: selectedEmpresa,
        page: page.toString(),
        limit: '20'
      })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await api.get(`/documents?${params}`)
      return response.data
    },
    enabled: !!selectedEmpresa,
  })

  const { data: stats } = useQuery({
    queryKey: ['document-stats', selectedEmpresa],
    queryFn: async () => {
      if (!selectedEmpresa) return null
      const response = await api.get(`/documents/stats/${selectedEmpresa}`)
      return response.data
    },
    enabled: !!selectedEmpresa,
  })

  const handleDownloadXml = async (docId: string) => {
    try {
      const response = await api.get(`/documents/${docId}/xml`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${docId}.xml`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading XML:', error)
    }
  }

  const handleDownloadPdf = async (docId: string) => {
    try {
      const response = await api.get(`/documents/${docId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${docId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'authorized':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string, statusName: string) => {
    const colors: Record<string, string> = {
      authorized: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-blue-100 text-blue-800',
      sent: 'bg-purple-100 text-purple-800'
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusIcon(status)}
        {statusName}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documentos Electrónicos</h1>
        <p className="text-gray-500">Consulta facturas, notas de crédito y otros documentos</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Label>Seleccionar Empresa</Label>
          <select
            value={selectedEmpresa}
            onChange={(e) => {
              setSelectedEmpresa(e.target.value)
              setPage(1)
            }}
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
          <>
            <div className="w-64">
              <Label>Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Número, clave, cliente..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-48">
              <Label>Estado</Label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Todos</option>
                <option value="authorized">Autorizado</option>
                <option value="pending">Pendiente</option>
                <option value="rejected">Rechazado</option>
                <option value="error">Error</option>
              </select>
            </div>
          </>
        )}
      </div>

      {selectedEmpresa && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Autorizados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.by_status?.authorized?.count || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.by_status?.pending?.count || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rechazados</p>
                  <p className="text-2xl font-bold text-red-600">
                    {(stats.by_status?.rejected?.count || 0) + (stats.by_status?.error?.count || 0)}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Facturado</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${(stats.by_status?.authorized?.total || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedEmpresa && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : documentsData?.documents?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron documentos
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Tipo</th>
                        <th className="text-left py-3 px-2">Número</th>
                        <th className="text-left py-3 px-2">Fecha</th>
                        <th className="text-left py-3 px-2">Cliente</th>
                        <th className="text-right py-3 px-2">Total</th>
                        <th className="text-center py-3 px-2">Estado</th>
                        <th className="text-center py-3 px-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentsData?.documents?.map((doc: any) => (
                        <tr key={doc.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {doc.doc_type_name}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-mono text-xs">
                            {doc.doc_number}
                          </td>
                          <td className="py-3 px-2">
                            {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('es-EC') : '-'}
                          </td>
                          <td className="py-3 px-2">
                            <div className="max-w-[200px] truncate" title={doc.buyer_name}>
                              {doc.buyer_name}
                            </div>
                            <div className="text-xs text-gray-500">{doc.buyer_id}</div>
                          </td>
                          <td className="py-3 px-2 text-right font-medium">
                            ${doc.total?.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {getStatusBadge(doc.status, doc.status_name)}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex justify-center gap-1">
                              {doc.has_xml && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadXml(doc.id)}
                                  title="Descargar XML"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {doc.has_pdf && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadPdf(doc.id)}
                                  title="Descargar PDF"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {documentsData && documentsData.pages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-gray-500">
                      Página {page} de {documentsData.pages} ({documentsData.total} documentos)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page >= documentsData.pages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedEmpresa && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Seleccione una empresa para ver sus documentos</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
