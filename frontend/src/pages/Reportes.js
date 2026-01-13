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
  FileText, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  User, 
  Store, 
  Monitor,
  Filter,
  Download,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Reportes() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [cajeroId, setCajeroId] = useState('');
  const [tiendaId, setTiendaId] = useState('');
  const [tpvId, setTpvId] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  
  // Datos para filtros
  const [empleados, setEmpleados] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [tpvs, setTpvs] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  
  // Datos del usuario
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['propietario', 'administrador'].includes(user?.rol);

  useEffect(() => {
    loadFilterData();
    // Establecer fecha de hoy como predeterminada
    const today = new Date().toISOString().split('T')[0];
    setFechaHasta(today);
    // Una semana atrás
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFechaDesde(weekAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const loadFilterData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [empRes, tiendaRes, tpvRes, metodosRes] = await Promise.all([
        axios.get(`${API_URL}/api/empleados-filtro`, { headers }),
        axios.get(`${API_URL}/api/tiendas`, { headers }),
        axios.get(`${API_URL}/api/tpv`, { headers }),
        axios.get(`${API_URL}/api/metodos-pago`, { headers })
      ]);
      
      setEmpleados(empRes.data || []);
      setTiendas(tiendaRes.data || []);
      setTpvs(tpvRes.data || []);
      setMetodosPago(metodosRes.data || []);
    } catch (error) {
      console.error('Error al cargar datos de filtros:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      if (cajeroId) params.append('cajero_id', cajeroId);
      if (tiendaId) params.append('tienda_id', tiendaId);
      if (tpvId) params.append('tpv_id', tpvId);
      if (metodoPagoId) params.append('metodo_pago_id', metodoPagoId);
      
      const response = await axios.get(
        `${API_URL}/api/dashboard?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (error) {
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    setFechaDesde(weekAgo.toISOString().split('T')[0]);
    setFechaHasta(today);
    setCajeroId('');
    setTiendaId('');
    setTpvId('');
    setMetodoPagoId('');
  };

  const tabs = [
    { id: 'ventas', label: 'Ventas', icon: DollarSign },
    { id: 'productos', label: 'Productos', icon: TrendingUp },
    { id: 'cajas', label: 'Cierres de Caja', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reportes</h1>
          <p className="text-slate-600">Analiza el rendimiento de tu negocio</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-600" />
          <h3 className="font-semibold">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Fecha Desde */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Desde</Label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
          
          {/* Fecha Hasta */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Hasta</Label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
          
          {/* Cajero */}
          {isAdmin && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Cajero</Label>
              <Select value={cajeroId} onValueChange={setCajeroId}>
                <SelectTrigger className="text-sm">
                  <User size={14} className="mr-2 text-slate-400" />
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los cajeros</SelectItem>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre} ({emp.rol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Tienda */}
          {isAdmin && tiendas.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Tienda</Label>
              <Select value={tiendaId} onValueChange={setTiendaId}>
                <SelectTrigger className="text-sm">
                  <Store size={14} className="mr-2 text-slate-400" />
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las tiendas</SelectItem>
                  {tiendas.map((tienda) => (
                    <SelectItem key={tienda.id} value={tienda.id}>
                      {tienda.nombre} ({tienda.codigo_establecimiento})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* TPV */}
          {isAdmin && tpvs.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">TPV</Label>
              <Select value={tpvId} onValueChange={setTpvId}>
                <SelectTrigger className="text-sm">
                  <Monitor size={14} className="mr-2 text-slate-400" />
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los TPV</SelectItem>
                  {tpvs.map((tpv) => (
                    <SelectItem key={tpv.id} value={tpv.id}>
                      {tpv.nombre} ({tpv.punto_emision})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Método de Pago */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Método Pago</Label>
            <Select value={metodoPagoId} onValueChange={setMetodoPagoId}>
              <SelectTrigger className="text-sm">
                <CreditCard size={14} className="mr-2 text-slate-400" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los métodos</SelectItem>
                {metodosPago.map((mp) => (
                  <SelectItem key={mp.id} value={mp.id}>
                    {mp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button onClick={fetchReportData} className="gap-2">
            <RefreshCw size={16} />
            Aplicar Filtros
          </Button>
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            Limpiar
          </Button>
        </div>
      </Card>

      {/* Contenido del Reporte */}
      {loading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Card>
      ) : (
        <>
          {activeTab === 'ventas' && <ReporteVentas data={data} />}
          {activeTab === 'productos' && <ReporteProductos data={data} />}
          {activeTab === 'cajas' && <ReporteCajas />}
        </>
      )}
    </div>
  );
}

function ReporteVentas({ data }) {
  if (!data) return null;
  
  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Ingresos</p>
              <p className="text-2xl font-bold text-slate-900">
                ${(data.total_ingresos || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Ventas</p>
              <p className="text-2xl font-bold text-slate-900">
                {data.total_ventas || 0}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ticket Promedio</p>
              <p className="text-2xl font-bold text-slate-900">
                ${data.total_ventas > 0 
                  ? (data.total_ingresos / data.total_ventas).toFixed(2) 
                  : '0.00'}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Ventas por Método de Pago */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ventas por Método de Pago</h3>
        {data.ventas_por_metodo && Object.keys(data.ventas_por_metodo).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(data.ventas_por_metodo).map(([metodo, valores]) => (
              <div key={metodo} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-slate-500" />
                  <span className="font-medium">{metodo}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">${valores.total.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">{valores.cantidad} ventas</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">No hay datos disponibles</p>
        )}
      </Card>
      
      {/* Ventas por Día */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ventas por Día</h3>
        {data.ventas_por_dia && Object.keys(data.ventas_por_dia).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(data.ventas_por_dia)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 7)
              .map(([fecha, valores]) => (
              <div key={fecha} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-500" />
                  <span className="font-medium">
                    {new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">${valores.total.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">{valores.cantidad} ventas</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">No hay datos disponibles</p>
        )}
      </Card>
      
      {/* Facturas Recientes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Facturas Recientes</h3>
        {data.facturas_recientes?.length > 0 ? (
          <div className="space-y-2">
            {data.facturas_recientes.map((factura) => (
              <div key={factura.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold">{factura.numero}</p>
                  <p className="text-sm text-slate-500">
                    {factura.vendedor_nombre} · {new Date(factura.fecha).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <p className="font-bold text-blue-600">${factura.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">No hay facturas recientes</p>
        )}
      </Card>
    </div>
  );
}

function ReporteProductos({ data }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Productos Más Vendidos</h3>
      <p className="text-slate-500 text-center py-8">
        Próximamente: Análisis de productos más vendidos
      </p>
    </Card>
  );
}

function ReporteCajas() {
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCajas();
  }, []);
  
  const fetchCajas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/caja/historial`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCajas(response.data);
    } catch (error) {
      console.error('Error al cargar historial de cajas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Historial de Cierres de Caja</h3>
      {cajas.length > 0 ? (
        <div className="space-y-3">
          {cajas.map((caja) => (
            <div key={caja.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{caja.numero}</span>
                  {caja.tpv_nombre && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {caja.tpv_nombre}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    caja.estado === 'abierta' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {caja.estado}
                  </span>
                </div>
                <span className="text-sm text-slate-500">
                  {new Date(caja.fecha_apertura).toLocaleDateString('es-ES')}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Monto Inicial</p>
                  <p className="font-semibold">${caja.monto_inicial.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Ventas</p>
                  <p className="font-semibold">${caja.monto_ventas.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Esperado</p>
                  <p className="font-semibold">${caja.monto_final.toFixed(2)}</p>
                </div>
                {caja.estado === 'cerrada' && (
                  <div>
                    <p className="text-slate-500">Diferencia</p>
                    <p className={`font-semibold ${
                      caja.diferencia >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {caja.diferencia >= 0 ? '+' : ''}${caja.diferencia?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                )}
              </div>
              {caja.tienda_nombre && (
                <p className="text-xs text-slate-500 mt-2">
                  Tienda: {caja.tienda_nombre}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-center py-8">No hay cierres de caja registrados</p>
      )}
    </Card>
  );
}
