import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Monitor, Plus, Pencil, Trash2, Store, CheckCircle, XCircle, User, Hash } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigTPV() {
  const [tpvs, setTpvs] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTPV, setEditingTPV] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    punto_emision: '',
    tienda_id: '',
    activo: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [tpvRes, tiendasRes] = await Promise.all([
        axios.get(`${API_URL}/api/tpv`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/tiendas`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setTpvs(tpvRes.data);
      setTiendas(tiendasRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (tpv = null) => {
    setError('');
    if (tpv) {
      setEditingTPV(tpv);
      setFormData({
        nombre: tpv.nombre,
        punto_emision: tpv.punto_emision,
        tienda_id: tpv.tienda_id,
        activo: tpv.activo
      });
    } else {
      setEditingTPV(null);
      // Sugerir el siguiente punto de emisión
      const nextPE = String(tpvs.length + 1).padStart(3, '0');
      setFormData({
        nombre: '',
        punto_emision: nextPE,
        tienda_id: tiendas.length > 0 ? tiendas[0].id : '',
        activo: true
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTPV(null);
    setError('');
    setFormData({
      nombre: '',
      punto_emision: '',
      tienda_id: '',
      activo: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.punto_emision.trim() || !formData.tienda_id) return;

    setError('');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        nombre: formData.nombre.trim(),
        punto_emision: formData.punto_emision.trim(),
        tienda_id: formData.tienda_id,
        activo: formData.activo
      };

      if (editingTPV) {
        await axios.put(
          `${API_URL}/api/tpv/${editingTPV.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/api/tpv`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      closeDialog();
      fetchData();
    } catch (error) {
      console.error('Error al guardar TPV:', error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Error al guardar el TPV');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpv) => {
    if (tpv.ocupado) {
      alert('No se puede eliminar un TPV ocupado');
      return;
    }
    
    if (!window.confirm(`¿Estás seguro de eliminar el TPV "${tpv.nombre}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tpv/${tpv.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error al eliminar TPV:', error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert('Error al eliminar el TPV');
      }
    }
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Monitor className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dispositivos TPV</h2>
            <p className="text-sm text-slate-500">Gestiona los puntos de venta de tus tiendas</p>
          </div>
        </div>
        <Button onClick={() => openDialog()} className="gap-2" disabled={tiendas.length === 0}>
          <Plus size={18} />
          Nuevo TPV
        </Button>
      </div>

      {/* Mensaje si no hay tiendas */}
      {tiendas.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 text-sm">
            Debes crear al menos una tienda antes de agregar dispositivos TPV.
          </p>
        </div>
      )}

      {/* Lista de TPVs */}
      {tpvs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No hay dispositivos TPV</h3>
          <p className="text-slate-500 mb-4">Crea tu primer punto de venta para comenzar a facturar</p>
          {tiendas.length > 0 && (
            <Button onClick={() => openDialog()} variant="outline" className="gap-2">
              <Plus size={18} />
              Crear TPV
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tpvs.map((tpv) => (
            <div
              key={tpv.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                tpv.ocupado 
                  ? 'bg-orange-50 border-orange-200' 
                  : tpv.activo 
                    ? 'bg-slate-50 border-slate-200 hover:border-blue-200' 
                    : 'bg-slate-100 border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  tpv.ocupado 
                    ? 'bg-orange-100' 
                    : tpv.activo 
                      ? 'bg-green-100' 
                      : 'bg-slate-200'
                }`}>
                  <Monitor className={`h-5 w-5 ${
                    tpv.ocupado 
                      ? 'text-orange-600' 
                      : tpv.activo 
                        ? 'text-green-600' 
                        : 'text-slate-400'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{tpv.nombre}</h3>
                    <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                      <Hash size={10} />
                      {tpv.punto_emision}
                    </span>
                    {tpv.ocupado ? (
                      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                        <User size={12} />
                        En uso
                      </span>
                    ) : tpv.activo ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} />
                        Disponible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                        <XCircle size={12} />
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Store size={14} />
                      {tpv.tienda_nombre}
                    </span>
                    {tpv.ocupado && tpv.ocupado_por_nombre && (
                      <span className="flex items-center gap-1 text-orange-600">
                        <User size={14} />
                        {tpv.ocupado_por_nombre}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDialog(tpv)}
                  className="text-slate-600 hover:text-blue-600"
                  disabled={tpv.ocupado}
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tpv)}
                  className="text-slate-600 hover:text-red-600"
                  disabled={tpv.ocupado}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTPV ? 'Editar TPV' : 'Nuevo TPV'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="nombre">Nombre del TPV *</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Caja 1"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="punto_emision">Punto Emisión *</Label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="punto_emision"
                      placeholder="001"
                      value={formData.punto_emision}
                      onChange={(e) => {
                        // Permitir solo números, máximo 3 dígitos
                        const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setFormData({ ...formData, punto_emision: value });
                      }}
                      onBlur={(e) => {
                        // Al salir del campo, rellenar con ceros si es necesario
                        if (formData.punto_emision && formData.punto_emision.length < 3) {
                          setFormData({ ...formData, punto_emision: formData.punto_emision.padStart(3, '0') });
                        }
                      }}
                      maxLength={3}
                      className="pl-8 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tienda_id">Tienda *</Label>
                <Select
                  value={formData.tienda_id}
                  onValueChange={(value) => setFormData({ ...formData, tienda_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiendas.filter(t => t.activa).map((tienda) => (
                      <SelectItem key={tienda.id} value={tienda.id}>
                        {tienda.nombre} ({tienda.codigo_establecimiento || '001'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="activo" className="text-base">TPV activo</Label>
                  <p className="text-sm text-slate-500">Los TPV inactivos no estarán disponibles para facturar</p>
                </div>
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
              </div>
              
              {/* Info sobre numeración */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Numeración de factura:</strong> Las facturas generadas desde este TPV tendrán el formato:
                </p>
                <p className="text-lg font-mono font-bold text-blue-700 mt-1">
                  {tiendas.find(t => t.id === formData.tienda_id)?.codigo_establecimiento || 'XXX'}-{formData.punto_emision || 'YYY'}-000000001
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving || !formData.nombre.trim() || !formData.punto_emision.trim() || !formData.tienda_id}
              >
                {saving ? 'Guardando...' : editingTPV ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
