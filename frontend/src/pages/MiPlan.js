import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { 
  Receipt, Users, Package, Store, UserCheck, Clock, 
  AlertTriangle, Crown, Zap, Check, Loader2, XCircle,
  CreditCard, Calendar, RefreshCw, History
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MiPlan() {
  const [plan, setPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchMiPlan();
    fetchSubscription();
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

  const fetchSubscription = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/suscripcion/actual`, { headers });
      setSubscription(response.data);
    } catch (error) {
      console.error('Error al cargar suscripción:', error);
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

  const fetchPagos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/mis-pagos`, { headers });
      setPagos(response.data);
      setShowHistoryDialog(true);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      toast.error('Error al cargar historial de pagos');
    }
  };

  const handleSubscribePlan = async (planId) => {
    setProcessingPlan(planId);
    try {
      const response = await axios.post(`${API_URL}/api/suscripcion/crear`, {
        plan_id: planId,
        origin_url: window.location.origin
      }, { headers });
      
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Error al crear suscripción:', error);
      toast.error(error.response?.data?.detail || 'Error al procesar la suscripción');
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const response = await axios.post(`${API_URL}/api/suscripcion/cancelar`, {
        cancel_at_period_end: true
      }, { headers });
      
      toast.success(response.data.message);
      setShowCancelDialog(false);
      fetchSubscription();
      fetchMiPlan();
    } catch (error) {
      console.error('Error al cancelar:', error);
      toast.error(error.response?.data?.detail || 'Error al cancelar suscripción');
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setReactivating(true);
    try {
      const response = await axios.post(`${API_URL}/api/suscripcion/reactivar`, {}, { headers });
      
      toast.success(response.data.message);
      fetchSubscription();
      fetchMiPlan();
    } catch (error) {
      console.error('Error al reactivar:', error);
      toast.error(error.response?.data?.detail || 'Error al reactivar suscripción');
    } finally {
      setReactivating(false);
    }
  };

  const calcularPorcentaje = (uso, limite) => {
    if (limite === -1) return 0;
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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const planColors = {
    gratis: 'bg-slate-500',
    basico: 'bg-blue-500',
    pro: 'bg-purple-500',
    enterprise: 'bg-amber-500',
    premium: 'bg-emerald-500'
  };

  const statusLabels = {
    active: { label: 'Activa', color: 'bg-green-500' },
    canceled: { label: 'Cancelada', color: 'bg-red-500' },
    past_due: { label: 'Pago pendiente', color: 'bg-amber-500' },
    trialing: { label: 'Prueba', color: 'bg-blue-500' }
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
    { key: 'facturas', label: 'Facturas este mes', uso: plan.uso_actual.facturas_mes, limite: plan.limites.facturas, icon: Receipt },
    { key: 'usuarios', label: 'Empleados', uso: plan.uso_actual.usuarios, limite: plan.limites.usuarios, icon: Users },
    { key: 'productos', label: 'Productos', uso: plan.uso_actual.productos, limite: plan.limites.productos, icon: Package },
    { key: 'tpv', label: 'Puntos de Venta', uso: plan.uso_actual.tpvs, limite: plan.limites.tpv, icon: Store },
    { key: 'clientes', label: 'Clientes', uso: plan.uso_actual.clientes, limite: plan.limites.clientes, icon: UserCheck }
  ];

  const hayAlerta = recursos.some(r => r.limite !== -1 && calcularPorcentaje(r.uso, r.limite) >= 80);
  const isPlanGratis = plan.plan_id === 'gratis';
  const hasActiveSubscription = subscription?.has_subscription && subscription?.status === 'active';
  const isCanceled = subscription?.cancel_at_period_end;

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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{plan.plan_nombre}</h2>
                  <Badge className={planColors[plan.plan_id] || 'bg-slate-500'}>
                    ${plan.plan_precio}/{plan.plan_periodo}
                  </Badge>
                  {subscription?.has_subscription && (
                    <Badge className={statusLabels[subscription.status]?.color || 'bg-slate-500'}>
                      {statusLabels[subscription.status]?.label || subscription.status}
                    </Badge>
                  )}
                </div>
                {subscription?.has_subscription && (
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {isCanceled ? 'Activo hasta:' : 'Próxima renovación:'} {formatDate(subscription.current_period_end)}
                    </span>
                    {subscription.days_remaining !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {subscription.days_remaining} días restantes
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchPagos}>
                <History className="w-4 h-4 mr-2" />
                Historial
              </Button>
              {isPlanGratis ? (
                <Button onClick={() => setShowUpgradeDialog(true)}>
                  <Zap className="w-4 h-4 mr-2" />
                  Mejorar Plan
                </Button>
              ) : hasActiveSubscription && !isCanceled ? (
                <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              ) : isCanceled ? (
                <Button onClick={handleReactivateSubscription} disabled={reactivating}>
                  {reactivating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Reactivar
                </Button>
              ) : (
                <Button onClick={() => setShowUpgradeDialog(true)}>
                  <Zap className="w-4 h-4 mr-2" />
                  Suscribirse
                </Button>
              )}
            </div>
          </div>

          {/* Alerta de cancelación programada */}
          {isCanceled && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Tu suscripción está cancelada y terminará el <strong>{formatDate(subscription.current_period_end)}</strong>. 
                Después de esa fecha, tu plan cambiará a Gratis. Puedes reactivar tu suscripción en cualquier momento.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta de límites */}
          {hayAlerta && !isCanceled && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Estás cerca de alcanzar algunos límites de tu plan. Considera actualizar para seguir creciendo.
              </AlertDescription>
            </Alert>
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
              Elige el plan que mejor se adapte a las necesidades de tu negocio. 
              Cobro mensual automático, cancela cuando quieras.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {planesDisponibles
              .filter(p => p.precio > 0)
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
                        <span className="text-muted-foreground">/mes</span>
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
                    
                    <Button 
                      className="w-full mt-4" 
                      variant={planOp.destacado ? 'default' : 'outline'}
                      onClick={() => handleSubscribePlan(planOp.id)}
                      disabled={processingPlan !== null}
                    >
                      {processingPlan === planOp.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Suscribirse
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
          
          <DialogFooter>
            <p className="text-sm text-muted-foreground">
              Pago seguro con Stripe. Cancela cuando quieras.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cancelación */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar suscripción?</DialogTitle>
            <DialogDescription>
              Tu suscripción seguirá activa hasta el final del período actual 
              ({formatDate(subscription?.current_period_end)}). Después de esa fecha, 
              tu plan cambiará a Gratis y perderás acceso a las funciones premium.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Puedes reactivar tu suscripción en cualquier momento antes de que termine el período.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Mantener suscripción
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={canceling}
            >
              {canceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sí, cancelar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Historial de Pagos */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Pagos</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            {pagos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay pagos registrados
              </p>
            ) : (
              <div className="space-y-2">
                {pagos.map((pago) => (
                  <div key={pago.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {pago.type === 'renewal' ? 'Renovación' : 
                         pago.type === 'cancellation' ? 'Cancelación' : 
                         pago.type === 'subscription' ? 'Suscripción' : 'Pago'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(pago.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      {pago.amount && (
                        <p className="font-medium">${pago.amount} {pago.currency?.toUpperCase()}</p>
                      )}
                      <Badge variant={pago.status === 'paid' ? 'default' : 'secondary'}>
                        {pago.status === 'paid' ? 'Pagado' : 
                         pago.status === 'canceled' ? 'Cancelado' : pago.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
