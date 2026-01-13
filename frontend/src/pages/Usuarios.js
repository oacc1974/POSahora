import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Plus, Trash2, Users as UsersIcon, Shield, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getRolInfo = (rol) => {
  const roles = {
    propietario: {
      icon: Shield,
      color: 'bg-purple-100 text-purple-700',
      text: 'Propietario',
    },
    administrador: {
      icon: User,
      color: 'bg-blue-100 text-blue-700',
      text: 'Administrador',
    },
    cajero: {
      icon: UsersIcon,
      color: 'bg-green-100 text-green-700',
      text: 'Cajero',
    },
    mesero: {
      icon: UsersIcon,
      color: 'bg-purple-100 text-purple-700',
      text: 'Mesero',
    },
  };
  return roles[rol] || roles.cajero;
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    password: '',
    rol: 'cajero',
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(response.data);
    } catch (error) {
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/usuarios`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Empleado creado correctamente');
      setShowDialog(false);
      resetForm();
      fetchUsuarios();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Error al crear empleado'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este empleado?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/usuarios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Empleado eliminado correctamente');
      fetchUsuarios();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Error al eliminar empleado'
      );
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      username: '',
      password: '',
      rol: 'cajero',
    });
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div data-testid="users-page">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Empleados
          </h1>
          <p className="text-slate-600">Gestiona tu equipo de trabajo</p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          data-testid="create-user-button"
          size="lg"
          className="gap-2 w-full md:w-auto"
        >
          <Plus size={20} />
          Nuevo Empleado
        </Button>
      </div>

      {usuarios.length === 0 ? (
        <Card className="p-8 md:p-12 text-center">
          <UsersIcon size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay empleados</h3>
          <p className="text-slate-500 mb-6">
            Comienza agregando tu primer empleado
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus size={20} className="mr-2" />
            Crear Empleado
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {usuarios.map((usuario) => {
            const rolInfo = getRolInfo(usuario.rol);
            const RolIcon = rolInfo.icon;
            return (
              <Card
                key={usuario.id}
                data-testid={`user-card-${usuario.id}`}
                className="p-4 md:p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <RolIcon size={24} className="text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base md:text-lg truncate">
                        {usuario.nombre}
                      </h3>
                      <p className="text-sm text-slate-500 truncate">
                        @{usuario.username}
                      </p>
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-block mb-4 px-3 py-1 text-xs md:text-sm font-medium rounded-full ${rolInfo.color}`}
                  data-testid={`rol-badge-${usuario.id}`}
                >
                  {rolInfo.text}
                </span>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs md:text-sm text-slate-500">
                    Creado: {new Date(usuario.creado).toLocaleDateString('es-ES')}
                  </p>
                </div>

                {usuario.rol !== 'propietario' && (
                  <Button
                    onClick={() => handleDelete(usuario.id)}
                    data-testid={`delete-user-${usuario.id}`}
                    variant="destructive"
                    size="sm"
                    className="w-full mt-4 gap-2"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="user-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Nuevo Empleado</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                data-testid="user-name-input"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="username">Usuario *</Label>
              <Input
                id="username"
                data-testid="user-username-input"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                data-testid="user-password-input"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="rol">Rol *</Label>
              <Select
                value={formData.rol}
                onValueChange={(value) =>
                  setFormData({ ...formData, rol: value })
                }
              >
                <SelectTrigger data-testid="user-rol-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="cajero">Cajero</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Administrador:</strong> Gestiona productos y hace ventas<br />
                <strong>Cajero:</strong> Solo realiza ventas
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
                data-testid="save-user-button"
                className="flex-1"
              >
                Crear
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
