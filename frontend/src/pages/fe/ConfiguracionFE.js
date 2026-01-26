/**
 * Configuración de Facturación Electrónica
 * Pantalla para configurar emisor, certificado y ambiente
 */
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Building2, Upload, Shield, CheckCircle, AlertCircle, 
  Save, Trash2, RefreshCw, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { feApi } from '../../services/feApi';

export default function ConfiguracionFE() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('emisor');
  
  // Estado del formulario de emisor
  const [emitterForm, setEmitterForm] = useState({
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    direccion: '',
    telefono: '',
    email: '',
    establecimiento: '001',
    punto_emision: '001',
    ambiente: 'pruebas',
    obligado_contabilidad: 'NO'
  });
  
  // Estado del certificado
  const [certFile, setCertFile] = useState(null);
  const [certPassword, setCertPassword] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await feApi.getConfig();
      setConfig(data);
      
      // Llenar formulario si hay datos
      if (data.emitter) {
        setEmitterForm({
          ruc: data.emitter.ruc || '',
          razon_social: data.emitter.razon_social || '',
          nombre_comercial: data.emitter.nombre_comercial || '',
          direccion: data.emitter.address?.direccion || '',
          telefono: data.emitter.phone || '',
          email: data.emitter.email || '',
          establecimiento: '001',
          punto_emision: '001',
          ambiente: data.fiscal?.ambiente || 'pruebas',
          obligado_contabilidad: data.fiscal?.obligado_contabilidad || 'NO'
        });
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      // Si es error de tenant, es normal para nuevos usuarios
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmitter = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await feApi.saveEmitterConfig(emitterForm);
      toast.success('Configuración del emisor guardada');
      await loadConfig();
    } catch (error) {
      toast.error(error.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCertificate = async (e) => {
    e.preventDefault();
    
    if (!certFile) {
      toast.error('Seleccione un archivo .p12');
      return;
    }
    
    if (!certPassword) {
      toast.error('Ingrese la contraseña del certificado');
      return;
    }
    
    setUploadingCert(true);
    
    try {
      await feApi.uploadCertificate(certFile, certPassword);
      toast.success('Certificado cargado correctamente');
      setCertFile(null);
      setCertPassword('');
      await loadConfig();
    } catch (error) {
      toast.error(error.message || 'Error al cargar certificado');
    } finally {
      setUploadingCert(false);
    }
  };

  const handleDeleteCertificate = async () => {
    if (!window.confirm('¿Eliminar el certificado actual?')) return;
    
    try {
      await feApi.deleteCertificate();
      toast.success('Certificado eliminado');
      await loadConfig();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const isConfigured = config?.is_configured;
  const hasCertificate = config?.certificate;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="text-blue-600" />
          Configuración de Facturación Electrónica
        </h1>
        <p className="text-slate-600 mt-1">
          Configure los datos del emisor y el certificado digital para emitir documentos electrónicos
        </p>
      </div>

      {/* Estado de configuración */}
      <Card className={`p-4 mb-6 ${isConfigured ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-3">
          {isConfigured ? (
            <>
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="font-medium text-green-800">Configuración completa</p>
                <p className="text-sm text-green-700">Puede emitir documentos electrónicos</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="text-yellow-600" size={24} />
              <div>
                <p className="font-medium text-yellow-800">Configuración incompleta</p>
                <p className="text-sm text-yellow-700">
                  Falta: {config?.missing_config?.join(', ') || 'emisor, certificado'}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'emisor' ? 'default' : 'outline'}
          onClick={() => setActiveTab('emisor')}
          className="flex items-center gap-2"
        >
          <Building2 size={18} />
          Datos del Emisor
        </Button>
        <Button
          variant={activeTab === 'certificado' ? 'default' : 'outline'}
          onClick={() => setActiveTab('certificado')}
          className="flex items-center gap-2"
        >
          <Shield size={18} />
          Certificado Digital
          {hasCertificate && <CheckCircle size={14} className="text-green-500" />}
        </Button>
      </div>

      {/* Tab: Datos del Emisor */}
      {activeTab === 'emisor' && (
        <Card className="p-6">
          <form onSubmit={handleSaveEmitter} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ruc">RUC *</Label>
                <Input
                  id="ruc"
                  value={emitterForm.ruc}
                  onChange={(e) => setEmitterForm({...emitterForm, ruc: e.target.value})}
                  placeholder="0000000000001"
                  maxLength={13}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="razon_social">Razón Social *</Label>
                <Input
                  id="razon_social"
                  value={emitterForm.razon_social}
                  onChange={(e) => setEmitterForm({...emitterForm, razon_social: e.target.value})}
                  placeholder="Mi Empresa S.A."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="nombre_comercial">Nombre Comercial</Label>
                <Input
                  id="nombre_comercial"
                  value={emitterForm.nombre_comercial}
                  onChange={(e) => setEmitterForm({...emitterForm, nombre_comercial: e.target.value})}
                  placeholder="Mi Negocio"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={emitterForm.email}
                  onChange={(e) => setEmitterForm({...emitterForm, email: e.target.value})}
                  placeholder="facturacion@empresa.com"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="direccion">Dirección *</Label>
                <Input
                  id="direccion"
                  value={emitterForm.direccion}
                  onChange={(e) => setEmitterForm({...emitterForm, direccion: e.target.value})}
                  placeholder="Av. Principal 123 y Secundaria"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={emitterForm.telefono}
                  onChange={(e) => setEmitterForm({...emitterForm, telefono: e.target.value})}
                  placeholder="022345678"
                />
              </div>
              
              <div>
                <Label htmlFor="establecimiento">Establecimiento</Label>
                <Input
                  id="establecimiento"
                  value={emitterForm.establecimiento}
                  onChange={(e) => setEmitterForm({...emitterForm, establecimiento: e.target.value})}
                  placeholder="001"
                  maxLength={3}
                />
              </div>
              
              <div>
                <Label htmlFor="punto_emision">Punto de Emisión</Label>
                <Input
                  id="punto_emision"
                  value={emitterForm.punto_emision}
                  onChange={(e) => setEmitterForm({...emitterForm, punto_emision: e.target.value})}
                  placeholder="001"
                  maxLength={3}
                />
              </div>
              
              <div>
                <Label htmlFor="ambiente">Ambiente</Label>
                <select
                  id="ambiente"
                  value={emitterForm.ambiente}
                  onChange={(e) => setEmitterForm({...emitterForm, ambiente: e.target.value})}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  <option value="pruebas">Pruebas</option>
                  <option value="produccion">Producción</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="obligado_contabilidad">Obligado a llevar contabilidad</Label>
                <select
                  id="obligado_contabilidad"
                  value={emitterForm.obligado_contabilidad}
                  onChange={(e) => setEmitterForm({...emitterForm, obligado_contabilidad: e.target.value})}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SÍ</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Guardar Configuración
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Certificado Digital */}
      {activeTab === 'certificado' && (
        <Card className="p-6">
          {hasCertificate ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <Shield className="text-green-600 mt-1" size={24} />
                <div className="flex-1">
                  <h3 className="font-medium text-green-800">Certificado Activo</h3>
                  <div className="text-sm text-green-700 mt-2 space-y-1">
                    <p><strong>Emisor:</strong> {config.certificate?.certificate_info?.issuer}</p>
                    <p><strong>Válido hasta:</strong> {new Date(config.certificate?.certificate_info?.valid_to).toLocaleDateString('es-ES')}</p>
                    <p><strong>Días restantes:</strong> {config.certificate?.days_until_expiry || 'N/A'}</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDeleteCertificate}>
                  <Trash2 size={16} className="mr-1" />
                  Eliminar
                </Button>
              </div>
              
              <p className="text-sm text-slate-500">
                Para cambiar el certificado, elimine el actual y suba uno nuevo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUploadCertificate} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-2">Seleccione el archivo .p12</p>
                <input
                  type="file"
                  accept=".p12"
                  onChange={(e) => setCertFile(e.target.files[0])}
                  className="hidden"
                  id="cert-file"
                />
                <label htmlFor="cert-file">
                  <Button type="button" variant="outline" asChild>
                    <span>Seleccionar archivo</span>
                  </Button>
                </label>
                {certFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Archivo seleccionado: {certFile.name}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="cert-password">Contraseña del certificado</Label>
                <Input
                  id="cert-password"
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Ingrese la contraseña"
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={uploadingCert || !certFile}>
                  {uploadingCert ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                  Cargar Certificado
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
