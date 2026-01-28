import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
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
import { 
  Plus, Trash2, Users as UsersIcon, Shield, User, Key, 
  RefreshCw, Pencil, Eye, EyeOff, ShieldCheck, Settings,
  Store, FileText, ChevronDown, ChevronUp, Check, X
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configuración de permisos para mostrar en la UI
const PERMISOS_POS_CONFIG = [
  { key: 'ver_productos', label: 'Ver productos', descripcion: 'Puede ver el catálogo de productos' },
  { key: 'agregar_ticket', label: 'Agregar al ticket', descripcion: 'Puede agregar productos al ticket' },
  { key: 'guardar_ticket', label: 'Guardar ticket', descripcion: 'Puede guardar tickets/mesas' },
  { key: 'recuperar_tickets_propios', label: 'Recuperar tickets propios', descripcion: 'Puede ver sus propios tickets guardados' },
  { key: 'recuperar_tickets_otros', label: 'Recuperar tickets de otros', descripcion: 'Puede ver tickets de otros empleados' },
  { key: 'cobrar', label: 'Cobrar (ticket interno)', descripcion: 'Puede procesar cobros sin FE' },
  { key: 'facturar_electronico', label: 'Facturar electrónicamente', descripcion: 'Puede emitir facturas electrónicas' },
  { key: 'aplicar_descuentos', label: 'Aplicar descuentos', descripcion: 'Puede aplicar descuentos a ventas' },
  { key: 'eliminar_items', label: 'Eliminar items del ticket', descripcion: 'Puede eliminar productos del ticket' },
  { key: 'anular_ventas', label: 'Anular/Reembolsar ventas', descripcion: 'Puede anular o reembolsar ventas' },
  { key: 'abrir_caja', label: 'Abrir caja', descripcion: 'Puede abrir una caja' },
  { key: 'cerrar_caja_propia', label: 'Cerrar caja propia', descripcion: 'Puede cerrar su propia caja' },
  { key: 'cerrar_caja_otros', label: 'Cerrar caja de otros', descripcion: 'Puede cerrar cajas de otros empleados' },
  { key: 'dividir_ticket', label: 'Dividir ticket', descripcion: 'Puede dividir un ticket en varios' },
  { key: 'cambiar_precio', label: 'Cambiar precio', descripcion: 'Puede modificar precios en el ticket' },
];

const PERMISOS_BACKOFFICE_CONFIG = [
  { key: 'ver_dashboard', label: 'Ver Dashboard', descripcion: 'Acceso al panel principal' },
  { key: 'ver_reportes', label: 'Ver todos los reportes', descripcion: 'Acceso a reportes completos' },
  { key: 'ver_reportes_propios', label: 'Ver reportes propios', descripcion: 'Solo sus propias ventas' },
  { key: 'ver_productos', label: 'Ver productos', descripcion: 'Puede ver catálogo en backoffice' },
  { key: 'gestionar_productos', label: 'Gestionar productos', descripcion: 'Crear, editar, eliminar productos' },
  { key: 'gestionar_categorias', label: 'Gestionar categorías', descripcion: 'Administrar categorías' },
  { key: 'ver_clientes', label: 'Ver clientes', descripcion: 'Acceso a lista de clientes' },
  { key: 'gestionar_clientes', label: 'Gestionar clientes', descripcion: 'Crear y editar clientes' },
  { key: 'gestionar_empleados', label: 'Gestionar empleados', descripcion: 'Administrar empleados' },
  { key: 'ver_configuracion', label: 'Ver configuración', descripcion: 'Ver ajustes del sistema' },
  { key: 'gestionar_configuracion', label: 'Gestionar configuración', descripcion: 'Modificar ajustes' },
  { key: 'gestionar_tpv', label: 'Gestionar TPV', descripcion: 'Administrar puntos de venta' },
  { key: 'gestionar_tiendas', label: 'Gestionar tiendas', descripcion: 'Administrar tiendas' },
  { key: 'gestionar_metodos_pago', label: 'Gestionar métodos de pago', descripcion: 'Configurar formas de pago' },
  { key: 'gestionar_impuestos', label: 'Gestionar impuestos', descripcion: 'Configurar impuestos' },
  { key: 'ver_facturacion_electronica', label: 'Ver Facturación Electrónica', descripcion: 'Acceso a FE' },
  { key: 'gestionar_facturacion_electronica', label: 'Gestionar FE', descripcion: 'Configurar FE' },
  { key: 'gestionar_perfiles', label: 'Gestionar perfiles', descripcion: 'Crear y editar perfiles' },
];

const getRolInfo = (rol) => {
  const roles = {
    propietario: { icon: Shield, color: 'bg-purple-100 text-purple-700', badgeColor: 'bg-purple-500', text: 'Propietario' },
    administrador: { icon: User, color: 'bg-blue-100 text-blue-700', badgeColor: 'bg-blue-500', text: 'Administrador' },
    cajero: { icon: UsersIcon, color: 'bg-green-100 text-green-700', badgeColor: 'bg-green-500', text: 'Cajero' },
    mesero: { icon: UsersIcon, color: 'bg-orange-100 text-orange-700', badgeColor: 'bg-orange-500', text: 'Mesero' },
    supervisor: { icon: ShieldCheck, color: 'bg-indigo-100 text-indigo-700', badgeColor: 'bg-indigo-500', text: 'Supervisor' },
    cocinero: { icon: Store, color: 'bg-red-100 text-red-700', badgeColor: 'bg-red-500', text: 'Cocinero' },
  };
  return roles[rol] || roles.cajero;
};

export default function Usuarios() {
  const [activeTab, setActiveTab] = useState('empleados');
  
  // Estados para Empleados
  const [usuarios, setUsuarios] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPin, setShowPin] = useState({});
  const [generatingPin, setGeneratingPin] = useState(false);
  
  const [userFormData, setUserFormData] = useState({
    nombre: '',
    username: '',
    password: '',
    rol: 'cajero',
    perfil_id: '',
    pin: '',
    pin_activo: false,
  });

  // Estados para Perfiles
  const [showPerfilDialog, setShowPerfilDialog] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState(null);
  const [expandedPerfil, setExpandedPerfil] = useState(null);
  
  const [perfilFormData, setPerfilFormData] = useState({
    nombre: '',
    descripcion: '',
    permisos_pos: {},
    permisos_backoffice: {},
  });

  const fetchUsuarios = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(response.data);
    } catch (error) {
      toast.error('Error al cargar empleados');
    }
  }, []);

  const fetchPerfiles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/perfiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPerfiles(response.data);
    } catch (error) {
      toast.error('Error al cargar perfiles');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsuarios(), fetchPerfiles()]);
      setLoading(false);
    };
    loadData();
  }, [fetchUsuarios, fetchPerfiles]);

  // ============ FUNCIONES DE EMPLEADOS ============
  
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const dataToSend = { ...userFormData };
      
      if (userFormData.rol === 'propietario') {
        toast.error('No puedes crear usuarios con rol propietario');
        return;
      }

      if (editingUser) {
        await axios.put(
          `${API_URL}/api/usuarios/${editingUser.id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Empleado actualizado');
      } else {
        await axios.post(
          `${API_URL}/api/usuarios`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Empleado creado');
      }
      
      setShowUserDialog(false);
      setEditingUser(null);
      resetUserForm();
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar empleado');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar este empleado?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/usuarios/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Empleado eliminado');
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar empleado');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      nombre: user.nombre,
      username: user.username,
      password: '',
      rol: user.rol,
      perfil_id: user.perfil_id || '',
      pin: user.pin || '',
      pin_activo: user.pin_activo || false,
    });
    setShowUserDialog(true);
  };

  const resetUserForm = () => {
    setUserFormData({
      nombre: '',
      username: '',
      password: '',
      rol: 'cajero',
      perfil_id: '',
      pin: '',
      pin_activo: false,
    });
  };

  const generatePin = async () => {
    setGeneratingPin(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/generar-pin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserFormData({ ...userFormData, pin: response.data.pin, pin_activo: true });
      toast.success('PIN generado');
    } catch (error) {
      toast.error('Error al generar PIN');
    } finally {
      setGeneratingPin(false);
    }
  };

  // ============ FUNCIONES DE PERFILES ============
  
  const handlePerfilSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingPerfil) {
        await axios.put(
          `${API_URL}/api/perfiles/${editingPerfil.id}`,
          perfilFormData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Perfil actualizado');
      } else {
        await axios.post(
          `${API_URL}/api/perfiles`,
          perfilFormData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Perfil creado');
      }
      
      setShowPerfilDialog(false);
      setEditingPerfil(null);
      resetPerfilForm();
      fetchPerfiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar perfil');
    }
  };

  const handleDeletePerfil = async (perfilId) => {
    if (!window.confirm('¿Estás seguro de eliminar este perfil?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/perfiles/${perfilId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Perfil eliminado');
      fetchPerfiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar perfil');
    }
  };

  const handleEditPerfil = (perfil) => {
    setEditingPerfil(perfil);
    setPerfilFormData({
      nombre: perfil.nombre,
      descripcion: perfil.descripcion || '',
      permisos_pos: perfil.permisos_pos || {},
      permisos_backoffice: perfil.permisos_backoffice || {},
    });
    setShowPerfilDialog(true);
  };

  const resetPerfilForm = () => {
    setPerfilFormData({
      nombre: '',
      descripcion: '',
      permisos_pos: {},
      permisos_backoffice: {},
    });
  };

  const togglePermiso = (tipo, key) => {
    const permisos = tipo === 'pos' ? 'permisos_pos' : 'permisos_backoffice';
    setPerfilFormData({
      ...perfilFormData,
      [permisos]: {
        ...perfilFormData[permisos],
        [key]: !perfilFormData[permisos][key],
      },
    });
  };

  // Contar permisos activos
  const contarPermisos = (permisos, config) => {
    if (!permisos) return 0;
    return config.filter(p => permisos[p.key]).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empleados y Seguridad</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona empleados y permisos del sistema</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="empleados" className="flex items-center gap-2">
            <UsersIcon size={16} />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="perfiles" className="flex items-center gap-2">
            <ShieldCheck size={16} />
            Perfiles y Permisos
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB EMPLEADOS ============ */}
        <TabsContent value="empleados" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetUserForm(); setEditingUser(null); setShowUserDialog(true); }}>
              <Plus size={16} className="mr-2" />
              Nuevo Empleado
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {usuarios.map((user) => {
              const rolInfo = getRolInfo(user.rol);
              const RolIcon = rolInfo.icon;
              
              return (
                <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${rolInfo.color}`}>
                        <RolIcon size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{user.nombre}</h3>
                        <p className="text-sm text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                    
                    {user.rol !== 'propietario' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${rolInfo.badgeColor}`}>
                        {user.perfil_nombre || rolInfo.text}
                      </span>
                    </div>
                    
                    {user.pin && (
                      <div className="flex items-center gap-2 text-sm">
                        <Key size={14} className="text-slate-400" />
                        <span className="text-slate-600">PIN:</span>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {showPin[user.id] ? user.pin : '••••'}
                        </span>
                        <button
                          onClick={() => setShowPin({ ...showPin, [user.id]: !showPin[user.id] })}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {showPin[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ============ TAB PERFILES ============ */}
        <TabsContent value="perfiles" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Los perfiles del sistema no se pueden editar. Crea perfiles personalizados para necesidades específicas.
            </p>
            <Button onClick={() => { resetPerfilForm(); setEditingPerfil(null); setShowPerfilDialog(true); }}>
              <Plus size={16} className="mr-2" />
              Nuevo Perfil
            </Button>
          </div>

          <div className="space-y-3">
            {perfiles.map((perfil) => (
              <Card key={perfil.id} className="overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedPerfil(expandedPerfil === perfil.id ? null : perfil.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${perfil.es_sistema ? 'bg-slate-100' : 'bg-blue-100'}`}>
                      <ShieldCheck size={20} className={perfil.es_sistema ? 'text-slate-600' : 'text-blue-600'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{perfil.nombre}</h3>
                        {perfil.es_sistema && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">Sistema</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{perfil.descripcion}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-slate-600">
                        <span className="font-medium text-green-600">{contarPermisos(perfil.permisos_pos, PERMISOS_POS_CONFIG)}</span> POS
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium text-blue-600">{contarPermisos(perfil.permisos_backoffice, PERMISOS_BACKOFFICE_CONFIG)}</span> Backoffice
                      </p>
                    </div>
                    
                    {perfil.nombre !== 'Propietario' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditPerfil(perfil); }}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePerfil(perfil.id); }}>
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    )}
                    
                    {expandedPerfil === perfil.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                
                {expandedPerfil === perfil.id && (
                  <div className="border-t p-4 bg-slate-50">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Permisos POS */}
                      <div>
                        <h4 className="font-semibold text-sm text-green-700 mb-3 flex items-center gap-2">
                          <Store size={16} />
                          Permisos POS
                        </h4>
                        <div className="space-y-1">
                          {PERMISOS_POS_CONFIG.map((p) => (
                            <div key={p.key} className="flex items-center gap-2 text-sm">
                              {perfil.permisos_pos?.[p.key] ? (
                                <Check size={14} className="text-green-600" />
                              ) : (
                                <X size={14} className="text-slate-300" />
                              )}
                              <span className={perfil.permisos_pos?.[p.key] ? 'text-slate-700' : 'text-slate-400'}>
                                {p.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Permisos Backoffice */}
                      <div>
                        <h4 className="font-semibold text-sm text-blue-700 mb-3 flex items-center gap-2">
                          <Settings size={16} />
                          Permisos Backoffice
                        </h4>
                        <div className="space-y-1">
                          {PERMISOS_BACKOFFICE_CONFIG.map((p) => (
                            <div key={p.key} className="flex items-center gap-2 text-sm">
                              {perfil.permisos_backoffice?.[p.key] ? (
                                <Check size={14} className="text-blue-600" />
                              ) : (
                                <X size={14} className="text-slate-300" />
                              )}
                              <span className={perfil.permisos_backoffice?.[p.key] ? 'text-slate-700' : 'text-slate-400'}>
                                {p.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============ DIALOG EMPLEADO ============ */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input
                id="nombre"
                value={userFormData.nombre}
                onChange={(e) => setUserFormData({ ...userFormData, nombre: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="username">Usuario *</Label>
              <Input
                id="username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">{editingUser ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}</Label>
              <Input
                id="password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            
            <div>
              <Label htmlFor="perfil">Perfil de permisos *</Label>
              <Select
                value={userFormData.perfil_id}
                onValueChange={(value) => {
                  const perfil = perfiles.find(p => p.id === value);
                  const rol = perfil?.nombre.toLowerCase() || 'cajero';
                  setUserFormData({ 
                    ...userFormData, 
                    perfil_id: value,
                    rol: ['propietario', 'administrador', 'cajero', 'mesero', 'supervisor', 'cocinero'].includes(rol) ? rol : 'cajero'
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un perfil" />
                </SelectTrigger>
                <SelectContent>
                  {perfiles.filter(p => p.nombre !== 'Propietario').map((perfil) => (
                    <SelectItem key={perfil.id} value={perfil.id}>
                      {perfil.nombre} {perfil.es_sistema && '(Sistema)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="border-t pt-4">
              <Label>PIN de acceso rápido</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={userFormData.pin}
                  onChange={(e) => setUserFormData({ ...userFormData, pin: e.target.value })}
                  placeholder="PIN de 4-6 dígitos"
                  maxLength={6}
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={generatePin} disabled={generatingPin}>
                  <RefreshCw size={16} className={generatingPin ? 'animate-spin' : ''} />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={userFormData.pin_activo}
                  onCheckedChange={(checked) => setUserFormData({ ...userFormData, pin_activo: checked })}
                />
                <span className="text-sm text-slate-600">PIN activo para login rápido</span>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUserDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingUser ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG PERFIL ============ */}
      <Dialog open={showPerfilDialog} onOpenChange={setShowPerfilDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPerfil ? 'Editar Perfil' : 'Nuevo Perfil'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handlePerfilSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="perfil_nombre">Nombre del perfil *</Label>
                <Input
                  id="perfil_nombre"
                  value={perfilFormData.nombre}
                  onChange={(e) => setPerfilFormData({ ...perfilFormData, nombre: e.target.value })}
                  placeholder="Ej: Cajero Senior"
                  required
                />
              </div>
              <div>
                <Label htmlFor="perfil_descripcion">Descripción</Label>
                <Input
                  id="perfil_descripcion"
                  value={perfilFormData.descripcion}
                  onChange={(e) => setPerfilFormData({ ...perfilFormData, descripcion: e.target.value })}
                  placeholder="Descripción breve del perfil"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 border-t pt-4">
              {/* Permisos POS */}
              <div>
                <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Store size={16} />
                  Permisos POS
                </h4>
                <div className="space-y-2">
                  {PERMISOS_POS_CONFIG.map((p) => (
                    <div key={p.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.descripcion}</p>
                      </div>
                      <Switch
                        checked={perfilFormData.permisos_pos[p.key] || false}
                        onCheckedChange={() => togglePermiso('pos', p.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Permisos Backoffice */}
              <div>
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Permisos Backoffice
                </h4>
                <div className="space-y-2">
                  {PERMISOS_BACKOFFICE_CONFIG.map((p) => (
                    <div key={p.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.descripcion}</p>
                      </div>
                      <Switch
                        checked={perfilFormData.permisos_backoffice[p.key] || false}
                        onCheckedChange={() => togglePermiso('backoffice', p.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPerfilDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPerfil ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
