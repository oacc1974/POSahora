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
  DialogFooter,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigMetodosPago() {
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMetodo, setEditingMetodo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    activo: true,
  });

  useEffect(() => {
    fetchMetodosPago();
  }, []);

  const fetchMetodosPago = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/metodos-pago`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMetodosPago(response.data);
    } catch (error) {
      toast.error('Error al cargar métodos de pago');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = sessionStorage.getItem('token');

      if (editingMetodo) {
        // Editar método existente
        await axios.put(
          `${API_URL}/api/metodos-pago/${editingMetodo.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Método de pago actualizado');
      } else {
        // Crear nuevo método
        await axios.post(`${API_URL}/api/metodos-pago`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Método de pago creado');
      }

      fetchMetodosPago();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (metodoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este método de pago?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(`${API_URL}/api/metodos-pago/${metodoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Método de pago eliminado');
      fetchMetodosPago();
    } catch (error) {
      toast.error('Error al eliminar método de pago');
    }
  };

  const handleEdit = (metodo) => {
    setEditingMetodo(metodo);
    setFormData({
      nombre: metodo.nombre,
      activo: metodo.activo,
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingMetodo(null);
    setFormData({ nombre: '', activo: true });
  };

  const handleToggleActivo = async (metodo) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/metodos-pago/${metodo.id}`,
        { nombre: metodo.nombre, activo: !metodo.activo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Método de pago ${!metodo.activo ? 'activado' : 'desactivado'}`);
      fetchMetodosPago();
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Métodos de Pago</h2>
          <p className="text-slate-600 text-sm mt-1">
            Gestiona los métodos de pago disponibles en tu punto de venta
          </p>
        </div>
      </div>

      {/* Botón Añadir */}
      <Button
        onClick={() => setShowDialog(true)}
        className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6"
        size="lg"
      >
        <Plus className="mr-2 h-5 w-5" />
        AÑADIR MÉTODO DE PAGO
      </Button>

      {/* Filtro Tienda (placeholder) */}
      <div className="flex justify-end">
        <div className="text-sm">
          <div className="text-slate-600 mb-1">Tienda</div>
          <div className="border rounded-md px-3 py-2 bg-white text-slate-700 min-w-[180px]">
            Todas las tiendas ▼
          </div>
        </div>
      </div>

      {/* Lista de Métodos de Pago */}
      <Card className="overflow-hidden">
        <div className="divide-y">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 font-medium text-sm text-slate-600">
            <div className="col-span-1"></div>
            <div className="col-span-9">Nombre</div>
            <div className="col-span-2"></div>
          </div>

          {/* Métodos */}
          {metodosPago.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              No hay métodos de pago configurados.
              <br />
              Añade tu primer método de pago usando el botón de arriba.
            </div>
          ) : (
            metodosPago.map((metodo) => (
              <div
                key={metodo.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center"
              >
                {/* Checkbox */}
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={metodo.activo}
                    onChange={() => handleToggleActivo(metodo)}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                  />
                </div>

                {/* Nombre */}
                <div className="col-span-9">
                  <span className={metodo.activo ? 'text-slate-900' : 'text-slate-400'}>
                    {metodo.nombre}
                  </span>
                  {!metodo.activo && (
                    <span className="ml-2 text-xs text-slate-500">(Desactivado)</span>
                  )}
                </div>

                {/* Menú de opciones */}
                <div className="col-span-2 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-5 w-5 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(metodo)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(metodo.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Dialog para crear/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMetodo ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre del método</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Efectivo, Tarjeta, Transferencia"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData({ ...formData, activo: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="activo" className="cursor-pointer">
                Método activo
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
