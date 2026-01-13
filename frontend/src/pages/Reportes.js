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
  Calendar, 
  User, 
  Store, 
  Monitor,
  Filter,
  RefreshCw,
  CreditCard,
  Package,
  Tag,
  Users,
  Percent,
  Receipt,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const REPORT_TYPES = [
  { id: 'resumen', name: 'Resumen de ventas', icon: TrendingUp, description: 'Vista general de las ventas' },
  { id: 'articulo', name: 'Ventas por artículo', icon: Package, description: 'Ventas por cada producto' },
  { id: 'categoria', name: 'Ventas por categoría', icon: Tag, description: 'Ventas agrupadas por categoría' },
  { id: 'empleado', name: 'Ventas por empleado', icon: Users, description: 'Rendimiento de ventas por empleado' },
  { id: 'tipo_pago', name: 'Ventas por tipo de pago', icon: CreditCard, description: 'Ventas según método de pago' },
  { id: 'ingresos', name: 'Ingresos', icon: DollarSign, description: 'Total de ingresos generados' },
  { id: 'descuentos', name: 'Descuentos', icon: Percent, description: 'Descuentos aplicados' },
  { id: 'impuestos', name: 'Impuestos', icon: Receipt, description: 'Impuestos cobrados' },
];

export default function Reportes() {
  const [selectedReport, setSelectedReport] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [facturas, setFacturas] = useState([]);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [cajeroId, setCajeroId] = useState('');
  const [tiendaId, setTiendaId] = useState('');
  const [tpvId, setTpvId] = useState('');
  
  // Datos para filtros
  const [empleados, setEmpleados] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [tpvs, setTpvs] = useState([]);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['propietario', 'administrador'].includes(user?.rol);

  useEffect(() => {
    loadFilterData();
    const today = new Date().toISOString().split('T')[0];
    setFechaHasta(today);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFechaDesde(weekAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (fechaDesde && fechaHasta) {
      fetchReportData();
    }
  }, [selectedReport, fechaDesde, fechaHasta]);

  const loadFilterData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [empRes, tiendaRes, tpvRes] = await Promise.all([
        axios.get(`${API_URL}/api/empleados-filtro`, { headers }),
        axios.get(`${API_URL}/api/tiendas`, { headers }),
        axios.get(`${API_URL}/api/tpv`, { headers })
      ]);
      
      setEmpleados(empRes.data || []);
      setTiendas(tiendaRes.data || []);
      setTpvs(tpvRes.data || []);
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
      
      const [dashboardRes, facturasRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/facturas?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setData(dashboardRes.data);
      setFacturas(facturasRes.data);
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
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (selectedReport) {
      case 'resumen':
        return <ReporteResumen data={data} facturas={facturas} />;
      case 'articulo':
        return <ReporteArticulo facturas={facturas} />;
      case 'categoria':
        return <ReporteCategoria facturas={facturas} />;
      case 'empleado':
        return <ReporteEmpleado facturas={facturas} />;
      case 'tipo_pago':
        return <ReporteTipoPago data={data} />;
      case 'ingresos':
        return <ReporteIngresos data={data} facturas={facturas} />;
      case 'descuentos':
        return <ReporteDescuentos facturas={facturas} />;
      case 'impuestos':
        return <ReporteImpuestos facturas={facturas} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar con tipos de reportes */}
      <div className="lg:w-72 flex-shrink-0">
        <Card className="p-4">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Reportes
          </h2>
          <div className="space-y-1">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedReport === report.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Icon size={18} className={selectedReport === report.id ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-sm font-medium">{report.name}</span>
                  {selectedReport === report.id && (
                    <ChevronRight size={16} className="ml-auto text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 space-y-4">
        {/* Filtros */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-slate-600" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            
            {isAdmin && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Cajero</Label>
                <Select value={cajeroId || "all"} onValueChange={(v) => setCajeroId(v === "all" ? "" : v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los cajeros</SelectItem>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {isAdmin && tiendas.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Tienda</Label>
                <Select value={tiendaId || "all"} onValueChange={(v) => setTiendaId(v === "all" ? "" : v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las tiendas</SelectItem>
                    {tiendas.map((tienda) => (
                      <SelectItem key={tienda.id} value={tienda.id}>
                        {tienda.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {isAdmin && tpvs.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">TPV</Label>
                <Select value={tpvId || "all"} onValueChange={(v) => setTpvId(v === "all" ? "" : v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los TPV</SelectItem>
                    {tpvs.map((tpv) => (
                      <SelectItem key={tpv.id} value={tpv.id}>
                        {tpv.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={fetchReportData} size="sm" className="gap-2">
              <RefreshCw size={14} />
              Aplicar Filtros
            </Button>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </Card>

        {/* Contenido del reporte */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {REPORT_TYPES.find(r => r.id === selectedReport)?.name}
          </h2>
          {renderReportContent()}
        </Card>
      </div>
    </div>
  );
}

// Componentes de cada tipo de reporte
function ReporteResumen({ data, facturas }) {
  if (!data) return <p className="text-slate-500">No hay datos disponibles</p>;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 mb-1">Total Ingresos</p>
          <p className="text-2xl font-bold text-green-700">${(data.total_ingresos || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">Total Ventas</p>
          <p className="text-2xl font-bold text-blue-700">{data.total_ventas || 0}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600 mb-1">Ticket Promedio</p>
          <p className="text-2xl font-bold text-purple-700">
            ${data.total_ventas > 0 ? (data.total_ingresos / data.total_ventas).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>
      
      {/* Ventas por día */}
      {data.ventas_por_dia && Object.keys(data.ventas_por_dia).length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Ventas por Día</h3>
          <div className="space-y-2">
            {Object.entries(data.ventas_por_dia)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([fecha, valores]) => (
              <div key={fecha} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">
                  {new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <div className="text-right">
                  <p className="font-bold">${valores.total.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{valores.cantidad} ventas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReporteArticulo({ facturas }) {
  const ventasPorArticulo = {};
  
  facturas.forEach(factura => {
    factura.items?.forEach(item => {
      const key = item.producto_nombre || item.nombre || 'Sin nombre';
      if (!ventasPorArticulo[key]) {
        ventasPorArticulo[key] = { cantidad: 0, total: 0 };
      }
      ventasPorArticulo[key].cantidad += item.cantidad || 1;
      ventasPorArticulo[key].total += item.subtotal || 0;
    });
  });
  
  const sortedItems = Object.entries(ventasPorArticulo)
    .sort(([, a], [, b]) => b.total - a.total);
  
  if (sortedItems.length === 0) {
    return <p className="text-slate-500 text-center py-8">No hay datos de artículos en el período seleccionado</p>;
  }
  
  return (
    <div className="space-y-2">
      {sortedItems.map(([nombre, valores], index) => (
        <div key={nombre} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-slate-400 w-6">{index + 1}.</span>
            <Package size={18} className="text-slate-400" />
            <span className="font-medium">{nombre}</span>
          </div>
          <div className="text-right">
            <p className="font-bold">${valores.total.toFixed(2)}</p>
            <p className="text-xs text-slate-500">{valores.cantidad} unidades</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReporteCategoria({ facturas }) {
  const ventasPorCategoria = {};
  
  facturas.forEach(factura => {
    factura.items?.forEach(item => {
      const categoria = item.categoria || 'Sin categoría';
      if (!ventasPorCategoria[categoria]) {
        ventasPorCategoria[categoria] = { cantidad: 0, total: 0 };
      }
      ventasPorCategoria[categoria].cantidad += item.cantidad || 1;
      ventasPorCategoria[categoria].total += item.subtotal || 0;
    });
  });
  
  const sortedItems = Object.entries(ventasPorCategoria)
    .sort(([, a], [, b]) => b.total - a.total);
  
  if (sortedItems.length === 0) {
    return <p className="text-slate-500 text-center py-8">No hay datos de categorías en el período seleccionado</p>;
  }
  
  return (
    <div className="space-y-2">
      {sortedItems.map(([categoria, valores]) => (
        <div key={categoria} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Tag size={18} className="text-slate-400" />
            <span className="font-medium">{categoria}</span>
          </div>
          <div className="text-right">
            <p className="font-bold">${valores.total.toFixed(2)}</p>
            <p className="text-xs text-slate-500">{valores.cantidad} productos</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReporteEmpleado({ facturas }) {
  const ventasPorEmpleado = {};
  
  facturas.forEach(factura => {
    const empleado = factura.vendedor_nombre || 'Sin asignar';
    if (!ventasPorEmpleado[empleado]) {
      ventasPorEmpleado[empleado] = { cantidad: 0, total: 0 };
    }
    ventasPorEmpleado[empleado].cantidad += 1;
    ventasPorEmpleado[empleado].total += factura.total || 0;
  });
  
  const sortedItems = Object.entries(ventasPorEmpleado)
    .sort(([, a], [, b]) => b.total - a.total);
  
  if (sortedItems.length === 0) {
    return <p className="text-slate-500 text-center py-8">No hay datos de empleados en el período seleccionado</p>;
  }
  
  return (
    <div className="space-y-2">
      {sortedItems.map(([empleado, valores], index) => (
        <div key={empleado} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-slate-400 w-6">{index + 1}.</span>
            <User size={18} className="text-slate-400" />
            <span className="font-medium">{empleado}</span>
          </div>
          <div className="text-right">
            <p className="font-bold">${valores.total.toFixed(2)}</p>
            <p className="text-xs text-slate-500">{valores.cantidad} ventas</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReporteTipoPago({ data }) {
  if (!data?.ventas_por_metodo || Object.keys(data.ventas_por_metodo).length === 0) {
    return <p className="text-slate-500 text-center py-8">No hay datos de métodos de pago en el período seleccionado</p>;
  }
  
  const total = Object.values(data.ventas_por_metodo).reduce((sum, v) => sum + v.total, 0);
  
  return (
    <div className="space-y-3">
      {Object.entries(data.ventas_por_metodo).map(([metodo, valores]) => {
        const porcentaje = total > 0 ? ((valores.total / total) * 100).toFixed(1) : 0;
        return (
          <div key={metodo} className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-slate-400" />
                <span className="font-medium">{metodo || 'Sin especificar'}</span>
              </div>
              <div className="text-right">
                <p className="font-bold">${valores.total.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{valores.cantidad} ventas · {porcentaje}%</p>
              </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReporteIngresos({ data, facturas }) {
  if (!data) return <p className="text-slate-500 text-center py-8">No hay datos disponibles</p>;
  
  const totalBruto = facturas.reduce((sum, f) => sum + (f.subtotal || f.total || 0), 0);
  const totalImpuestos = facturas.reduce((sum, f) => sum + (f.total_impuestos || 0), 0);
  const totalNeto = data.total_ingresos || 0;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-lg border">
          <p className="text-sm text-slate-600 mb-1">Subtotal (sin impuestos)</p>
          <p className="text-2xl font-bold">${totalBruto.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-600 mb-1">Impuestos</p>
          <p className="text-2xl font-bold text-orange-700">${totalImpuestos.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 mb-1">Total Neto</p>
          <p className="text-2xl font-bold text-green-700">${totalNeto.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center">
          <span className="text-blue-700">Total de transacciones</span>
          <span className="font-bold text-blue-800">{facturas.length}</span>
        </div>
      </div>
    </div>
  );
}

function ReporteDescuentos({ facturas }) {
  // Por ahora no hay sistema de descuentos implementado
  const totalDescuentos = facturas.reduce((sum, f) => sum + (f.descuento || 0), 0);
  
  return (
    <div className="text-center py-8">
      <Percent size={48} className="mx-auto text-slate-300 mb-4" />
      <p className="text-slate-500">Total descuentos aplicados: <strong>${totalDescuentos.toFixed(2)}</strong></p>
      <p className="text-sm text-slate-400 mt-2">
        El sistema de descuentos se puede habilitar en Configuración
      </p>
    </div>
  );
}

function ReporteImpuestos({ facturas }) {
  const impuestosPorTipo = {};
  
  facturas.forEach(factura => {
    factura.desglose_impuestos?.forEach(imp => {
      const key = imp.nombre || 'Impuesto';
      if (!impuestosPorTipo[key]) {
        impuestosPorTipo[key] = { tasa: imp.tasa, monto: 0 };
      }
      impuestosPorTipo[key].monto += imp.monto || 0;
    });
  });
  
  const totalImpuestos = Object.values(impuestosPorTipo).reduce((sum, v) => sum + v.monto, 0);
  
  if (Object.keys(impuestosPorTipo).length === 0) {
    return (
      <div className="text-center py-8">
        <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500">No hay impuestos registrados en el período seleccionado</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(impuestosPorTipo).map(([nombre, valores]) => (
          <div key={nombre} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Receipt size={18} className="text-slate-400" />
              <div>
                <span className="font-medium">{nombre}</span>
                <span className="text-sm text-slate-500 ml-2">({valores.tasa}%)</span>
              </div>
            </div>
            <p className="font-bold">${valores.monto.toFixed(2)}</p>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="flex justify-between items-center">
          <span className="text-orange-700 font-medium">Total Impuestos</span>
          <span className="text-xl font-bold text-orange-800">${totalImpuestos.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
