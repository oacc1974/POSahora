import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Plus, Trash2, Users as UsersIcon, Shield } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    password: '',
    es_admin: false,
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
      toast.error('Error al cargar usuarios');
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
      toast.success('Usuario creado correctamente');
      setShowDialog(false);
      resetForm();
      fetchUsuarios();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Error al crear usuario'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/usuarios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Usuario eliminado correctamente');
      fetchUsuarios();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Error al eliminar usuario'
      );
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      username: '',
      password: '',
      es_admin: false,
    });
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div data-testid="users-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Usuarios
          </h1>
          <p className="text-slate-600">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          data-testid="create-user-button"
          size="lg"
          className="gap-2"
        >
          <Plus size={20} />
          Nuevo Usuario
        </Button>
      </div>

      {usuarios.length === 0 ? (
        <Card className="p-12 text-center">
          <UsersIcon size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay usuarios</h3>
          <p className="text-slate-500 mb-6">
            Comienza agregando un nuevo usuario
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus size={20} className="mr-2" />
            Crear Usuario
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usuarios.map((usuario) => (
            <Card
              key={usuario.id}
              data-testid={`user-card-${usuario.id}`}
              className="p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {usuario.es_admin ? (
                      <Shield size={24} className="text-blue-600" />
                    ) : (
                      <UsersIcon size={24} className="text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{usuario.nombre}</h3>
                    <p className="text-sm text-slate-500">
                      @{usuario.username}
                    </p>
                  </div>
                </div>
              </div>

              {usuario.es_admin && (
                <span
                  className="inline-block mb-4 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full"
                  data-testid={`admin-badge-${usuario.id}`}
                >
                  Administrador
                </span>
              )}

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Creado: {new Date(usuario.creado).toLocaleDateString('es-ES')}
                </p>
              </div>

              {usuario.id !== 'admin' && (
                <Button
                  onClick={() => handleDelete(usuario.id)}
                  data-testid={`delete-user-${usuario.id}`}
                  variant="destructive"
                  className="w-full mt-4 gap-2"
                >
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="user-dialog">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
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

            <div className="flex items-center gap-2">
              <Checkbox
                id="es_admin"
                data-testid="user-admin-checkbox"
                checked={formData.es_admin}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, es_admin: checked })
                }
              />
              <Label htmlFor="es_admin" className="cursor-pointer">
                Es Administrador
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
              <Button
                type="submit"
                data-testid="save-user-button"
                className="flex-1"
              >
                Crear Usuario
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
