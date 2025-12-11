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
import { Store, Plus, Pencil, Trash2, MapPin, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigTiendas() {
  const [tiendas, setTiendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTienda, setEditingTienda] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    activa: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTiendas();
  }, []);

  const fetchTiendas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tiendas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTiendas(response.data);
    } catch (error) {
      console.error('Error al cargar tiendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (tienda = null) => {
    if (tienda) {
      setEditingTienda(tienda);
      setFormData({
        nombre: tienda.nombre,
        direccion: tienda.direccion || '',
        telefono: tienda.telefono || '',
        email: tienda.email || '',
        activa: tienda.activa
      });
    } else {
      setEditingTienda(null);
      setFormData({
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        activa: true
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTienda(null);
    setFormData({
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      activa: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        nombre: formData.nombre.trim(),
        direccion: formData.direccion.trim() || null,
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        activa: formData.activa
      };

      if (editingTienda) {
        await axios.put(
          `${API_URL}/api/tiendas/${editingTienda.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } else {
        await axios.post(
          `${API_URL}/api/tiendas`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }
      
      closeDialog();
      fetchTiendas();
    } catch (error) {
      console.error('Error al guardar tienda:', error);
      alert('Error al guardar la tienda');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tienda) => {
    if (!window.confirm(`¿Estás seguro de eliminar la tienda "${tienda.nombre}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tiendas/${tienda.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      fetchTiendas();
    } catch (error) {
      console.error('Error al eliminar tienda:', error);
      alert('Error al eliminar la tienda');
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
            <Store className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Tiendas</h2>
            <p className="text-sm text-slate-500">Gestiona las sucursales de tu negocio</p>
          </div>
        </div>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus size={18} />
          Nueva Tienda
        </Button>
      </div>

      {/* Lista de tiendas */}
      {tiendas.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No hay tiendas</h3>
          <p className="text-slate-500 mb-4">Crea tu primera tienda para comenzar</p>
          <Button onClick={() => openDialog()} variant="outline" className="gap-2">
            <Plus size={18} />
            Crear Tienda
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tiendas.map((tienda) => (
            <div
              key={tienda.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${tienda.activa ? 'bg-green-100' : 'bg-slate-200'}`}>
                  <Store className={`h-5 w-5 ${tienda.activa ? 'text-green-600' : 'text-slate-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{tienda.nombre}</h3>
                    {tienda.activa ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} />
                        Activa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                        <XCircle size={12} />
                        Inactiva
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    {tienda.direccion && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {tienda.direccion}
                      </span>
                    )}
                    {tienda.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {tienda.telefono}
                      </span>
                    )}
                    {tienda.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {tienda.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDialog(tienda)}
                  className="text-slate-600 hover:text-blue-600"
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tienda)}
                  className="text-slate-600 hover:text-red-600"
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
              {editingTienda ? 'Editar Tienda' : 'Nueva Tienda'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la tienda *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Sucursal Centro"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Ej: Av. Principal #123"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    placeholder="Ej: +1 234 567890"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tienda@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="activa" className="text-base">Tienda activa</Label>
                  <p className="text-sm text-slate-500">Las tiendas inactivas no aparecerán en el POS</p>
                </div>
                <Switch
                  id="activa"
                  checked={formData.activa}
                  onCheckedChange={(checked) => setFormData({ ...formData, activa: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !formData.nombre.trim()}>
                {saving ? 'Guardando...' : editingTienda ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
