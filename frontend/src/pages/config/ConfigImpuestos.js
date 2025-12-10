import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Plus, Edit, Trash2, Percent } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigImpuestos() {
  const [impuestos, setImpuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingImpuesto, setEditingImpuesto] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tasa: '',
    tipo: 'no_incluido',
    activo: true,
  });

  useEffect(() => {
    fetchImpuestos();
  }, []);

  const fetchImpuestos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/impuestos`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setImpuestos(response.data);
    } catch (error) {
      console.error('Error al cargar impuestos:', error);
      toast.error('Error al cargar impuestos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        tasa: parseFloat(formData.tasa),
      };

      if (editingImpuesto) {
        await axios.put(
          `${API_URL}/api/impuestos/${editingImpuesto.id}`,
          data,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        toast.success('Impuesto actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/api/impuestos`, data, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        toast.success('Impuesto creado correctamente');
      }

      setShowDialog(false);
      setEditingImpuesto(null);
      setFormData({ nombre: '', tasa: '', tipo: 'no_incluido', activo: true });
      fetchImpuestos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar impuesto');
    }
  };

  const handleEdit = (impuesto) => {
    setEditingImpuesto(impuesto);
    setFormData({
      nombre: impuesto.nombre,
      tasa: impuesto.tasa.toString(),
      tipo: impuesto.tipo,
      activo: impuesto.activo,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este impuesto?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/impuestos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success('Impuesto eliminado correctamente');
      fetchImpuestos();
    } catch (error) {
      toast.error('Error al eliminar impuesto');
    }
  };

  const handleNewImpuesto = () => {
    setEditingImpuesto(null);
    setFormData({ nombre: '', tasa: '', tipo: 'no_incluido', activo: true });
    setShowDialog(true);
  };

  if (loading) {
    return <Card className="p-8"><p>Cargando...</p></Card>;
  }

  return (
    <div>
      <Card className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Impuestos</h2>
            <p className="text-slate-600">
              Gestiona los impuestos que se aplican en tus ventas
            </p>
          </div>
          <Button onClick={handleNewImpuesto} className="gap-2">
            <Plus size={20} />
            Nuevo Impuesto
          </Button>
        </div>

        {impuestos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Percent size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500 mb-4">
              No hay impuestos configurados
            </p>
            <Button onClick={handleNewImpuesto} variant="outline">
              Crear primer impuesto
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {impuestos.map((impuesto) => (
              <div
                key={impuesto.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Percent size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {impuesto.nombre}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-600">
                        {impuesto.tasa}%
                      </span>
                      <span className="text-sm text-slate-500">•</span>
                      <span className="text-sm text-slate-600">
                        {impuesto.tipo === 'incluido'
                          ? 'Incluido en el precio'
                          : 'No incluido en el precio'}
                      </span>
                      {!impuesto.activo && (
                        <>
                          <span className="text-sm text-slate-500">•</span>
                          <span className="text-sm text-amber-600">
                            Inactivo
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(impuesto)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(impuesto.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog para crear/editar impuesto */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>
              {editingImpuesto ? 'Editar Impuesto' : 'Nuevo Impuesto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre del Impuesto</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
                placeholder="IVA, Impuesto General, etc."
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="tasa">Tasa de Impuesto (%)</Label>
              <Input
                id="tasa"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tasa}
                onChange={(e) =>
                  setFormData({ ...formData, tasa: e.target.value })
                }
                required
                placeholder="12.00"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value })
                }
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="no_incluido">No incluido en el precio</option>
                <option value="incluido">Incluido en el precio</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {formData.tipo === 'incluido'
                  ? 'El impuesto ya está incluido en el precio del producto'
                  : 'El impuesto se suma al precio del producto'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData({ ...formData, activo: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="activo" className="cursor-pointer">
                Impuesto activo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editingImpuesto ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
