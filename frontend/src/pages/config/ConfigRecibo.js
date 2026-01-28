import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Store, Save, Upload, X, Image } from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigRecibo() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    cabecera: '',
    nombre_negocio: '',
    direccion: '',
    telefono: '',
    rfc: '',
    email: '',
    sitio_web: '',
    mensaje_pie: '',
    imprimir_ticket: false,
    mostrar_info_cliente: false,
    mostrar_comentarios: false,
    logo_email: '',
    logo_impreso: '',
    logo_url: '', // URL del logo subido
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP');
      return;
    }
    
    // Validar tamaño (max 2MB para logos)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo no debe superar 2MB');
      return;
    }
    
    setUploadingLogo(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/config/upload-logo`, formDataUpload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setFormData(prev => ({ ...prev, logo_url: response.data.url }));
      toast.success('Logo subido correctamente');
    } catch (error) {
      console.error('Error al subir logo:', error);
      toast.error('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFormData(response.data);
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/config`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div data-testid="config-page">
      <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Código de Tienda POS
            </h3>
            <p className="text-sm text-slate-600">
              Comparte este código con tus empleados para que puedan acceder al sistema desde Login POS
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-600 mb-1">Código:</p>
              <p className="text-2xl md:text-3xl font-bold font-mono text-blue-600">
                {JSON.parse(localStorage.getItem('user') || '{}').codigo_tienda || 'Cargando...'}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const codigo = JSON.parse(localStorage.getItem('user') || '{}').codigo_tienda;
                if (codigo) {
                  try {
                    if (navigator.clipboard && window.isSecureContext) {
                      await navigator.clipboard.writeText(codigo);
                      toast.success('Código copiado al portapapeles');
                    } else {
                      const textArea = document.createElement('textarea');
                      textArea.value = codigo;
                      textArea.style.position = 'fixed';
                      textArea.style.left = '-999999px';
                      textArea.style.top = '-999999px';
                      textArea.setAttribute('readonly', '');
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      const success = document.execCommand('copy');
                      document.body.removeChild(textArea);
                      if (success) {
                        toast.success('Código copiado al portapapeles');
                      } else {
                        toast.info(`Código: ${codigo}`, { duration: 5000 });
                      }
                    }
                  } catch (err) {
                    toast.info(`Código: ${codigo}`, { duration: 5000 });
                  }
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Store size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Información del Negocio</h2>
            <p className="text-sm text-slate-500">
              Esta información aparecerá en tus tickets
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección de Logo */}
          <div className="border-b pb-6">
            <Label className="text-base font-semibold mb-3 block">Logo del Negocio</Label>
            <p className="text-sm text-slate-500 mb-4">Este logo aparecerá en tus tickets impresos y enviados por email</p>
            
            <div className="flex items-start gap-6">
              {/* Preview del logo */}
              <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                {formData.logo_url ? (
                  <img 
                    src={`${API_URL}${formData.logo_url}`} 
                    alt="Logo del negocio" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <Image size={32} className="mx-auto mb-1" />
                    <span className="text-xs">Sin logo</span>
                  </div>
                )}
              </div>
              
              {/* Botones de acción */}
              <div className="flex-1 space-y-3">
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <div className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${uploadingLogo ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                    {uploadingLogo ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        {formData.logo_url ? 'Cambiar logo' : 'Subir logo'}
                      </>
                    )}
                  </div>
                </label>
                
                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg flex items-center gap-2 hover:bg-red-50"
                  >
                    <X size={16} />
                    Eliminar logo
                  </button>
                )}
                
                <p className="text-xs text-slate-500">
                  Formatos: JPG, PNG, GIF o WebP (máx. 2MB)<br/>
                  Recomendado: 200x200 píxeles o superior
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="cabecera">Cabecera del Ticket</Label>
            <Textarea
              id="cabecera"
              data-testid="config-cabecera-input"
              value={formData.cabecera}
              onChange={(e) =>
                setFormData({ ...formData, cabecera: e.target.value })
              }
              rows={2}
              placeholder="Texto que aparece al inicio del ticket"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="nombre_negocio">Nombre del Negocio *</Label>
            <Input
              id="nombre_negocio"
              data-testid="config-nombre-input"
              value={formData.nombre_negocio}
              onChange={(e) =>
                setFormData({ ...formData, nombre_negocio: e.target.value })
              }
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              data-testid="config-direccion-input"
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              data-testid="config-telefono-input"
              value={formData.telefono}
              onChange={(e) =>
                setFormData({ ...formData, telefono: e.target.value })
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="mensaje_pie">Mensaje al Pie del Ticket</Label>
            <Textarea
              id="mensaje_pie"
              data-testid="config-mensaje-input"
              value={formData.mensaje_pie}
              onChange={(e) =>
                setFormData({ ...formData, mensaje_pie: e.target.value })
              }
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg mb-4">Opciones Avanzadas</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="imprimir_ticket"
                  data-testid="config-imprimir-ticket-checkbox"
                  checked={formData.imprimir_ticket}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, imprimir_ticket: checked })
                  }
                />
                <Label htmlFor="imprimir_ticket" className="cursor-pointer font-normal">
                  Imprimir ticket de venta automáticamente
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="mostrar_info_cliente"
                  data-testid="config-mostrar-cliente-checkbox"
                  checked={formData.mostrar_info_cliente}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, mostrar_info_cliente: checked })
                  }
                />
                <Label htmlFor="mostrar_info_cliente" className="cursor-pointer font-normal">
                  Mostrar información del cliente en el ticket
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="mostrar_comentarios"
                  data-testid="config-mostrar-comentarios-checkbox"
                  checked={formData.mostrar_comentarios}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, mostrar_comentarios: checked })
                  }
                />
                <Label htmlFor="mostrar_comentarios" className="cursor-pointer font-normal">
                  Mostrar comentarios en el ticket
                </Label>
              </div>

              <div>
                <Label htmlFor="logo_email">URL del Logo (Email)</Label>
                <Input
                  id="logo_email"
                  data-testid="config-logo-email-input"
                  value={formData.logo_email || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_email: e.target.value })
                  }
                  placeholder="https://ejemplo.com/logo.png"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Logo que aparecerá en tickets enviados por email
                </p>
              </div>

              <div>
                <Label htmlFor="logo_impreso">URL del Logo (Impreso)</Label>
                <Input
                  id="logo_impreso"
                  data-testid="config-logo-impreso-input"
                  value={formData.logo_impreso || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_impreso: e.target.value })
                  }
                  placeholder="https://ejemplo.com/logo.png"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Logo que aparecerá en tickets impresos
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              data-testid="config-save-button"
              disabled={saving}
              className="w-full md:w-auto gap-2"
              size="lg"
            >
              <Save size={20} />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            Vista Previa del Ticket
          </h3>
          <div className="bg-white p-4 rounded border border-slate-200 font-mono text-sm">
            {formData.cabecera && (
              <>
                <div className="text-center mb-2">
                  <p className="text-xs">{formData.cabecera}</p>
                </div>
                <div className="border-t border-dashed border-slate-300 my-2" />
              </>
            )}
            <div className="text-center mb-4">
              <p className="font-bold">{formData.nombre_negocio || 'Mi Negocio'}</p>
              {formData.direccion && <p className="text-xs">{formData.direccion}</p>}
              {formData.telefono && <p className="text-xs">Tel: {formData.telefono}</p>}
              {formData.rfc && <p className="text-xs">RFC: {formData.rfc}</p>}
              {formData.email && <p className="text-xs">{formData.email}</p>}
              {formData.sitio_web && <p className="text-xs">{formData.sitio_web}</p>}
            </div>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <p className="text-xs">Producto Ejemplo x1 ........... $10.00</p>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <p className="font-bold">TOTAL: $10.00</p>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <p className="text-xs text-center mt-4">
              {formData.mensaje_pie || '¡Gracias por su compra!'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
