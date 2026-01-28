import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Wallet, DollarSign, TrendingUp, Clock, CheckCircle, ShoppingCart, Monitor, LogOut, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Caja({ onLogout }) {
  const navigate = useNavigate();
  const [cajaActiva, setCajaActiva] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApertura, setShowApertura] = useState(false);
  const [showCierre, setShowCierre] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');
  const [tpvsDisponibles, setTpvsDisponibles] = useState([]);
  const [selectedTpv, setSelectedTpv] = useState('');
  const [loadingTpvs, setLoadingTpvs] = useState(false);
  const [cierresCajaActivo, setCierresCajaActivo] = useState(true);
  
  // Estados para administración de cajas
  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  const [showCierreAdmin, setShowCierreAdmin] = useState(false);
  const [cajaParaCerrar, setCajaParaCerrar] = useState(null);
  const [efectivoContadoAdmin, setEfectivoContadoAdmin] = useState('');
  
  // Estado para mostrar el resumen después del cierre
  const [showResumenCierre, setShowResumenCierre] = useState(false);
  const [resumenCierre, setResumenCierre] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['propietario', 'administrador'].includes(user.rol);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Mantener pos_tienda_codigo para que no tengan que ingresarlo de nuevo
    
    if (onLogout) {
      onLogout();
    }
    navigate('/login-pos');
    toast.success('Sesión cerrada correctamente');
  };

  useEffect(() => {
    fetchCajaActiva();
    fetchHistorial();
    fetchFunciones();
    if (isAdmin) {
      fetchCajasAbiertas();
    }
  }, []);

  const fetchFunciones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/funciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCierresCajaActivo(response.data.cierres_caja ?? true);
    } catch (error) {
      console.error('Error al cargar funciones:', error);
    }
  };

  const fetchCajasAbiertas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/caja/abiertas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCajasAbiertas(response.data);
    } catch (error) {
      console.error('Error al cargar cajas abiertas:', error);
    }
  };

  const fetchTpvsDisponibles = async () => {
    setLoadingTpvs(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching TPVs disponibles...');
      const response = await axios.get(`${API_URL}/api/tpv/disponibles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('TPVs disponibles:', response.data);
      setTpvsDisponibles(response.data);
    } catch (error) {
      console.error('Error al cargar TPVs:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Error al cargar dispositivos TPV');
    } finally {
      setLoadingTpvs(false);
    }
  };

  useEffect(() => {
    fetchCajaActiva();
    fetchHistorial();
  }, []);

  const fetchCajaActiva = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/caja/activa`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCajaActiva(response.data);
    } catch (error) {
      console.error('Error al cargar caja activa:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/caja/historial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistorial(response.data);
    } catch (error) {
      toast.error('Error al cargar historial');
    }
  };

  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    
    if (!selectedTpv) {
      toast.error('Debes seleccionar un punto de venta');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/caja/abrir`,
        { 
          monto_inicial: cierresCajaActivo ? parseFloat(montoInicial || 0) : 0,
          tpv_id: selectedTpv
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCajaActiva(response.data);
      setShowApertura(false);
      setMontoInicial('');
      setSelectedTpv('');
      toast.success('Caja abierta correctamente');
      fetchHistorial();
      if (isAdmin) fetchCajasAbiertas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al abrir caja');
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/caja/cerrar`,
        { efectivo_contado: parseFloat(efectivoContado) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Guardar datos del cierre para mostrar resumen
      setResumenCierre(response.data);
      setShowCierre(false);
      setShowResumenCierre(true);
      
      setCajaActiva(null);
      setEfectivoContado('');
      fetchHistorial();
      if (isAdmin) fetchCajasAbiertas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar caja');
    }
  };

  const handleCerrarCajaAdmin = async (e) => {
    e.preventDefault();
    if (!cajaParaCerrar) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/caja/cerrar-admin/${cajaParaCerrar.id}`,
        { efectivo_contado: parseFloat(efectivoContadoAdmin) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Guardar datos del cierre para mostrar resumen
      setResumenCierre(response.data);
      setShowCierreAdmin(false);
      setShowResumenCierre(true);
      
      setCajaParaCerrar(null);
      setEfectivoContadoAdmin('');
      fetchHistorial();
      fetchCajasAbiertas();
      fetchCajaActiva();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar caja');
    }
  };

  const abrirCierreAdmin = (caja) => {
    setCajaParaCerrar(caja);
    const montoInicial = caja.monto_inicial || 0;
    const montoVentas = caja.monto_ventas || 0;
    setEfectivoContadoAdmin((montoInicial + montoVentas).toFixed(2));
    setShowCierreAdmin(true);
  };

  const printCierreCaja = (caja) => {
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write('<html><head><title>Cierre de Caja</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: monospace; padding: 20px; font-size: 12px; }
      h1 { text-align: center; font-size: 16px; margin: 0; }
      h2 { font-size: 14px; margin: 15px 0 10px 0; }
      .header { text-align: center; margin-bottom: 15px; }
      .divider { border-top: 1px dashed #000; margin: 10px 0; }
      .item { display: flex; justify-content: space-between; margin: 8px 0; }
      .item-small { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
      .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 14px; }
      .section { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<h1>CIERRE DE CAJA</h1>');
    printWindow.document.write(`<p>${caja.numero}</p>`);
    printWindow.document.write('</div>');
    printWindow.document.write('<div class="divider"></div>');
    printWindow.document.write(`<p>Cajero: ${caja.usuario_nombre}</p>`);
    if (caja.tpv_nombre) {
      printWindow.document.write(`<p>TPV: ${caja.tpv_nombre}</p>`);
    }
    printWindow.document.write(
      `<p>Apertura: ${new Date(caja.fecha_apertura).toLocaleString('es-ES')}</p>`
    );
    printWindow.document.write(
      `<p>Cierre: ${new Date(caja.fecha_cierre).toLocaleString('es-ES')}</p>`
    );
    printWindow.document.write('<div class="divider"></div>');
    
    // Detalle de ventas por método de pago
    if (caja.ventas_por_metodo && caja.ventas_por_metodo.length > 0) {
      printWindow.document.write('<h2>VENTAS POR MÉTODO DE PAGO</h2>');
      printWindow.document.write('<div class="section">');
      caja.ventas_por_metodo.forEach(metodo => {
        printWindow.document.write(
          `<div class="item-small">
            <span>${metodo.metodo_nombre} (${metodo.cantidad || 0}):</span>
            <span>$${(metodo.total || 0).toFixed(2)}</span>
          </div>`
        );
      });
      printWindow.document.write('</div>');
      printWindow.document.write('<div class="divider"></div>');
    }
    
    printWindow.document.write(
      `<div class="item"><span>Base de Caja:</span><span>$${(caja.monto_inicial || 0).toFixed(2)}</span></div>`
    );
    printWindow.document.write(
      `<div class="item"><span>Ventas (${caja.total_ventas || 0}):</span><span>$${(caja.monto_ventas || 0).toFixed(2)}</span></div>`
    );
    printWindow.document.write(
      `<div class="total"><div class="item"><span>TOTAL ESPERADO:</span><span>$${(caja.monto_final || 0).toFixed(2)}</span></div></div>`
    );
    printWindow.document.write('<div class="divider"></div>');
    printWindow.document.write(
      `<div class="item"><span>Efectivo Contado:</span><span>$${(caja.efectivo_contado || 0).toFixed(2)}</span></div>`
    );
    const diferencia = caja.diferencia || 0;
    const diferenciaTxt = diferencia >= 0 ? `+$${diferencia.toFixed(2)}` : `-$${Math.abs(diferencia).toFixed(2)}`;
    printWindow.document.write(
      `<div class="item" style="font-weight: bold; color: ${diferencia >= 0 ? 'green' : 'red'}"><span>Diferencia:</span><span>${diferenciaTxt}</span></div>`
    );
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div data-testid="caja-page">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Gestión de Caja
          </h1>
          <p className="text-slate-600">Control de apertura y cierre de caja</p>
        </div>
        
        {/* Botón Cerrar Sesión - Solo para cajeros/meseros */}
        {!isAdmin && (
          <Button
            onClick={handleLogout}
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            data-testid="logout-button-caja"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </Button>
        )}
      </div>

      {cajaActiva ? (
        <Card className="p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Caja Abierta</h2>
              <p className="text-sm text-slate-500">{cajaActiva.numero}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Base de Caja</p>
              <p className="text-2xl font-bold font-mono text-blue-900">
                ${(cajaActiva.monto_inicial || 0).toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 mb-1">Ventas ({cajaActiva.total_ventas || 0})</p>
              <p className="text-2xl font-bold font-mono text-green-900">
                ${(cajaActiva.monto_ventas || 0).toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 mb-1">Total en Caja</p>
              <p className="text-2xl font-bold font-mono text-purple-900">
                ${(cajaActiva.monto_final || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate('/pos')}
              data-testid="ir-pos-button"
              size="lg"
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCart size={20} />
              Ir al Punto de Venta
            </Button>
            <Button
              onClick={() => setShowCierre(true)}
              data-testid="cerrar-caja-button"
              variant="destructive"
              size="lg"
              className="flex-1"
            >
              Cerrar Caja
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-8 md:p-12 text-center mb-6">
          <Wallet size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay caja abierta</h3>
          <p className="text-slate-500 mb-6">
            Debes abrir una caja antes de realizar ventas
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setShowApertura(true);
                fetchTpvsDisponibles();
              }}
              data-testid="abrir-caja-button"
              size="lg"
              className="gap-2"
            >
              <DollarSign size={20} />
              Abrir Caja
            </Button>
            <Button
              onClick={() => navigate('/pos')}
              data-testid="ir-pos-button-sin-caja"
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <ShoppingCart size={20} />
              Ir al Punto de Venta
            </Button>
          </div>
        </Card>
      )}

      {/* Sección de Cajas Abiertas - Solo para admins */}
      {isAdmin && cajasAbiertas.length > 0 && (
        <Card className="p-6 mb-6 border-2 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-amber-600" size={24} />
            <h2 className="text-xl font-bold text-amber-900">Cajas Abiertas ({cajasAbiertas.length})</h2>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            Como administrador, puedes cerrar cualquier caja abierta de tu organización.
          </p>
          <div className="space-y-3">
            {cajasAbiertas.map((caja) => (
              <div
                key={caja.id}
                className="p-4 bg-white rounded-lg border border-amber-300 flex flex-col md:flex-row md:justify-between md:items-center gap-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{caja.numero}</p>
                  <p className="text-sm text-slate-600">Cajero: {caja.usuario_nombre}</p>
                  {caja.tpv_nombre && (
                    <p className="text-xs text-slate-500">TPV: {caja.tpv_nombre}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Abierta: {new Date(caja.fecha_apertura).toLocaleString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Base: ${(caja.monto_inicial || 0).toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Ventas: ${(caja.monto_ventas || 0).toFixed(2)}</p>
                    <p className="text-lg font-bold font-mono text-blue-600">
                      Total: ${(caja.monto_final || 0).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    onClick={() => abrirCierreAdmin(caja)}
                    variant="destructive"
                    size="sm"
                  >
                    Cerrar Caja
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Historial */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Historial de Cajas</h2>
        {historial.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No hay historial</p>
        ) : (
          <div className="space-y-3">
            {historial.map((caja) => (
              <div
                key={caja.id}
                data-testid={`caja-${caja.id}`}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{caja.numero}</p>
                    <p className="text-sm text-slate-600">{caja.usuario_nombre}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(caja.fecha_apertura).toLocaleString('es-ES')}
                      {caja.fecha_cierre && ` - ${new Date(caja.fecha_cierre).toLocaleString('es-ES')}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Base: ${(caja.monto_inicial || 0).toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Ventas: ${(caja.monto_ventas || 0).toFixed(2)}</p>
                    <p className="text-lg font-bold font-mono text-blue-600">
                      Total: ${(caja.monto_final || 0).toFixed(2)}
                    </p>
                    {caja.estado === 'cerrada' && caja.efectivo_contado !== null && (
                      <>
                        <p className="text-sm text-slate-600 mt-1">
                          Contado: ${(caja.efectivo_contado || 0).toFixed(2)}
                        </p>
                        <p className={`text-sm font-semibold ${(caja.diferencia || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Diferencia: {(caja.diferencia || 0) >= 0 ? '+' : ''}{(caja.diferencia || 0).toFixed(2)}
                        </p>
                      </>
                    )}
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
                        caja.estado === 'abierta'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {caja.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog Apertura */}
      <Dialog open={showApertura} onOpenChange={(open) => {
        console.log('Dialog onOpenChange:', open);
        setShowApertura(open);
        if (open) {
          console.log('Calling fetchTpvsDisponibles...');
          fetchTpvsDisponibles();
        }
      }}>
        <DialogContent data-testid="apertura-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAbrirCaja} className="space-y-4">
            {/* Selector de TPV */}
            <div>
              <Label>Punto de Venta (TPV) *</Label>
              {loadingTpvs ? (
                <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-sm text-slate-600">Cargando dispositivos TPV...</p>
                </div>
              ) : tpvsDisponibles.length === 0 ? (
                <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    No hay dispositivos TPV disponibles. Ve a Configuración → Dispositivos TPV para crear uno o verifica que no estén ocupados.
                  </p>
                </div>
              ) : (
                <Select value={selectedTpv} onValueChange={setSelectedTpv}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecciona un punto de venta" />
                  </SelectTrigger>
                  <SelectContent>
                    {tpvsDisponibles.map((tpv) => (
                      <SelectItem key={tpv.id} value={tpv.id}>
                        <div className="flex items-center gap-2">
                          <Monitor size={16} />
                          <span>{tpv.nombre}</span>
                          {tpv.tienda_nombre && (
                            <span className="text-xs text-slate-500">({tpv.tienda_nombre})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Monto inicial - solo si cierre de caja por turnos está activo */}
            {cierresCajaActivo && (
              <div>
                <Label htmlFor="monto_inicial">Base de Caja (Monto Inicial) *</Label>
                <Input
                  id="monto_inicial"
                  data-testid="monto-inicial-input"
                  type="number"
                  step="0.01"
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)}
                  required
                  placeholder="0.00"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Ingresa el monto con el que inicias la caja
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApertura(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="confirmar-apertura-button"
                disabled={loadingTpvs || tpvsDisponibles.length === 0 || !selectedTpv}
                className="flex-1"
              >
                Abrir Caja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cierre */}
      <Dialog open={showCierre} onOpenChange={setShowCierre}>
        <DialogContent data-testid="cierre-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCerrarCaja} className="space-y-4">
            <p className="text-slate-600">
              Ingresa el efectivo contado en caja para cerrar el turno
            </p>

            {cajaActiva && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base de Caja:</span>
                    <span className="font-mono">${(cajaActiva.monto_inicial || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventas ({cajaActiva.total_ventas || 0}):</span>
                    <span className="font-mono">${(cajaActiva.monto_ventas || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total Esperado:</span>
                    <span className="font-mono text-blue-600">
                      ${(cajaActiva.monto_final || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="efectivo_contado">Efectivo Contado *</Label>
              <Input
                id="efectivo_contado"
                data-testid="efectivo-contado-input"
                type="number"
                step="0.01"
                value={efectivoContado}
                onChange={(e) => setEfectivoContado(e.target.value)}
                required
                placeholder="0.00"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                Cuenta el efectivo físico en caja e ingresa el monto total
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCierre(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="confirmar-cierre-button"
                variant="destructive"
                className="flex-1"
              >
                Cerrar Caja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cierre Admin */}
      <Dialog open={showCierreAdmin} onOpenChange={setShowCierreAdmin}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Cerrar Caja (Admin)</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCerrarCajaAdmin} className="space-y-4">
            {cajaParaCerrar && (
              <>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-900">{cajaParaCerrar.numero}</p>
                  <p className="text-sm text-amber-700">Cajero: {cajaParaCerrar.usuario_nombre}</p>
                  <p className="text-xs text-amber-600">
                    Abierta: {new Date(cajaParaCerrar.fecha_apertura).toLocaleString('es-ES')}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Base de Caja:</span>
                      <span className="font-mono">${(cajaParaCerrar.monto_inicial || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ventas:</span>
                      <span className="font-mono">${(cajaParaCerrar.monto_ventas || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Esperado:</span>
                      <span className="font-mono">${(cajaParaCerrar.monto_final || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="efectivo_admin">Efectivo Contado *</Label>
              <Input
                id="efectivo_admin"
                type="number"
                step="0.01"
                value={efectivoContadoAdmin}
                onChange={(e) => setEfectivoContadoAdmin(e.target.value)}
                required
                placeholder="0.00"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                Ingresa el efectivo contado para cerrar esta caja
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCierreAdmin(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
              >
                Cerrar Caja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ DIÁLOGO RESUMEN DE CIERRE ============ */}
      <Dialog open={showResumenCierre} onOpenChange={setShowResumenCierre}>
        <DialogContent className="max-w-md mx-4" data-testid="resumen-cierre-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle size={24} />
              Caja Cerrada Correctamente
            </DialogTitle>
          </DialogHeader>

          {resumenCierre && (
            <div className="space-y-4">
              {/* Info general */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Caja:</span>
                  <span className="font-medium">{resumenCierre.numero}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cajero:</span>
                  <span className="font-medium">{resumenCierre.usuario_nombre}</span>
                </div>
                {resumenCierre.tpv_nombre && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">TPV:</span>
                    <span className="font-medium">{resumenCierre.tpv_nombre}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Apertura:</span>
                  <span className="font-medium">
                    {resumenCierre.fecha_apertura 
                      ? new Date(resumenCierre.fecha_apertura).toLocaleString('es-ES')
                      : 'No disponible'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cierre:</span>
                  <span className="font-medium">
                    {resumenCierre.fecha_cierre 
                      ? new Date(resumenCierre.fecha_cierre).toLocaleString('es-ES')
                      : 'No disponible'}
                  </span>
                </div>
              </div>

              {/* Ventas por método de pago */}
              {resumenCierre.ventas_por_metodo && resumenCierre.ventas_por_metodo.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">Ventas por Método de Pago</h4>
                  <div className="space-y-1">
                    {resumenCierre.ventas_por_metodo.map((metodo, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600">{metodo.metodo_nombre} ({metodo.cantidad}):</span>
                        <span className="font-medium">${(metodo.total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen de montos */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Base de Caja:</span>
                  <span className="font-medium">${(resumenCierre.monto_inicial || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Ventas ({resumenCierre.total_ventas || 0}):</span>
                  <span className="font-medium">${(resumenCierre.monto_ventas || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total Esperado:</span>
                  <span>${(resumenCierre.monto_final || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Conteo y diferencia */}
              <div className="bg-slate-100 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Efectivo Contado:</span>
                  <span className="font-medium">${(resumenCierre.efectivo_contado || 0).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-semibold ${(resumenCierre.diferencia || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Diferencia:</span>
                  <span>
                    {(resumenCierre.diferencia || 0) >= 0 ? '+' : '-'}${Math.abs(resumenCierre.diferencia || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResumenCierre(false);
                    setResumenCierre(null);
                    navigate(-1);
                  }}
                  className="flex-1 flex items-center justify-center gap-2"
                  data-testid="volver-btn"
                >
                  <ArrowLeft size={16} />
                  Volver
                </Button>
                <Button
                  onClick={() => {
                    printCierreCaja(resumenCierre);
                  }}
                  className="flex-1 flex items-center justify-center gap-2"
                  data-testid="imprimir-cierre-btn"
                >
                  <Printer size={16} />
                  Imprimir
                </Button>
              </div>
              
              {/* Botón para cerrar sin hacer nada */}
              <Button
                variant="ghost"
                onClick={() => {
                  setShowResumenCierre(false);
                  setResumenCierre(null);
                  toast.success('Caja cerrada correctamente');
                }}
                className="w-full text-slate-500"
                data-testid="cerrar-resumen-btn"
              >
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
