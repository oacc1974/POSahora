import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

const empresaSchema = z.object({
  ruc: z.string().length(13, 'RUC debe tener 13 dígitos'),
  razon_social: z.string().min(3, 'Mínimo 3 caracteres'),
  nombre_comercial: z.string().optional(),
  direccion: z.string().min(5, 'Mínimo 5 caracteres'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido'),
  ambiente: z.enum(['pruebas', 'produccion']),
  obligado_contabilidad: z.enum(['SI', 'NO']),
})

type EmpresaForm = z.infer<typeof empresaSchema>

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateEmpresaDialog({ open, onClose, onSuccess }: Props) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      ambiente: 'pruebas',
      obligado_contabilidad: 'NO',
    },
  })

  const onSubmit = async (data: EmpresaForm) => {
    setIsLoading(true)
    try {
      await api.post('/empresas', data)
      toast({
        title: 'Empresa creada',
        description: 'La empresa se ha creado correctamente',
      })
      reset()
      onSuccess()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al crear empresa',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Nueva Empresa</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="ruc">RUC *</Label>
              <Input id="ruc" placeholder="1234567890001" {...register('ruc')} />
              {errors.ruc && <p className="text-sm text-red-500">{errors.ruc.message}</p>}
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="razon_social">Razón Social *</Label>
              <Input id="razon_social" {...register('razon_social')} />
              {errors.razon_social && <p className="text-sm text-red-500">{errors.razon_social.message}</p>}
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="nombre_comercial">Nombre Comercial</Label>
              <Input id="nombre_comercial" {...register('nombre_comercial')} />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="direccion">Dirección *</Label>
              <Input id="direccion" {...register('direccion')} />
              {errors.direccion && <p className="text-sm text-red-500">{errors.direccion.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" {...register('telefono')} />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="ambiente">Ambiente *</Label>
              <select
                id="ambiente"
                {...register('ambiente')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="pruebas">Pruebas</option>
                <option value="produccion">Producción</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="obligado_contabilidad">Obligado Contabilidad *</Label>
              <select
                id="obligado_contabilidad"
                {...register('obligado_contabilidad')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Empresa
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
