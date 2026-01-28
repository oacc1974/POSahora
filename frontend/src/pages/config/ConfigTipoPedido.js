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

export default function ConfigTipoPedido() {
  const [tiposPedido, setTiposPedido] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    activo: true,
  });

  useEffect(() => {
    fetchTiposPedido();
  }, []);

  const fetchTiposPedido = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tipos-pedido`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTiposPedido(response.data);
    } catch (error) {
      toast.error('Error al cargar tipos de pedido');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = sessionStorage.getItem('token');

      if (editingTipo) {
        await axios.put(
          `${API_URL}/api/tipos-pedido/${editingTipo.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Tipo de pedido actualizado');
      } else {
        await axios.post(`${API_URL}/api/tipos-pedido`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Tipo de pedido creado');
      }

      fetchTiposPedido();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tipoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este tipo de pedido?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tipos-pedido/${tipoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Tipo de pedido eliminado');
      fetchTiposPedido();
    } catch (error) {
      toast.error('Error al eliminar tipo de pedido');
    }
  };

  const handleEdit = (tipo) => {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre,
      activo: tipo.activo,
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTipo(null);
    setFormData({ nombre: '', activo: true });
  };

  const handleToggleActivo = async (tipo) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/tipos-pedido/${tipo.id}`,
        { nombre: tipo.nombre, activo: !tipo.activo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Tipo de pedido ${!tipo.activo ? 'activado' : 'desactivado'}`);
      fetchTiposPedido();
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tipos de Pedido</h2>
          <p className="text-slate-600 text-sm mt-1">
            Configura los tipos de pedido disponibles (Para llevar, Comer aquí, etc.)
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
        AÑADIR TIPO DE PEDIDO
      </Button>

      {/* Lista de Tipos de Pedido */}
      <Card className="overflow-hidden">
        <div className="divide-y">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 font-medium text-sm text-slate-600">
            <div className="col-span-1"></div>
            <div className="col-span-9">Nombre</div>
            <div className="col-span-2"></div>
          </div>

          {/* Tipos */}
          {tiposPedido.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              No hay tipos de pedido configurados.
              <br />
              Añade tu primer tipo usando el botón de arriba.
            </div>
          ) : (
            tiposPedido.map((tipo) => (
              <div
                key={tipo.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center"
              >
                {/* Checkbox */}
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={tipo.activo}
                    onChange={() => handleToggleActivo(tipo)}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                  />
                </div>

                {/* Nombre */}
                <div className="col-span-9">
                  <span className={tipo.activo ? 'text-slate-900' : 'text-slate-400'}>
                    {tipo.nombre}
                  </span>
                  {!tipo.activo && (
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
                      <DropdownMenuItem onClick={() => handleEdit(tipo)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(tipo.id)}
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
              {editingTipo ? 'Editar Tipo de Pedido' : 'Nuevo Tipo de Pedido'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre del tipo</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Para llevar, Comer aquí, A domicilio"
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
                Tipo activo
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
