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
  DialogFooter,
} from '../components/ui/dialog';
import { Plus, Trash2, Users as UsersIcon, Shield, User, Key, RefreshCw, Pencil, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getRolInfo = (rol) => {
  const roles = {
    propietario: {
      icon: Shield,
      color: 'bg-purple-100 text-purple-700',
      badgeColor: 'bg-purple-500',
      text: 'Propietario',
    },
    administrador: {
      icon: User,
      color: 'bg-blue-100 text-blue-700',
      badgeColor: 'bg-blue-500',
      text: 'Administrador',
    },
    cajero: {
      icon: UsersIcon,
      color: 'bg-green-100 text-green-700',
      badgeColor: 'bg-green-500',
      text: 'Cajero',
    },
    mesero: {
      icon: UsersIcon,
      color: 'bg-orange-100 text-orange-700',
      badgeColor: 'bg-orange-500',
      text: 'Mesero',
    },
  };
  return roles[rol] || roles.cajero;
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [selectedUserForPin, setSelectedUserForPin] = useState(null);
  const [showPin, setShowPin] = useState({});
  const [generatingPin, setGeneratingPin] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    password: '',
    rol: 'cajero',
    pin: '',
    pin_activo: false,
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
      
      // Preparar datos según el rol
      const dataToSend = { ...formData };
      
      // Para cajeros y meseros, el PIN es obligatorio, no necesitan contraseña
      if (formData.rol === 'cajero' || formData.rol === 'mesero') {
        dataToSend.pin_activo = true;
        // La contraseña es opcional para estos roles
        if (!dataToSend.password) {
          delete dataToSend.password;
        }
      }
      
      if (editingUser) {
        // Actualizar usuario existente
        await axios.put(`${API_URL}/api/usuarios/${editingUser.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Empleado actualizado correctamente');
      } else {
        // Crear nuevo usuario
        await axios.post(`${API_URL}/api/usuarios`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Empleado creado correctamente');
      }
      
      setShowDialog(false);
      resetForm();
      fetchUsuarios();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Error al guardar empleado'
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

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      nombre: usuario.nombre,
      username: usuario.username,
      password: '',
      rol: usuario.rol,
      pin: usuario.pin || '',
      pin_activo: usuario.pin_activo || false,
    });
    setShowDialog(true);
  };

  const handleGeneratePin = async (userId) => {
    setGeneratingPin(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/usuarios/${userId}/generar-pin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Nuevo PIN generado: ${response.data.pin}`);
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al generar PIN');
    } finally {
      setGeneratingPin(false);
    }
  };

  const handleTogglePin = async (usuario) => {
    try {
      const token = localStorage.getItem('token');
      
      // Si está desactivando el PIN
      if (usuario.pin_activo) {
        await axios.put(
          `${API_URL}/api/usuarios/${usuario.id}`,
          { pin_activo: false },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('PIN desactivado');
      } else {
        // Si está activando el PIN y no tiene uno, generar uno nuevo
        if (!usuario.pin) {
          const response = await axios.post(
            `${API_URL}/api/usuarios/${usuario.id}/generar-pin`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success(`PIN activado: ${response.data.pin}`);
        } else {
          await axios.put(
            `${API_URL}/api/usuarios/${usuario.id}`,
            { pin_activo: true },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('PIN activado');
        }
      }
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar estado del PIN');
    }
  };

  const openPinDialog = (usuario) => {
    setSelectedUserForPin(usuario);
    setShowPinDialog(true);
  };

  const handleUpdatePin = async (newPin) => {
    if (!selectedUserForPin) return;
    
    if (newPin.length < 4 || newPin.length > 6) {
      toast.error('El PIN debe tener entre 4 y 6 dígitos');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/usuarios/${selectedUserForPin.id}`,
        { pin: newPin, pin_activo: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('PIN actualizado correctamente');
      setShowPinDialog(false);
      setSelectedUserForPin(null);
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar PIN');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      username: '',
      password: '',
      rol: 'cajero',
      pin: '',
      pin_activo: false,
    });
    setEditingUser(null);
  };

  const toggleShowPin = (userId) => {
    setShowPin(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Determinar si el formulario requiere contraseña
  const requiresPassword = formData.rol === 'administrador' || formData.rol === 'propietario';

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
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
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
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
            const esCajeroMesero = usuario.rol === 'cajero' || usuario.rol === 'mesero';
            
            return (
              <Card
                key={usuario.id}
                data-testid={`user-card-${usuario.id}`}
                className="p-4 md:p-6 relative overflow-hidden"
              >
                {/* Badge de rol en esquina */}
                <div className={`absolute top-0 right-0 ${rolInfo.badgeColor} text-white text-xs px-3 py-1 rounded-bl-lg font-medium`}>
                  {rolInfo.text}
                </div>
                
                <div className="flex items-start gap-3 mb-4 mt-2">
                  <div className={`w-12 h-12 ${rolInfo.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <RolIcon size={24} />
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

                {/* Sección de PIN */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key size={16} className={usuario.pin_activo ? 'text-green-600' : 'text-slate-400'} />
                      <span className="text-sm font-medium">PIN de Acceso</span>
                    </div>
                    {/* Solo mostrar toggle para propietario/admin */}
                    {(usuario.rol === 'propietario' || usuario.rol === 'administrador') && (
                      <button
                        onClick={() => handleTogglePin(usuario)}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          usuario.pin_activo 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {usuario.pin_activo ? 'Activo' : 'Inactivo'}
                      </button>
                    )}
                    {/* Para cajeros/meseros siempre está activo */}
                    {esCajeroMesero && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">
                        Obligatorio
                      </span>
                    )}
                  </div>
                  
                  {usuario.pin && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold tracking-wider">
                          {showPin[usuario.id] ? usuario.pin : '••••'}
                        </span>
                        <button
                          onClick={() => toggleShowPin(usuario.id)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {showPin[usuario.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openPinDialog(usuario)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Cambiar PIN"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleGeneratePin(usuario.id)}
                          disabled={generatingPin}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Generar nuevo PIN"
                        >
                          <RefreshCw size={14} className={generatingPin ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!usuario.pin && usuario.pin_activo && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => handleGeneratePin(usuario.id)}
                    >
                      <Key size={14} className="mr-2" />
                      Generar PIN
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span>Creado: {new Date(usuario.creado).toLocaleDateString('es-ES')}</span>
                </div>

                {usuario.rol !== 'propietario' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(usuario)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                    >
                      <Pencil size={14} />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(usuario.id)}
                      data-testid={`delete-user-${usuario.id}`}
                      variant="destructive"
                      size="sm"
                      className="flex-1 gap-1"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para crear/editar empleado */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent data-testid="user-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
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
                  <SelectItem value="mesero">Mesero</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Administrador:</strong> Acceso completo, usa contraseña<br />
                <strong>Cajero:</strong> Solo ventas, usa PIN<br />
                <strong>Mesero:</strong> Solo pedidos, usa PIN
              </p>
            </div>

            {/* Campos de contraseña solo para administradores */}
            {requiresPassword && (
              <div>
                <Label htmlFor="password">
                  Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                </Label>
                <Input
                  id="password"
                  data-testid="user-password-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser && requiresPassword}
                />
              </div>
            )}

            {/* Campos de PIN para cajeros/meseros */}
            {!requiresPassword && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={18} className="text-blue-600" />
                  <span className="font-medium text-blue-800">Acceso por PIN</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Los cajeros y meseros acceden al sistema usando un PIN de 4 dígitos.
                  {!editingUser && ' Se generará automáticamente al crear el empleado.'}
                </p>
                {editingUser && formData.pin && (
                  <div className="flex items-center gap-2">
                    <Label>PIN actual:</Label>
                    <span className="font-mono font-bold">{formData.pin}</span>
                  </div>
                )}
              </div>
            )}

            {/* Opción de PIN para administradores */}
            {requiresPassword && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key size={18} className="text-slate-600" />
                    <span className="font-medium">Habilitar acceso por PIN</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pin_activo: !formData.pin_activo })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.pin_activo ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.pin_activo ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Permite al administrador acceder también con PIN
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowDialog(false); resetForm(); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="save-user-button"
                className="flex-1"
              >
                {editingUser ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para cambiar PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar PIN</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Ingresa un nuevo PIN de 4 dígitos para <strong>{selectedUserForPin?.nombre}</strong>
            </p>
            <Input
              type="text"
              maxLength={6}
              placeholder="Nuevo PIN (4-6 dígitos)"
              className="text-center text-2xl font-mono tracking-widest"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                e.target.value = value;
              }}
              id="new-pin-input"
            />
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              const input = document.getElementById('new-pin-input');
              handleUpdatePin(input.value);
            }}>
              Guardar PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
