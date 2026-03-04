import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

export default function EmpresaDetailPage() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certPassword, setCertPassword] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: empresa, isLoading } = useQuery({
    queryKey: ['empresa', tenantId],
    queryFn: async () => {
      const response = await api.get(`/empresas/${tenantId}`)
      return response.data
    },
  })

  const uploadCertMutation = useMutation({
    mutationFn: async () => {
      if (!certFile || !certPassword) return
      
      const formData = new FormData()
      formData.append('file', certFile)
      formData.append('password', certPassword)
      
      return api.post(`/empresas/${tenantId}/certificate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      toast({ title: 'Certificado subido correctamente' })
      setCertFile(null)
      setCertPassword('')
      queryClient.invalidateQueries({ queryKey: ['empresa', tenantId] })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al subir certificado',
      })
    },
  })

  const deleteCertMutation = useMutation({
    mutationFn: () => api.delete(`/empresas/${tenantId}/certificate`),
    onSuccess: () => {
      toast({ title: 'Certificado eliminado' })
      queryClient.invalidateQueries({ queryKey: ['empresa', tenantId] })
    },
  })

  const deleteEmpresaMutation = useMutation({
    mutationFn: () => api.delete(`/empresas/${tenantId}`),
    onSuccess: () => {
      toast({ title: 'Empresa eliminada correctamente' })
      navigate('/empresas')
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al eliminar empresa',
      })
    },
  })

  const updateAmbienteMutation = useMutation({
    mutationFn: (ambiente: string) => api.put(`/empresas/${tenantId}`, { ambiente }),
    onSuccess: () => {
      toast({ title: 'Ambiente actualizado correctamente' })
      queryClient.invalidateQueries({ queryKey: ['empresa', tenantId] })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al actualizar ambiente',
      })
    },
  })

  const handleUploadCert = async () => {
    if (!certFile || !certPassword) {
      toast({ variant: 'destructive', title: 'Seleccione archivo y contraseña' })
      return
    }
    setIsUploading(true)
    await uploadCertMutation.mutateAsync()
    setIsUploading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/empresas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{empresa?.razon_social}</h1>
          <p className="text-gray-500">RUC: {empresa?.ruc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">RUC:</span>
                <p className="font-medium">{empresa?.ruc}</p>
              </div>
              <div>
                <span className="text-gray-500">Ambiente:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={empresa?.ambiente || 'pruebas'}
                    onChange={(e) => updateAmbienteMutation.mutate(e.target.value)}
                    disabled={updateAmbienteMutation.isPending}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="pruebas">Pruebas</option>
                    <option value="produccion">Producción</option>
                  </select>
                  {updateAmbienteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <p className="font-medium">{empresa?.email}</p>
              </div>
              <div>
                <span className="text-gray-500">Teléfono:</span>
                <p className="font-medium">{empresa?.telefono || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Dirección:</span>
                <p className="font-medium">{empresa?.direccion}</p>
              </div>
              <div>
                <span className="text-gray-500">Obligado Contabilidad:</span>
                <p className="font-medium">{empresa?.obligado_contabilidad}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              {!showDeleteConfirm ? (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Empresa
                </Button>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg space-y-3">
                  <p className="text-sm text-red-700 font-medium">
                    ¿Está seguro? Se eliminarán todos los datos de esta empresa incluyendo documentos y certificados.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteEmpresaMutation.mutate()}
                      disabled={deleteEmpresaMutation.isPending}
                    >
                      {deleteEmpresaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sí, eliminar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Certificado Digital
              {empresa?.has_certificate ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {empresa?.has_certificate ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Certificado activo</p>
                  {empresa?.certificate_expires && (
                    <p className="text-xs text-green-600 mt-1">
                      Expira: {new Date(empresa.certificate_expires).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCertMutation.mutate()}
                  disabled={deleteCertMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Certificado
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700">Sin certificado configurado</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Suba un archivo .p12 para habilitar la facturación
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Archivo .p12</Label>
                  <Input
                    type="file"
                    accept=".p12"
                    onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Contraseña del certificado</Label>
                  <Input
                    type="password"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                
                <Button onClick={handleUploadCert} disabled={isUploading || !certFile}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Certificado
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
