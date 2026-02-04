import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Mail, Phone, MapPin, Search, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [showBusqueda, setShowBusqueda] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    region: '',
    codigo_postal: '',
    pais: '',
    cedula_ruc: '',
    nota: '',
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClientes(response.data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');

      if (editingCliente) {
        await axios.put(
          `${API_URL}/api/clientes/${editingCliente.id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success('Cliente actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/api/clientes`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Cliente creado correctamente');
      }

      setShowDialog(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      // Manejar error de límite de plan
      if (error.response?.status === 403 && error.response?.data?.detail?.code === 'PLAN_LIMIT') {
        toast.error(error.response.data.detail.message, {
          duration: 5000,
          action: {
            label: 'Ver Planes',
            onClick: () => window.location.href = '/mi-plan'
          }
        });
      } else {
        toast.error('Error al guardar cliente');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(`${API_URL}/api/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Cliente eliminado correctamente');
      fetchClientes();
    } catch (error) {
      toast.error('Error al eliminar cliente');
    }
  };

  const openDialog = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nombre: cliente.nombre || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || '',
        region: cliente.region || '',
        codigo_postal: cliente.codigo_postal || '',
        pais: cliente.pais || '',
        cedula_ruc: cliente.cedula_ruc || '',
        nota: cliente.nota || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditingCliente(null);
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      region: '',
      codigo_postal: '',
      pais: '',
      cedula_ruc: '',
      nota: '',
    });
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  // Filtrar clientes por búsqueda
  const clientesFiltrados = busqueda
    ? clientes.filter(c =>
        (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.telefono || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.cedula_ruc || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.ciudad || '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : clientes;

  return (
    <div data-testid="clientes-page">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Clientes
          </h1>
          <p className="text-slate-600">Gestiona tu cartera de clientes</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Buscador */}
          {showBusqueda ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="pl-9 pr-8 py-2 border rounded-lg text-sm w-48 md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setShowBusqueda(false); setBusqueda(''); }}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowBusqueda(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border"
              title="Buscar cliente"
              data-testid="search-clientes-btn"
            >
              <Search size={18} />
            </button>
          )}
          <Button
            onClick={() => openDialog()}
            data-testid="create-cliente-button"
            size="lg"
            className="gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Indicador de búsqueda */}
      {busqueda && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center justify-between mb-4">
          <span>
            Se encontraron <strong>{clientesFiltrados.length}</strong> cliente(s) para "{busqueda}"
          </span>
          <button onClick={() => setBusqueda('')} className="text-blue-600 hover:text-blue-800 font-medium">
            Limpiar
          </button>
        </div>
      )}

      {clientesFiltrados.length === 0 ? (
        <Card className="p-8 md:p-12 text-center">
          <Users size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">
            {busqueda ? 'No se encontraron clientes' : 'No hay clientes'}
          </h3>
          <p className="text-slate-500 mb-6">
            {busqueda ? `No hay clientes que coincidan con "${busqueda}"` : 'Comienza agregando tu primer cliente'}
          </p>
          {!busqueda && (
            <Button onClick={() => openDialog()}>
              <Plus size={20} className="mr-2" />
              Crear Cliente
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {clientesFiltrados.map((cliente) => (
            <Card
              key={cliente.id}
              data-testid={`cliente-card-${cliente.id}`}
              className="p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users size={24} className="text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base md:text-lg truncate">
                      {cliente.nombre}
                    </h3>
                    {cliente.cedula_ruc && (
                      <p className="text-xs text-slate-500 font-mono">
                        Cédula/RUC: {cliente.cedula_ruc}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={16} className="flex-shrink-0" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                )}
                {cliente.telefono && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone size={16} className="flex-shrink-0" />
                    <span>{cliente.telefono}</span>
                  </div>
                )}
                {(cliente.ciudad || cliente.region) && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={16} className="flex-shrink-0" />
                    <span className="truncate">
                      {[cliente.ciudad, cliente.region]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button
                  onClick={() => openDialog(cliente)}
                  data-testid={`edit-cliente-${cliente.id}`}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Pencil size={16} className="mr-2" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(cliente.id)}
                  data-testid={`delete-cliente-${cliente.id}`}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  <Trash2 size={16} className="mr-2" />
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          data-testid="cliente-dialog"
          className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                data-testid="cliente-nombre-input"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  data-testid="cliente-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  data-testid="cliente-telefono-input"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                data-testid="cliente-direccion-input"
                value={formData.direccion}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  data-testid="cliente-ciudad-input"
                  value={formData.ciudad}
                  onChange={(e) =>
                    setFormData({ ...formData, ciudad: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="region">Región</Label>
                <Input
                  id="region"
                  data-testid="cliente-region-input"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo_postal">Código Postal</Label>
                <Input
                  id="codigo_postal"
                  data-testid="cliente-codigo-postal-input"
                  value={formData.codigo_postal}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo_postal: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  data-testid="cliente-pais-input"
                  value={formData.pais}
                  onChange={(e) =>
                    setFormData({ ...formData, pais: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cedula_ruc">Cédula o RUC</Label>
              <Input
                id="cedula_ruc"
                data-testid="cliente-codigo-input"
                value={formData.cedula_ruc}
                onChange={(e) =>
                  setFormData({ ...formData, cedula_ruc: e.target.value })
                }
                placeholder="10 dígitos (Cédula) o 13 dígitos (RUC)"
                maxLength={13}
              />
              <p className="text-xs text-slate-500 mt-1">
                Ecuador: 10 dígitos para Cédula, 13 para RUC
              </p>
            </div>

            <div>
              <Label htmlFor="nota">Nota</Label>
              <Textarea
                id="nota"
                data-testid="cliente-nota-input"
                value={formData.nota}
                onChange={(e) =>
                  setFormData({ ...formData, nota: e.target.value })
                }
                rows={3}
                maxLength={255}
                placeholder="Información adicional sobre el cliente"
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.nota.length}/255
              </p>
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
              <Button
                type="submit"
                data-testid="save-cliente-button"
                className="flex-1"
              >
                {editingCliente ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
