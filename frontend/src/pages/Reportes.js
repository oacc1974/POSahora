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
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  TrendingUp,
  Package,
  Tag,
  Users,
  Percent,
  Receipt,
  CreditCard,
  ChevronDown,
  Info,
  ClipboardList,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import DateRangePicker from '../components/DateRangePicker';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const REPORT_TYPES = [
  { id: 'resumen', name: 'Resumen de ventas', icon: TrendingUp },
  { id: 'articulo', name: 'Ventas por artículo', icon: Package },
  { id: 'categoria', name: 'Ventas por categoría', icon: Tag },
  { id: 'empleado', name: 'Ventas por empleado', icon: Users },
  { id: 'tipo_pago', name: 'Ventas por tipo de pago', icon: CreditCard },
  { id: 'ingresos', name: 'Ingresos', icon: DollarSign },
  { id: 'descuentos', name: 'Descuentos', icon: Percent },
  { id: 'impuestos', name: 'Impuestos', icon: Receipt },
  { id: 'tickets_abiertos', name: 'Tickets Abiertos', icon: ClipboardList },
];

export default function Reportes() {
  const [selectedReport, setSelectedReport] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  
  // Filtros - usando objeto de rango de fechas
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date()
  });
  const [tiendaId, setTiendaId] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  
  // Datos para filtros
  const [empleados, setEmpleados] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  
  // Estados para Tickets Abiertos
  const [ticketsAbiertos, setTicketsAbiertos] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['propietario', 'administrador'].includes(user?.rol);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    if (selectedReport === 'tickets_abiertos') {
      fetchTicketsAbiertos();
    } else if (dateRange?.from && dateRange?.to) {
      fetchReportData();
    }
  }, [selectedReport, dateRange, tiendaId, empleadoId]);

  const fetchTicketsAbiertos = async () => {
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tickets-abiertos-pos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTicketsAbiertos(response.data);
    } catch (error) {
      console.error('Error al cargar tickets:', error);
      toast.error('Error al cargar los tickets abiertos');
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleDeleteTicket = async (ticketId, ticketNombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el ticket "${ticketNombre}"?`)) return;
    
    setDeletingTicket(ticketId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Ticket "${ticketNombre}" eliminado correctamente`);
      fetchTicketsAbiertos();
    } catch (error) {
      console.error('Error al eliminar ticket:', error);
      toast.error('Error al eliminar el ticket');
    } finally {
      setDeletingTicket(null);
    }
  };

  const handleDeleteAllTickets = async () => {
    if (!window.confirm(`¿Estás seguro de eliminar los ${ticketsAbiertos.length} ticket(s) abiertos?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      for (const ticket of ticketsAbiertos) {
        await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticket.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      toast.success(`${ticketsAbiertos.length} ticket(s) eliminado(s) correctamente`);
      fetchTicketsAbiertos();
    } catch (error) {
      console.error('Error al eliminar tickets:', error);
      toast.error('Error al eliminar los tickets');
    }
  };

  const loadFilterData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [empRes, tiendaRes] = await Promise.all([
        axios.get(`${API_URL}/api/empleados-filtro`, { headers }),
        axios.get(`${API_URL}/api/tiendas`, { headers })
      ]);
      
      setEmpleados(empRes.data || []);
      setTiendas(tiendaRes.data || []);
    } catch (error) {
      console.error('Error al cargar filtros:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (dateRange?.from) params.append('fecha_desde', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('fecha_hasta', format(dateRange.to, 'yyyy-MM-dd'));
      if (tiendaId) params.append('tienda_id', tiendaId);
      if (empleadoId) params.append('cajero_id', empleadoId);
      
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

  const moveDateRange = (direction) => {
    if (!dateRange?.from || !dateRange?.to) return;
    const days = Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1;
    
    const newFrom = new Date(dateRange.from);
    const newTo = new Date(dateRange.to);
    
    if (direction === 'prev') {
      newFrom.setDate(newFrom.getDate() - days);
      newTo.setDate(newTo.getDate() - days);
    } else {
      newFrom.setDate(newFrom.getDate() + days);
      newTo.setDate(newTo.getDate() + days);
    }
    
    setDateRange({ from: newFrom, to: newTo });
  };

  // Función para exportar a CSV
  const exportToCSV = () => {
    if (!facturas || facturas.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    // Crear encabezados y filas según el tipo de reporte
    let csvContent = '';
    let filename = `reporte_${selectedReport}_${format(new Date(), 'yyyy-MM-dd')}.csv`;

    if (selectedReport === 'resumen') {
      csvContent = 'Fecha,Numero,Cliente,Total,Metodo Pago,Empleado\n';
      facturas.forEach(f => {
        csvContent += `"${f.fecha}","${f.numero}","${f.cliente_nombre || 'Sin cliente'}","${f.total}","${f.metodo_pago_nombre || 'Efectivo'}","${f.usuario_nombre || ''}"\n`;
      });
    } else if (selectedReport === 'articulo') {
      csvContent = 'Producto,Cantidad,Total\n';
      const grouped = {};
      facturas.forEach(f => {
        f.items?.forEach(item => {
          if (!grouped[item.nombre]) grouped[item.nombre] = { cantidad: 0, total: 0 };
          grouped[item.nombre].cantidad += item.cantidad;
          grouped[item.nombre].total += item.subtotal;
        });
      });
      Object.entries(grouped).forEach(([nombre, data]) => {
        csvContent += `"${nombre}","${data.cantidad}","${data.total.toFixed(2)}"\n`;
      });
    } else {
      // Exportación genérica
      csvContent = 'Fecha,Numero,Total\n';
      facturas.forEach(f => {
        csvContent += `"${f.fecha}","${f.numero}","${f.total}"\n`;
      });
    }

    // Crear y descargar archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('Reporte exportado correctamente');
  };

  const renderReportContent = () => {
    // Para tickets abiertos, no mostramos el loading general
    if (selectedReport === 'tickets_abiertos') {
      return <ReporteTicketsAbiertos 
        tickets={ticketsAbiertos} 
        loading={loadingTickets}
        onRefresh={fetchTicketsAbiertos}
        onDelete={handleDeleteTicket}
        onDeleteAll={handleDeleteAllTickets}
        deletingTicket={deletingTicket}
      />;
    }

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
        return <ReporteTipoPago data={data} facturas={facturas} />;
      case 'ingresos':
        return <ReporteIngresos facturas={facturas} />;
      case 'descuentos':
        return <ReporteDescuentos facturas={facturas} />;
      case 'impuestos':
        return <ReporteImpuestos facturas={facturas} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-0">
      {/* Header Verde */}
      <div className="bg-blue-600 text-white px-4 sm:px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Botón para mostrar/ocultar menú en móvil */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-blue-700 rounded-lg"
            >
              {showMobileMenu ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <h1 className="text-lg sm:text-xl font-semibold">
              {REPORT_TYPES.find(r => r.id === selectedReport)?.name || 'Reportes'}
            </h1>
          </div>
          
          {/* Botón Exportar CSV */}
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Download size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Exportar</span> CSV
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border-x border-b px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Navegación de Fechas con DateRangePicker */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => moveDateRange('prev')}
            className="p-1.5 hover:bg-slate-100 rounded-md border"
            data-testid="date-prev-btn"
          >
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <DateRangePicker 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange} 
          />
          <button 
            onClick={() => moveDateRange('next')}
            className="p-1.5 hover:bg-slate-100 rounded-md border"
            data-testid="date-next-btn"
          >
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Filtro Hora - oculto en móvil */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-lg">
          <Clock size={16} className="text-slate-400" />
          <span className="text-sm">Todo el día</span>
          <ChevronDown size={14} className="text-slate-400" />
        </div>

        {/* Filtro Tiendas */}
        {isAdmin && tiendas.length > 0 && (
          <Select value={tiendaId || "all"} onValueChange={(v) => setTiendaId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] sm:w-[180px] text-sm">
              <Store size={16} className="mr-2 text-slate-400" />
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tiendas</SelectItem>
              {tiendas.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro Empleados */}
        {isAdmin && (
          <Select value={empleadoId || "all"} onValueChange={(v) => setEmpleadoId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] sm:w-[180px] text-sm">
              <User size={16} className="mr-2 text-slate-400" />
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los empleados</SelectItem>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex gap-0">
        {/* Sidebar - oculto en móvil cuando showMobileMenu es false */}
        <div className={`${showMobileMenu ? 'block' : 'hidden'} md:block w-full md:w-56 bg-white border-l border-b rounded-bl-lg absolute md:relative z-10 md:z-auto`}>
          <div className="py-2">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => {
                    setSelectedReport(report.id);
                    setShowMobileMenu(false); // Ocultar menú en móvil al seleccionar
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-sm ${
                    selectedReport === report.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 text-slate-700 border-l-4 border-transparent'
                  }`}
                >
                  <Icon size={18} />
                  <span>{report.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido - ocupa todo el ancho en móvil cuando menú está oculto */}
        <div className={`${showMobileMenu ? 'hidden md:block' : 'block'} flex-1 bg-slate-50 border-r border-b rounded-br-lg p-3 sm:p-6`}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            renderReportContent()
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de Tarjeta de Métrica
function MetricCard({ title, value, change, changePercent, icon: Icon, color = 'green' }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-slate-600">{title}</span>
        <Info size={14} className="text-slate-400" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {change !== undefined && (
        <div className={`text-xs mt-1 ${isPositive ? 'text-blue-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{typeof change === 'number' ? `$${change.toFixed(2)}` : change}
          {changePercent !== undefined && ` (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)`}
        </div>
      )}
    </div>
  );
}

// REPORTE: Resumen de Ventas
function ReporteResumen({ data, facturas }) {
  const [chartType, setChartType] = useState('area');
  const [groupBy, setGroupBy] = useState('dias');
  
  if (!data) return <p className="text-slate-500">No hay datos disponibles</p>;
  
  // Función para obtener el número de semana
  const getWeekNumber = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };
  
  // Función para obtener rango de semana
  const getWeekRange = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getDate()} ${monday.toLocaleDateString('es-ES', { month: 'short' })} - ${sunday.getDate()} ${sunday.toLocaleDateString('es-ES', { month: 'short' })}`;
  };
  
  // Calcular datos para el gráfico por día
  const ventasPorDia = {};
  facturas.forEach(f => {
    const fecha = f.fecha?.split('T')[0] || '';
    if (fecha) {
      if (!ventasPorDia[fecha]) ventasPorDia[fecha] = 0;
      ventasPorDia[fecha] += f.total || 0;
    }
  });
  
  // Calcular datos para el gráfico por semana
  const ventasPorSemana = {};
  facturas.forEach(f => {
    const fecha = f.fecha?.split('T')[0] || '';
    if (fecha) {
      const weekKey = getWeekRange(fecha);
      if (!ventasPorSemana[weekKey]) {
        ventasPorSemana[weekKey] = { total: 0, firstDate: fecha };
      }
      ventasPorSemana[weekKey].total += f.total || 0;
      if (fecha < ventasPorSemana[weekKey].firstDate) {
        ventasPorSemana[weekKey].firstDate = fecha;
      }
    }
  });
  
  // Preparar datos según la agrupación seleccionada
  let chartData = [];
  let tableData = [];
  
  if (groupBy === 'dias') {
    const diasOrdenados = Object.keys(ventasPorDia).sort();
    chartData = diasOrdenados.map(dia => ({
      label: new Date(dia + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      ventas: ventasPorDia[dia],
      fechaCompleta: dia
    }));
    tableData = diasOrdenados.map(dia => ({
      fecha: new Date(dia + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      ventas: ventasPorDia[dia]
    }));
  } else {
    // Ordenar semanas por fecha
    const semanasOrdenadas = Object.entries(ventasPorSemana)
      .sort(([, a], [, b]) => a.firstDate.localeCompare(b.firstDate));
    chartData = semanasOrdenadas.map(([semana, datos]) => ({
      label: semana,
      ventas: datos.total,
      fechaCompleta: semana
    }));
    tableData = semanasOrdenadas.map(([semana, datos]) => ({
      fecha: semana,
      ventas: datos.total
    }));
  }
  
  return (
    <div className="space-y-6">
      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Ventas brutas" value={`$${(data.total_ingresos || 0).toFixed(2)}`} />
        <MetricCard title="Reembolsos" value="$0.00" />
        <MetricCard title="Descuentos" value="$0.00" />
        <MetricCard title="Ventas netas" value={`$${(data.total_ingresos || 0).toFixed(2)}`} />
        <MetricCard title="Beneficio bruto" value={`$${(data.total_ingresos || 0).toFixed(2)}`} />
      </div>

      {/* Gráfico con selectores funcionales */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Ventas brutas</h3>
          <div className="flex gap-2">
            <select 
              className="text-sm border rounded px-3 py-1.5 bg-white cursor-pointer"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              <option value="area">Área</option>
              <option value="bar">Bar</option>
            </select>
            <select 
              className="text-sm border rounded px-3 py-1.5 bg-white cursor-pointer"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="dias">Días</option>
              <option value="semanas">Semanas</option>
            </select>
          </div>
        </div>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#84cc16" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#84cc16" 
                  fillOpacity={1} 
                  fill="url(#colorVentas)" 
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar 
                  dataKey="ventas" 
                  fill="#84cc16" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400">
            No hay datos para mostrar en este período
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">EXPORTAR</span>
          <Download size={18} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{groupBy === 'dias' ? 'Fecha' : 'Semana'}</th>
                <th className="text-right px-4 py-3 font-medium">Ventas brutas</th>
                <th className="text-right px-4 py-3 font-medium">Reembolsos</th>
                <th className="text-right px-4 py-3 font-medium">Descuentos</th>
                <th className="text-right px-4 py-3 font-medium">Ventas netas</th>
                <th className="text-right px-4 py-3 font-medium">Costo bienes</th>
                <th className="text-right px-4 py-3 font-medium">Beneficio bruto</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{row.fecha}</td>
                  <td className="text-right px-4 py-3">${row.ventas.toFixed(2)}</td>
                  <td className="text-right px-4 py-3">$0.00</td>
                  <td className="text-right px-4 py-3">$0.00</td>
                  <td className="text-right px-4 py-3">${row.ventas.toFixed(2)}</td>
                  <td className="text-right px-4 py-3">$0.00</td>
                  <td className="text-right px-4 py-3">${row.ventas.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// REPORTE: Ventas por Artículo
function ReporteArticulo({ facturas }) {
  const [chartType, setChartType] = useState('area');
  const [groupBy, setGroupBy] = useState('dias');
  
  const ventasPorArticulo = {};
  const ventasPorDia = {};
  const ventasPorSemana = {};
  
  // Función para obtener rango de semana
  const getWeekRange = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getDate()} ${monday.toLocaleDateString('es-ES', { month: 'short' })} - ${sunday.getDate()} ${sunday.toLocaleDateString('es-ES', { month: 'short' })}`;
  };
  
  facturas.forEach(factura => {
    const fecha = factura.fecha?.split('T')[0] || '';
    if (fecha) {
      if (!ventasPorDia[fecha]) ventasPorDia[fecha] = 0;
      const weekKey = getWeekRange(fecha);
      if (!ventasPorSemana[weekKey]) {
        ventasPorSemana[weekKey] = { total: 0, firstDate: fecha };
      }
    }
    
    factura.items?.forEach(item => {
      const key = item.producto_nombre || item.nombre || 'Sin nombre';
      if (!ventasPorArticulo[key]) {
        ventasPorArticulo[key] = { cantidad: 0, total: 0, categoria: item.categoria || '-' };
      }
      ventasPorArticulo[key].cantidad += item.cantidad || 1;
      ventasPorArticulo[key].total += item.subtotal || 0;
      
      if (fecha) {
        ventasPorDia[fecha] += item.subtotal || 0;
        const weekKey = getWeekRange(fecha);
        ventasPorSemana[weekKey].total += item.subtotal || 0;
        if (fecha < ventasPorSemana[weekKey].firstDate) {
          ventasPorSemana[weekKey].firstDate = fecha;
        }
      }
    });
  });
  
  const sortedItems = Object.entries(ventasPorArticulo).sort(([, a], [, b]) => b.total - a.total);
  const top5 = sortedItems.slice(0, 5);
  const colores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  // Preparar datos según la agrupación seleccionada
  let chartData = [];
  if (groupBy === 'dias') {
    const diasOrdenados = Object.keys(ventasPorDia).sort();
    chartData = diasOrdenados.map(dia => ({
      label: new Date(dia + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      ventas: ventasPorDia[dia]
    }));
  } else {
    const semanasOrdenadas = Object.entries(ventasPorSemana)
      .sort(([, a], [, b]) => a.firstDate.localeCompare(b.firstDate));
    chartData = semanasOrdenadas.map(([semana, datos]) => ({
      label: semana,
      ventas: datos.total
    }));
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Los 5 mejores artículos</h3>
          <div className="space-y-3">
            {top5.map(([nombre, datos], i) => (
              <div key={nombre} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[i] }} />
                <span className="flex-1 text-sm truncate">{nombre}</span>
                <span className="font-medium">${datos.total.toFixed(2)}</span>
              </div>
            ))}
            {top5.length === 0 && (
              <p className="text-slate-400 text-sm">No hay artículos vendidos</p>
            )}
          </div>
        </div>

        {/* Gráfico con selectores funcionales */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Ventas netas</h3>
            <div className="flex gap-2">
              <select 
                className="text-sm border rounded px-3 py-1.5 bg-white cursor-pointer"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                <option value="area">Área</option>
                <option value="bar">Bar</option>
              </select>
              <select 
                className="text-sm border rounded px-3 py-1.5 bg-white cursor-pointer"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="dias">Días</option>
                <option value="semanas">Semanas</option>
              </select>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorVentasArticulo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVentasArticulo)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="ventas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400">
              No hay datos para mostrar
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">EXPORTAR</span>
          <Download size={18} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Artículo</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-right px-4 py-3 font-medium">Artículos vendidos</th>
                <th className="text-right px-4 py-3 font-medium">Ventas netas</th>
                <th className="text-right px-4 py-3 font-medium">Costo de los bienes</th>
                <th className="text-right px-4 py-3 font-medium">Beneficio bruto</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(([nombre, datos]) => (
                <tr key={nombre} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{datos.categoria}</td>
                  <td className="text-right px-4 py-3">{datos.cantidad}</td>
                  <td className="text-right px-4 py-3">${datos.total.toFixed(2)}</td>
                  <td className="text-right px-4 py-3">$0.00</td>
                  <td className="text-right px-4 py-3">${datos.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-sm text-slate-500">
          Página: 1 de 1
        </div>
      </div>
    </div>
  );
}

// REPORTE: Ventas por Categoría
function ReporteCategoria({ facturas }) {
  const ventasPorCategoria = {};
  
  facturas.forEach(factura => {
    factura.items?.forEach(item => {
      const cat = item.categoria || 'Sin categoría';
      if (!ventasPorCategoria[cat]) {
        ventasPorCategoria[cat] = { cantidad: 0, total: 0 };
      }
      ventasPorCategoria[cat].cantidad += item.cantidad || 1;
      ventasPorCategoria[cat].total += item.subtotal || 0;
    });
  });
  
  const sortedItems = Object.entries(ventasPorCategoria).sort(([, a], [, b]) => b.total - a.total);
  const colores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  
  // Datos para gráfico de barras
  const barData = sortedItems.slice(0, 7).map(([cat, datos], i) => ({
    categoria: cat.length > 12 ? cat.substring(0, 12) + '...' : cat,
    ventas: datos.total,
    fill: colores[i % colores.length]
  }));
  
  return (
    <div className="space-y-6">
      {/* Gráfico de barras */}
      {barData.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Ventas por categoría</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="categoria" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">EXPORTAR</span>
          <Download size={18} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-right px-4 py-3 font-medium">Artículos vendidos</th>
                <th className="text-right px-4 py-3 font-medium">Ventas netas</th>
                <th className="text-right px-4 py-3 font-medium">Costo de los bienes</th>
                <th className="text-right px-4 py-3 font-medium">Beneficio bruto</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(([cat, datos]) => (
                <tr key={cat} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{cat}</td>
                  <td className="text-right px-4 py-3">{datos.cantidad}</td>
                  <td className="text-right px-4 py-3">${datos.total.toFixed(2)}</td>
                  <td className="text-right px-4 py-3">$0.00</td>
                  <td className="text-right px-4 py-3">${datos.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-sm text-slate-500">
          Página: 1 de 1
        </div>
      </div>
    </div>
  );
}

// REPORTE: Ventas por Empleado
function ReporteEmpleado({ facturas }) {
  const ventasPorEmpleado = {};
  
  facturas.forEach(factura => {
    const emp = factura.vendedor_nombre || 'Sin asignar';
    if (!ventasPorEmpleado[emp]) {
      ventasPorEmpleado[emp] = { cantidad: 0, total: 0 };
    }
    ventasPorEmpleado[emp].cantidad += 1;
    ventasPorEmpleado[emp].total += factura.total || 0;
  });
  
  const sortedItems = Object.entries(ventasPorEmpleado).sort(([, a], [, b]) => b.total - a.total);
  
  return (
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">EXPORTAR</span>
        <Download size={18} className="text-slate-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nombre</th>
              <th className="text-right px-4 py-3 font-medium">Ventas brutas</th>
              <th className="text-right px-4 py-3 font-medium">Reembolsos</th>
              <th className="text-right px-4 py-3 font-medium">Descuentos</th>
              <th className="text-right px-4 py-3 font-medium">Ventas netas</th>
              <th className="text-right px-4 py-3 font-medium">Ingresos</th>
              <th className="text-right px-4 py-3 font-medium">Venta promedio</th>
              <th className="text-right px-4 py-3 font-medium">Clientes registrados</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(([nombre, datos]) => (
              <tr key={nombre} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">{nombre}</td>
                <td className="text-right px-4 py-3">${datos.total.toFixed(2)}</td>
                <td className="text-right px-4 py-3">$0.00</td>
                <td className="text-right px-4 py-3">$0.00</td>
                <td className="text-right px-4 py-3">${datos.total.toFixed(2)}</td>
                <td className="text-right px-4 py-3">{datos.cantidad}</td>
                <td className="text-right px-4 py-3">${datos.cantidad > 0 ? (datos.total / datos.cantidad).toFixed(2) : '0.00'}</td>
                <td className="text-right px-4 py-3">0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t text-sm text-slate-500 flex justify-between items-center">
        <span>Página: 1 de 1</span>
        <select className="border rounded px-2 py-1 text-sm">
          <option>Filas por página: 10</option>
        </select>
      </div>
    </div>
  );
}

// REPORTE: Ventas por Tipo de Pago
function ReporteTipoPago({ data, facturas }) {
  const ventasPorMetodo = {};
  
  facturas.forEach(factura => {
    const metodo = factura.metodo_pago_nombre || 'Sin especificar';
    if (!ventasPorMetodo[metodo]) {
      ventasPorMetodo[metodo] = { transacciones: 0, monto: 0 };
    }
    ventasPorMetodo[metodo].transacciones += 1;
    ventasPorMetodo[metodo].monto += factura.total || 0;
  });
  
  const sortedItems = Object.entries(ventasPorMetodo).sort(([, a], [, b]) => b.monto - a.monto);
  const total = sortedItems.reduce((sum, [, v]) => sum + v.monto, 0);
  const totalTx = sortedItems.reduce((sum, [, v]) => sum + v.transacciones, 0);
  
  return (
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">EXPORTAR</span>
        <Download size={18} className="text-slate-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Tipo de pago</th>
              <th className="text-right px-4 py-3 font-medium">Transacciones de pago</th>
              <th className="text-right px-4 py-3 font-medium">Monto del pago</th>
              <th className="text-right px-4 py-3 font-medium">Transacciones de reembolso</th>
              <th className="text-right px-4 py-3 font-medium">Monto del reembolso</th>
              <th className="text-right px-4 py-3 font-medium">Importe neto</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(([metodo, datos]) => (
              <tr key={metodo} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">{metodo}</td>
                <td className="text-right px-4 py-3">{datos.transacciones}</td>
                <td className="text-right px-4 py-3">${datos.monto.toFixed(2)}</td>
                <td className="text-right px-4 py-3">0</td>
                <td className="text-right px-4 py-3">$0.00</td>
                <td className="text-right px-4 py-3">${datos.monto.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t bg-slate-50 font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="text-right px-4 py-3">{totalTx}</td>
              <td className="text-right px-4 py-3">${total.toFixed(2)}</td>
              <td className="text-right px-4 py-3">0</td>
              <td className="text-right px-4 py-3">$0.00</td>
              <td className="text-right px-4 py-3">${total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t text-sm text-slate-500">
        Página: 1 de 1
      </div>
    </div>
  );
}

// REPORTE: Ingresos
function ReporteIngresos({ facturas }) {
  const totalVentas = facturas.filter(f => f.total > 0).length;
  const totalReembolsos = 0; // No hay sistema de reembolsos implementado
  const totalMonto = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
  
  return (
    <div className="space-y-6">
      {/* Tarjetas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-6 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-slate-600" />
          </div>
          <div className="text-sm text-slate-600 mb-1">Todos los recibos</div>
          <div className="text-3xl font-bold">{totalVentas + totalReembolsos}</div>
        </div>
        <div className="bg-white rounded-lg border p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Receipt size={24} className="text-blue-600" />
          </div>
          <div className="text-sm text-slate-600 mb-1">Ventas</div>
          <div className="text-3xl font-bold text-blue-600">{totalVentas}</div>
        </div>
        <div className="bg-white rounded-lg border p-6 text-center">
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Receipt size={24} className="text-pink-600" />
          </div>
          <div className="text-sm text-slate-600 mb-1">Reembolsos</div>
          <div className="text-3xl font-bold text-pink-600">{totalReembolsos}</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">EXPORTAR</span>
          <Download size={18} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Recibo n.º</th>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Tienda</th>
                <th className="text-left px-4 py-3 font-medium">Empleado</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {facturas.slice(0, 20).map((factura) => (
                <tr key={factura.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-600">{factura.numero}</td>
                  <td className="px-4 py-3">
                    {factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">{factura.vendedor_nombre || '-'}</td>
                  <td className="px-4 py-3">{factura.cliente_nombre || '-'}</td>
                  <td className="px-4 py-3">Venta</td>
                  <td className="text-right px-4 py-3 font-medium">${factura.total?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-sm text-slate-500">
          Página: 1 de {Math.ceil(facturas.length / 20)}
        </div>
      </div>
    </div>
  );
}

// REPORTE: Descuentos
function ReporteDescuentos({ facturas }) {
  const totalDescuentos = facturas.reduce((sum, f) => sum + (f.descuento || 0), 0);
  
  return (
    <div className="bg-white rounded-lg border p-8 text-center">
      <Percent size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Descuentos</h3>
      <p className="text-3xl font-bold mb-4">${totalDescuentos.toFixed(2)}</p>
      <p className="text-sm text-slate-500">
        No hay descuentos registrados en el período seleccionado
      </p>
    </div>
  );
}

// REPORTE: Impuestos
function ReporteImpuestos({ facturas }) {
  const impuestosPorTipo = {};
  
  facturas.forEach(factura => {
    factura.desglose_impuestos?.forEach(imp => {
      const key = `${imp.nombre} (${imp.tasa}%)`;
      if (!impuestosPorTipo[key]) {
        impuestosPorTipo[key] = { tasa: imp.tasa, monto: 0 };
      }
      impuestosPorTipo[key].monto += imp.monto || 0;
    });
  });
  
  const sortedItems = Object.entries(impuestosPorTipo).sort(([, a], [, b]) => b.monto - a.monto);
  const totalImpuestos = sortedItems.reduce((sum, [, v]) => sum + v.monto, 0);
  
  return (
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">EXPORTAR</span>
        <Download size={18} className="text-slate-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Impuesto</th>
              <th className="text-right px-4 py-3 font-medium">Tasa</th>
              <th className="text-right px-4 py-3 font-medium">Ventas netas</th>
              <th className="text-right px-4 py-3 font-medium">Importe del impuesto</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length > 0 ? sortedItems.map(([nombre, datos]) => (
              <tr key={nombre} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">{nombre}</td>
                <td className="text-right px-4 py-3">{datos.tasa}%</td>
                <td className="text-right px-4 py-3">-</td>
                <td className="text-right px-4 py-3">${datos.monto.toFixed(2)}</td>
              </tr>
            )) : (
              <tr className="border-t">
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No hay impuestos registrados en el período seleccionado
                </td>
              </tr>
            )}
            {sortedItems.length > 0 && (
              <tr className="border-t bg-slate-50 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="text-right px-4 py-3">-</td>
                <td className="text-right px-4 py-3">-</td>
                <td className="text-right px-4 py-3">${totalImpuestos.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t text-sm text-slate-500">
        Página: 1 de 1
      </div>
    </div>
  );
}


// REPORTE: Tickets Abiertos
function ReporteTicketsAbiertos({ tickets, loading, onRefresh, onDelete, onDeleteAll, deletingTicket }) {
  const totalAmount = tickets.reduce((sum, t) => sum + (t.subtotal || 0), 0);
  const totalItems = tickets.reduce((sum, t) => sum + (t.items?.length || 0), 0);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tickets Abiertos</p>
              <p className="text-2xl font-bold text-slate-900">{tickets.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Valor Total</p>
              <p className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShoppingCart size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Productos</p>
              <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-center gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="ml-1">Actualizar</span>
          </Button>
          {tickets.length > 0 && (
            <Button onClick={onDeleteAll} variant="destructive" size="sm">
              <Trash2 size={16} />
              <span className="ml-1">Eliminar Todos</span>
            </Button>
          )}
        </Card>
      </div>

      {/* Advertencia */}
      {tickets.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Tienes <strong>{tickets.length} ticket(s)</strong> abiertos con un valor de <strong>${totalAmount.toFixed(2)}</strong>. 
            Mientras haya tickets abiertos, no podrás desactivar la función Tickets abiertos.
          </p>
        </div>
      )}

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ticket</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Productos</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Subtotal</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha Creación</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    Cargando tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    <ClipboardList size={48} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No hay tickets abiertos</p>
                    <p className="text-sm">Los pedidos guardados sin cobrar aparecerán aquí</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ClipboardList size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{ticket.nombre}</p>
                          <p className="text-xs text-slate-500">ID: {ticket.id?.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {ticket.items?.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="text-slate-600">
                            {item.cantidad}x {item.nombre}
                          </div>
                        ))}
                        {ticket.items?.length > 2 && (
                          <div className="text-slate-400 text-xs">
                            +{ticket.items.length - 2} más
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-blue-600">
                        ${(ticket.subtotal || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Clock size={14} />
                        {formatDate(ticket.fecha_creacion)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        onClick={() => onDelete(ticket.id, ticket.nombre)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingTicket === ticket.id}
                      >
                        {deletingTicket === ticket.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
