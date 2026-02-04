import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Receipt, Users, Package, Store, UserCheck, Clock, 
  TrendingUp, AlertTriangle, Crown, Zap, Check, Loader2
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MiPlan() {
  const [plan, setPlan] = useState(null);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [processingPlan, setProcessingPlan] = useState(null);

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchMiPlan();
    fetchPlanes();
  }, []);

  const fetchMiPlan = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/mi-plan`, { headers });
      setPlan(response.data);
    } catch (error) {
      console.error('Error al cargar plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/planes`);
      setPlanesDisponibles(response.data);
    } catch (error) {
      console.error('Error al cargar planes:', error);
    }
  };

  const calcularPorcentaje = (uso, limite) => {
    if (limite === -1) return 0; // Ilimitado
    if (limite === 0) return 100;
    return Math.min((uso / limite) * 100, 100);
  };

  const getProgressColor = (porcentaje) => {
    if (porcentaje >= 90) return 'bg-red-500';
    if (porcentaje >= 70) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const formatLimite = (limite) => {
    if (limite === -1) return 'Ilimitado';
    return limite.toLocaleString();
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No se pudo cargar la información del plan
        </CardContent>
      </Card>
    );
  }

  const recursos = [
    { 
      key: 'facturas', 
      label: 'Facturas este mes', 
      uso: plan.uso_actual.facturas_mes, 
      limite: plan.limites.facturas,
      icon: Receipt 
    },
    { 
      key: 'usuarios', 
      label: 'Empleados', 
      uso: plan.uso_actual.usuarios, 
      limite: plan.limites.usuarios,
      icon: Users 
    },
    { 
      key: 'productos', 
      label: 'Productos', 
      uso: plan.uso_actual.productos, 
      limite: plan.limites.productos,
      icon: Package 
    },
    { 
      key: 'tpv', 
      label: 'Puntos de Venta', 
      uso: plan.uso_actual.tpvs, 
      limite: plan.limites.tpv,
      icon: Store 
    },
    { 
      key: 'clientes', 
      label: 'Clientes', 
      uso: plan.uso_actual.clientes, 
      limite: plan.limites.clientes,
      icon: UserCheck 
    }
  ];

  const hayAlerta = recursos.some(r => 
    r.limite !== -1 && calcularPorcentaje(r.uso, r.limite) >= 80
  );

  return (
    <div className="space-y-6" data-testid="mi-plan">
      {/* Cabecera del Plan */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${planColors[plan.plan_id] || 'bg-slate-500'}`}>
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{plan.plan_nombre}</h2>
                  <Badge className={planColors[plan.plan_id] || 'bg-slate-500'}>
                    ${plan.plan_precio}/{plan.plan_periodo}
                  </Badge>
                </div>
                {plan.dias_restantes && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {plan.dias_restantes > 0 
                      ? `${plan.dias_restantes} días restantes` 
                      : 'Plan vencido'}
                  </p>
                )}
              </div>
            </div>
            
            <Button onClick={() => setShowUpgradeDialog(true)}>
              <Zap className="w-4 h-4 mr-2" />
              Mejorar Plan
            </Button>
          </div>

          {hayAlerta && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <span>Estás cerca de alcanzar algunos límites de tu plan. Considera actualizar para seguir creciendo.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uso de Recursos */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recursos.map((recurso) => {
          const porcentaje = calcularPorcentaje(recurso.uso, recurso.limite);
          const Icon = recurso.icon;
          
          return (
            <Card key={recurso.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{recurso.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {recurso.uso} / {formatLimite(recurso.limite)}
                  </span>
                </div>
                
                {recurso.limite !== -1 ? (
                  <>
                    <Progress value={porcentaje} className="h-2" />
                    <div className={`h-2 rounded-full ${getProgressColor(porcentaje)}`} 
                         style={{ width: `${porcentaje}%`, marginTop: '-8px' }} />
                    {porcentaje >= 80 && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {porcentaje >= 100 ? 'Límite alcanzado' : 'Cerca del límite'}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    <span>Ilimitado</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Funciones del Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funciones de tu Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(plan.funciones).map(([key, value]) => (
              <div 
                key={key} 
                className={`p-3 rounded-lg border ${
                  value 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {value ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                  <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Upgrade */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mejorar tu Plan</DialogTitle>
            <DialogDescription>
              Elige el plan que mejor se adapte a las necesidades de tu negocio
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {planesDisponibles
              .filter(p => p.precio > plan.plan_precio)
              .map((planOp) => (
                <Card 
                  key={planOp.id} 
                  className={`cursor-pointer hover:border-blue-500 transition-colors ${
                    planOp.destacado ? 'border-blue-500 ring-2 ring-blue-100' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="text-center mb-4">
                      <Badge className={planColors[planOp.id] || 'bg-slate-500'}>
                        {planOp.nombre}
                      </Badge>
                      <div className="mt-2">
                        <span className="text-2xl font-bold">${planOp.precio}</span>
                        <span className="text-muted-foreground">/{planOp.periodo}</span>
                      </div>
                    </div>
                    
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        {formatLimite(planOp.limite_facturas)} facturas/mes
                      </li>
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        {formatLimite(planOp.limite_usuarios)} usuarios
                      </li>
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        {formatLimite(planOp.limite_productos)} productos
                      </li>
                    </ul>
                    
                    <Button className="w-full mt-4" variant={planOp.destacado ? 'default' : 'outline'}>
                      Seleccionar
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
          
          <DialogFooter>
            <p className="text-sm text-muted-foreground">
              ¿Necesitas ayuda? Contáctanos en soporte@posahora.com
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
