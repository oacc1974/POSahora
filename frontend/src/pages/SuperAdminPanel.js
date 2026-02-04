import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { 
  Building2, Users, Receipt, DollarSign, TrendingUp, 
  Edit, Trash2, Plus, Eye, EyeOff, Star, Package,
  Store, UserCheck, Clock
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperAdminPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [organizaciones, setOrganizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estados para diálogos
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showCambiarPlanDialog, setShowCambiarPlanDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchDashboard();
    fetchPlanes();
    fetchOrganizaciones();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/superadmin/dashboard`, { headers });
      setDashboard(response.data);
    } catch (error) {
      toast.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/superadmin/planes`, { headers });
      setPlanes(response.data);
    } catch (error) {
      console.error('Error al cargar planes:', error);
    }
  };

  const fetchOrganizaciones = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/superadmin/organizaciones`, { headers });
      setOrganizaciones(response.data);
    } catch (error) {
      console.error('Error al cargar organizaciones:', error);
    }
  };

  const handleCambiarPlan = async (orgId, planId) => {
    try {
      await axios.put(`${API_URL}/api/superadmin/organizaciones/${orgId}/plan`, 
        { plan_id: planId }, 
        { headers }
      );
      toast.success('Plan cambiado exitosamente');
      fetchOrganizaciones();
      fetchDashboard();
      setShowCambiarPlanDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('¿Estás seguro de eliminar este plan?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/superadmin/planes/${planId}`, { headers });
      toast.success('Plan eliminado');
      fetchPlanes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar plan');
    }
  };

  const planColors = {
    gratis: 'bg-slate-500',
    basico: 'bg-blue-500',
    pro: 'bg-purple-500',
    enterprise: 'bg-amber-500',
    premium: 'bg-emerald-500'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="superadmin-panel">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Panel de Super Administrador</h1>
          <p className="text-muted-foreground">Gestiona planes y clientes del sistema</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="organizaciones">Organizaciones</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Organizaciones</p>
                    <p className="text-2xl font-bold">{dashboard?.total_organizaciones || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usuarios Totales</p>
                    <p className="text-2xl font-bold">{dashboard?.total_usuarios || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Receipt className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Facturas del Mes</p>
                    <p className="text-2xl font-bold">{dashboard?.total_facturas_mes || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos Estimados</p>
                    <p className="text-2xl font-bold">${dashboard?.ingresos_mensuales_estimados || 0}/mes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organizaciones por Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {dashboard?.organizaciones_por_plan && Object.entries(dashboard.organizaciones_por_plan).map(([plan, count]) => (
                  <div key={plan} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Badge className={planColors[plan] || 'bg-slate-500'}>{plan}</Badge>
                    <span className="font-semibold">{count} orgs</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Organizaciones Recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Organizaciones Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.organizaciones_recientes?.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{org.nombre}</p>
                      <p className="text-sm text-muted-foreground">{org.propietario} - {org.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={planColors[org.plan] || 'bg-slate-500'}>{org.plan}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(org.fecha_creacion).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planes Tab */}
        <TabsContent value="planes" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gestión de Planes</h2>
            <Button onClick={() => { setEditingPlan(null); setShowPlanDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Plan
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planes.map((plan) => (
              <Card key={plan.id} className={!plan.activo ? 'opacity-50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {plan.nombre}
                        {plan.destacado && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      </CardTitle>
                      <CardDescription>{plan.descripcion}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={plan.visible_en_web ? 'default' : 'secondary'}>
                        {plan.visible_en_web ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 bg-muted rounded-lg">
                    <span className="text-3xl font-bold">${plan.precio}</span>
                    <span className="text-muted-foreground">/{plan.periodo}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span>{plan.limite_facturas === -1 ? '∞' : plan.limite_facturas} facturas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{plan.limite_usuarios === -1 ? '∞' : plan.limite_usuarios} usuarios</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span>{plan.limite_productos === -1 ? '∞' : plan.limite_productos} productos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span>{plan.limite_tpv === -1 ? '∞' : plan.limite_tpv} TPV</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setEditingPlan(plan); setShowPlanDialog(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Organizaciones Tab */}
        <TabsContent value="organizaciones" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Todas las Organizaciones ({organizaciones.length})</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Organización</th>
                      <th className="text-left p-4 font-medium">Propietario</th>
                      <th className="text-left p-4 font-medium">Plan</th>
                      <th className="text-left p-4 font-medium">Uso</th>
                      <th className="text-left p-4 font-medium">Última Actividad</th>
                      <th className="text-left p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizaciones.map((org) => (
                      <tr key={org.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{org.nombre}</p>
                            <p className="text-sm text-muted-foreground">{org.codigo_tienda}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{org.propietario_nombre}</p>
                            <p className="text-sm text-muted-foreground">{org.propietario_email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={planColors[org.plan] || 'bg-slate-500'}>
                            {org.plan || 'gratis'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1">
                              <Receipt className="w-3 h-3" />
                              <span>{org.uso?.facturas_mes || 0} facturas/mes</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{org.uso?.usuarios || 0} usuarios</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              <span>{org.uso?.productos || 0} productos</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {org.ultima_actividad 
                              ? new Date(org.ultima_actividad).toLocaleDateString() 
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => { setSelectedOrg(org); setShowCambiarPlanDialog(true); }}
                          >
                            Cambiar Plan
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Cambiar Plan */}
      <Dialog open={showCambiarPlanDialog} onOpenChange={setShowCambiarPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Plan de {selectedOrg?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Plan actual: <Badge>{selectedOrg?.plan || 'gratis'}</Badge>
            </p>
            <div className="grid gap-2">
              {planes.map((plan) => (
                <Button
                  key={plan.id}
                  variant={selectedOrg?.plan === plan.id ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleCambiarPlan(selectedOrg?.id, plan.id)}
                >
                  <div className="flex items-center gap-2">
                    <Badge className={planColors[plan.id] || 'bg-slate-500'}>{plan.nombre}</Badge>
                    <span className="text-muted-foreground">${plan.precio}/{plan.periodo}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Crear/Editar Plan */}
      <PlanFormDialog
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
        plan={editingPlan}
        onSave={() => {
          fetchPlanes();
          setShowPlanDialog(false);
        }}
        headers={headers}
      />
    </div>
  );
}

// Componente separado para el formulario de plan
function PlanFormDialog({ open, onOpenChange, plan, onSave, headers }) {
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    moneda: 'USD',
    periodo: 'mensual',
    limite_facturas: 50,
    limite_usuarios: 1,
    limite_productos: 50,
    limite_tpv: 1,
    limite_clientes: 20,
    dias_historial: 7,
    funciones: {
      facturacion_electronica: false,
      reportes_avanzados: false,
      tickets_abiertos: false,
      multi_tienda: false,
      logo_ticket: false,
      exportar_excel: false,
      soporte_prioritario: false
    },
    visible_en_web: true,
    activo: true,
    destacado: false,
    orden: 1,
    color: '#3b82f6'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        ...plan,
        funciones: plan.funciones || {}
      });
    } else {
      setFormData({
        id: '',
        nombre: '',
        descripcion: '',
        precio: 0,
        moneda: 'USD',
        periodo: 'mensual',
        limite_facturas: 50,
        limite_usuarios: 1,
        limite_productos: 50,
        limite_tpv: 1,
        limite_clientes: 20,
        dias_historial: 7,
        funciones: {
          facturacion_electronica: false,
          reportes_avanzados: false,
          tickets_abiertos: false,
          multi_tienda: false,
          logo_ticket: false,
          exportar_excel: false,
          soporte_prioritario: false
        },
        visible_en_web: true,
        activo: true,
        destacado: false,
        orden: 1,
        color: '#3b82f6'
      });
    }
  }, [plan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (plan) {
        await axios.put(`${API_URL}/api/superadmin/planes/${plan.id}`, formData, { headers });
        toast.success('Plan actualizado');
      } else {
        await axios.post(`${API_URL}/api/superadmin/planes`, formData, { headers });
        toast.success('Plan creado');
      }
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plan' : 'Nuevo Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ID (único)</Label>
              <Input
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                disabled={!!plan}
                required
              />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <Input
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Precio</Label>
              <Input
                type="number"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label>Periodo</Label>
              <Select value={formData.periodo} onValueChange={(v) => setFormData({ ...formData, periodo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orden</Label>
              <Input
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) })}
                min="1"
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Límites (-1 = ilimitado)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Facturas/mes</Label>
                <Input
                  type="number"
                  value={formData.limite_facturas}
                  onChange={(e) => setFormData({ ...formData, limite_facturas: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Usuarios</Label>
                <Input
                  type="number"
                  value={formData.limite_usuarios}
                  onChange={(e) => setFormData({ ...formData, limite_usuarios: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Productos</Label>
                <Input
                  type="number"
                  value={formData.limite_productos}
                  onChange={(e) => setFormData({ ...formData, limite_productos: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>TPV</Label>
                <Input
                  type="number"
                  value={formData.limite_tpv}
                  onChange={(e) => setFormData({ ...formData, limite_tpv: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Clientes</Label>
                <Input
                  type="number"
                  value={formData.limite_clientes}
                  onChange={(e) => setFormData({ ...formData, limite_clientes: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Días historial</Label>
                <Input
                  type="number"
                  value={formData.dias_historial}
                  onChange={(e) => setFormData({ ...formData, dias_historial: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Funciones</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(formData.funciones).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                  <Switch
                    checked={formData.funciones[key]}
                    onCheckedChange={(v) => setFormData({
                      ...formData,
                      funciones: { ...formData.funciones, [key]: v }
                    })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.visible_en_web}
                onCheckedChange={(v) => setFormData({ ...formData, visible_en_web: v })}
              />
              <Label>Visible en web</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.activo}
                onCheckedChange={(v) => setFormData({ ...formData, activo: v })}
              />
              <Label>Activo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.destacado}
                onCheckedChange={(v) => setFormData({ ...formData, destacado: v })}
              />
              <Label>Destacado</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
