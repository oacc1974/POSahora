import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShoppingCart,
  Image,
  X
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format, subMonths, addMonths } from 'date-fns';
import DateRangePicker from '../components/DateRangePicker';
import html2canvas from 'html2canvas';
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

// Función para exportar gráfico como imagen
const exportChartAsImage = async (chartRef, filename = 'grafico') => {
  if (!chartRef.current) {
    toast.error('No se encontró el gráfico');
    return;
  }
  
  try {
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    });
    
    const link = document.createElement('a');
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Gráfico exportado como imagen');
  } catch (error) {
    console.error('Error al exportar gráfico:', error);
    toast.error('Error al exportar el gráfico');
  }
};

const REPORT_TYPES = [
  { id: 'resumen', name: 'Resumen de ventas', icon: TrendingUp },
  { id: 'articulo', name: 'Ventas por artículo', icon: Package },
  { id: 'categoria', name: 'Ventas por categoría', icon: Tag },
  { id: 'empleado', name: 'Ventas por empleado', icon: Users },
  { id: 'tipo_pago', name: 'Ventas por tipo de pago', icon: CreditCard },
  { id: 'recibos', name: 'Recibos', icon: DollarSign },
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
  // Por defecto: solo el día actual
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date()
  });
  const [tiendaId, setTiendaId] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  
  // Filtro de horas
  const [horaDesde, setHoraDesde] = useState('00:00');
  const [horaHasta, setHoraHasta] = useState('23:59');
  const [showHoraFilter, setShowHoraFilter] = useState(false);
  
  // Datos para filtros
  const [empleados, setEmpleados] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  
  // Estados para Tickets Abiertos
  const [ticketsAbiertos, setTicketsAbiertos] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(null);
  
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (dateRange?.from) params.append('fecha_desde', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('fecha_hasta', format(dateRange.to, 'yyyy-MM-dd'));
      if (tiendaId) params.append('tienda_id', tiendaId);
      if (empleadoId) params.append('cajero_id', empleadoId);
      
      // Filtros de hora
      if (horaDesde && horaDesde !== '00:00') params.append('hora_desde', horaDesde);
      if (horaHasta && horaHasta !== '23:59') params.append('hora_hasta', horaHasta);
      
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
      case 'recibos':
        return <ReporteRecibos facturas={facturas} onReembolso={fetchReportData} />;
      case 'ingresos':
        return <ReporteRecibos facturas={facturas} onReembolso={fetchReportData} />;
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

        {/* Filtro Hora - con dropdown */}
        <div className="hidden sm:block relative">
          <button
            onClick={() => setShowHoraFilter(!showHoraFilter)}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-slate-50"
          >
            <Clock size={16} className="text-slate-400" />
            <span className="text-sm">
              {horaDesde === '00:00' && horaHasta === '23:59' 
                ? 'Todo el día' 
                : `${horaDesde} - ${horaHasta}`}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          
          {showHoraFilter && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Hora desde</Label>
                  <Input
                    type="time"
                    value={horaDesde}
                    onChange={(e) => setHoraDesde(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Hora hasta</Label>
                  <Input
                    type="time"
                    value={horaHasta}
                    onChange={(e) => setHoraHasta(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setHoraDesde('00:00');
                      setHoraHasta('23:59');
                    }}
                  >
                    Todo el día
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setShowHoraFilter(false);
                      fetchReportData();
                    }}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          )}
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
function MetricCard({ title, value, change, changePercent, icon: Icon, color }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-slate-600">{title}</span>
        <Info size={14} className="text-slate-400" />
      </div>
      <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
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
  const chartRef = useRef(null);
  
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
        <MetricCard title="Ventas brutas" value={`$${(data.total_ventas_brutas || data.total_ingresos || 0).toFixed(2)}`} />
        <MetricCard title="Reembolsos" value={`-$${(data.total_reembolsos || 0).toFixed(2)}`} color="text-red-600" />
        <MetricCard title="Descuentos" value="$0.00" />
        <MetricCard title="Ventas netas" value={`$${(data.total_ingresos || 0).toFixed(2)}`} color="text-green-600" />
        <MetricCard title="Beneficio bruto" value={`$${(data.total_ingresos || 0).toFixed(2)}`} />
      </div>

      {/* Gráfico con selectores funcionales */}
      <div ref={chartRef} className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Ventas brutas</h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportChartAsImage(chartRef, 'resumen_ventas')}
              className="text-sm border rounded px-2 py-1.5 bg-white hover:bg-slate-50 flex items-center gap-1"
              title="Exportar como imagen"
            >
              <Image size={14} />
            </button>
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
  const chartRef = useRef(null);
  
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
        <div ref={chartRef} className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Ventas netas</h3>
            <div className="flex gap-2">
              <button
                onClick={() => exportChartAsImage(chartRef, 'ventas_articulo')}
                className="text-sm border rounded px-2 py-1.5 bg-white hover:bg-slate-50 flex items-center gap-1"
                title="Exportar como imagen"
              >
                <Image size={14} />
              </button>
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
  const [chartType, setChartType] = useState('bar');
  const [groupBy, setGroupBy] = useState('dias');
  const chartRef = useRef(null);
  
  const ventasPorCategoria = {};
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
      const cat = item.categoria || 'Sin categoría';
      if (!ventasPorCategoria[cat]) {
        ventasPorCategoria[cat] = { cantidad: 0, total: 0 };
      }
      ventasPorCategoria[cat].cantidad += item.cantidad || 1;
      ventasPorCategoria[cat].total += item.subtotal || 0;
      
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
  
  const sortedItems = Object.entries(ventasPorCategoria).sort(([, a], [, b]) => b.total - a.total);
  const colores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  
  // Datos para gráfico de barras por categoría
  const barData = sortedItems.slice(0, 7).map(([cat, datos], i) => ({
    categoria: cat.length > 12 ? cat.substring(0, 12) + '...' : cat,
    ventas: datos.total,
    fill: colores[i % colores.length]
  }));
  
  // Preparar datos de tiempo según la agrupación seleccionada
  let timeChartData = [];
  if (groupBy === 'dias') {
    const diasOrdenados = Object.keys(ventasPorDia).sort();
    timeChartData = diasOrdenados.map(dia => ({
      label: new Date(dia + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      ventas: ventasPorDia[dia]
    }));
  } else {
    const semanasOrdenadas = Object.entries(ventasPorSemana)
      .sort(([, a], [, b]) => a.firstDate.localeCompare(b.firstDate));
    timeChartData = semanasOrdenadas.map(([semana, datos]) => ({
      label: semana,
      ventas: datos.total
    }));
  }
  
  return (
    <div className="space-y-6">
      {/* Gráfico de barras por categoría */}
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
      
      {/* Gráfico de tendencia con selectores funcionales */}
      <div ref={chartRef} className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Tendencia de ventas</h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportChartAsImage(chartRef, 'ventas_categoria')}
              className="text-sm border rounded px-2 py-1.5 bg-white hover:bg-slate-50 flex items-center gap-1"
              title="Exportar como imagen"
            >
              <Image size={14} />
            </button>
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
        {timeChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            {chartType === 'area' ? (
              <AreaChart data={timeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorVentasCategoria" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
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
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVentasCategoria)"
                />
              </AreaChart>
            ) : (
              <BarChart data={timeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                <Bar dataKey="ventas" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-400">
            No hay datos para mostrar
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

// REPORTE: Recibos (antes Ingresos)
function ReporteRecibos({ facturas, onReembolso }) {
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, ventas, reembolsos
  const [showMenuRecibo, setShowMenuRecibo] = useState(false);
  const [procesandoReembolso, setProcesandoReembolso] = useState(false);
  const [showReembolsoDialog, setShowReembolsoDialog] = useState(false);
  const [motivoReembolso, setMotivoReembolso] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showBusqueda, setShowBusqueda] = useState(false);
  const [ticketConfig, setTicketConfig] = useState(null);
  
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(20);
  
  const token = sessionStorage.getItem('token');
  
  // Cargar configuración del ticket al montar
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTicketConfig(response.data);
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      }
    };
    fetchConfig();
  }, [token]);
  
  // Separar facturas por estado
  const facturasCompletadas = facturas.filter(f => f.estado !== 'reembolsado');
  const facturasReembolsadas = facturas.filter(f => f.estado === 'reembolsado');
  
  const totalVentas = facturasCompletadas.length;
  const totalReembolsos = facturasReembolsadas.length;
  const montoVentas = facturasCompletadas.reduce((sum, f) => sum + (f.total || 0), 0);
  const montoReembolsos = facturasReembolsadas.reduce((sum, f) => sum + (f.total || 0), 0);
  
  // Filtrar facturas según el filtro seleccionado y búsqueda
  let facturasFiltradas = filtroEstado === 'todos' 
    ? facturas 
    : filtroEstado === 'ventas' 
      ? facturasCompletadas 
      : facturasReembolsadas;
  
  // Aplicar filtro de búsqueda
  if (busqueda.trim()) {
    const termino = busqueda.toLowerCase().trim();
    facturasFiltradas = facturasFiltradas.filter(f => 
      (f.numero || '').toLowerCase().includes(termino) ||
      (f.cliente_nombre || '').toLowerCase().includes(termino) ||
      (f.vendedor_nombre || '').toLowerCase().includes(termino) ||
      (f.total?.toString() || '').includes(termino) ||
      (f.items || []).some(item => 
        (item.producto_nombre || item.nombre || '').toLowerCase().includes(termino)
      )
    );
  }
  
  // Calcular paginación
  const totalPaginas = Math.ceil(facturasFiltradas.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const facturasPaginadas = facturasFiltradas.slice(indiceInicio, indiceFin);
  
  // Resetear a página 1 cuando cambian los filtros
  const resetPagina = () => setPaginaActual(1);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleReembolso = async () => {
    if (!selectedFactura || selectedFactura.estado === 'reembolsado') return;
    
    if (!motivoReembolso.trim()) {
      toast.error('Por favor ingresa un motivo para el reembolso');
      return;
    }
    
    setProcesandoReembolso(true);
    try {
      await axios.post(
        `${API_URL}/api/facturas/${selectedFactura.id}/reembolso`,
        { motivo: motivoReembolso },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Recibo reembolsado correctamente');
      setSelectedFactura(null);
      setShowMenuRecibo(false);
      setShowReembolsoDialog(false);
      setMotivoReembolso('');
      if (onReembolso) onReembolso();
    } catch (error) {
      console.error('Error al reembolsar:', error);
      toast.error(error.response?.data?.detail || 'Error al procesar el reembolso');
    } finally {
      setProcesandoReembolso(false);
    }
  };
  
  const handleImprimir = () => {
    if (!selectedFactura) return;
    
    const printWindow = window.open('', '_blank');
    
    // Verificar si el popup fue bloqueado
    if (!printWindow || printWindow.closed) {
      toast.error('El navegador bloqueó la ventana de impresión. Por favor, permite los popups para este sitio.');
      return;
    }
    
    const fecha = selectedFactura.fecha ? new Date(selectedFactura.fecha) : new Date();
    
    // Construir HTML del logo si existe
    const logoHtml = ticketConfig?.logo_url 
      ? `<div class="logo"><img src="${API_URL}${ticketConfig.logo_url}" alt="Logo" /></div>` 
      : '';
    
    // Construir HTML de la cabecera si existe
    const cabeceraHtml = ticketConfig?.cabecera?.trim() 
      ? `<div class="cabecera">${ticketConfig.cabecera}</div>` 
      : '';
    
    // Construir HTML del nombre del negocio
    const nombreNegocio = ticketConfig?.nombre_negocio || 'Mi Negocio';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo ${selectedFactura.numero}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; font-size: 12px; }
          .logo { text-align: center; margin-bottom: 10px; }
          .logo img { max-width: 150px; max-height: 80px; }
          .cabecera { text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px dashed #000; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h2 { margin: 0 0 5px 0; font-size: 16px; }
          .items { margin: 15px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-row.final { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          ${selectedFactura.estado === 'reembolsado' ? '.reembolsado { text-align: center; color: red; font-weight: bold; margin: 10px 0; border: 2px solid red; padding: 5px; }' : ''}
        </style>
      </head>
      <body>
        ${logoHtml}
        ${cabeceraHtml}
        <div class="header">
          <h2>${nombreNegocio}</h2>
          <p>Nº ${selectedFactura.numero}</p>
          <p>${fecha.toLocaleDateString('es-ES')} ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          <p>Atendido por: ${selectedFactura.vendedor_nombre || '-'}</p>
        </div>
        ${selectedFactura.estado === 'reembolsado' ? '<div class="reembolsado">*** REEMBOLSADO ***</div>' : ''}
        <div class="items">
          ${(selectedFactura.items || []).map(item => `
            <div class="item">
              <span>${item.cantidad || 1}x ${item.producto_nombre || item.nombre}</span>
              <span>$${(item.subtotal || item.precio * (item.cantidad || 1)).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${(selectedFactura.subtotal || selectedFactura.total)?.toFixed(2)}</span>
          </div>
          ${selectedFactura.impuesto > 0 ? `
            <div class="total-row">
              <span>Impuestos:</span>
              <span>$${selectedFactura.impuesto?.toFixed(2)}</span>
            </div>
          ` : ''}
          ${selectedFactura.descuento > 0 ? `
            <div class="total-row">
              <span>Descuento:</span>
              <span>-$${selectedFactura.descuento?.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row final">
            <span>TOTAL:</span>
            <span>$${selectedFactura.total?.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Método de pago:</span>
            <span>${selectedFactura.metodo_pago_nombre || 'Efectivo'}</span>
          </div>
        </div>
        <div class="footer">
          <p>¡Gracias por su compra!</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    setShowMenuRecibo(false);
  };
  
  return (
    <div className="flex gap-6">
      {/* Diálogo de reembolso */}
      {showReembolsoDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Reembolsar Recibo</h3>
            <p className="text-sm text-slate-600 mb-4">
              ¿Estás seguro de que deseas reembolsar el recibo <strong>{selectedFactura?.numero}</strong> por <strong>${selectedFactura?.total?.toFixed(2)}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Motivo del reembolso *</label>
              <textarea
                value={motivoReembolso}
                onChange={(e) => setMotivoReembolso(e.target.value)}
                placeholder="Ingresa el motivo del reembolso..."
                className="w-full border rounded-lg p-3 text-sm resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReembolsoDialog(false);
                  setMotivoReembolso('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReembolso}
                disabled={procesandoReembolso || !motivoReembolso.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {procesandoReembolso ? 'Procesando...' : 'Confirmar Reembolso'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Panel izquierdo - Lista de recibos */}
      <div className={`flex-1 space-y-4 ${selectedFactura ? 'hidden md:block md:max-w-[60%]' : ''}`}>
        {/* Barra de búsqueda */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex-1 relative">
            {showBusqueda ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" 
                    width="18" height="18" viewBox="0 0 24 24" fill="none" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar recibo, cliente..."
                    className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowBusqueda(false);
                    setBusqueda('');
                  }}
                  className="px-2 md:px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X size={18} className="md:hidden" />
                  <span className="hidden md:inline">Cancelar</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold text-slate-700">Recibos</h2>
                <button
                  onClick={() => setShowBusqueda(true)}
                  className="flex items-center gap-2 px-2 md:px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" height="16" viewBox="0 0 24 24" fill="none" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  Buscar recibo
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Indicador de resultados de búsqueda */}
        {busqueda && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center justify-between">
            <span>
              Se encontraron <strong>{facturasFiltradas.length}</strong> recibo(s) para "{busqueda}"
            </span>
            <button
              onClick={() => setBusqueda('')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {/* Tarjetas de métricas clickeables - compactas en móvil */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <div 
            className={`bg-white rounded-lg border p-2 md:p-4 cursor-pointer transition-all ${filtroEstado === 'todos' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-slate-300'}`}
            onClick={() => setFiltroEstado('todos')}
          >
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText size={16} className="md:hidden text-slate-600" />
                <FileText size={20} className="hidden md:block text-slate-600" />
              </div>
              <div className="text-xs md:text-sm text-slate-600">Todos</div>
            </div>
            <div className="text-xl md:text-2xl font-bold">{totalVentas + totalReembolsos}</div>
          </div>
          <div 
            className={`bg-white rounded-lg border p-2 md:p-4 cursor-pointer transition-all ${filtroEstado === 'ventas' ? 'ring-2 ring-green-500 border-green-500' : 'hover:border-slate-300'}`}
            onClick={() => setFiltroEstado('ventas')}
          >
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt size={16} className="md:hidden text-green-600" />
                <Receipt size={20} className="hidden md:block text-green-600" />
              </div>
              <div className="text-xs md:text-sm text-slate-600">Ventas</div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-green-600">{totalVentas}</div>
            <div className="text-xs md:text-sm text-slate-500 truncate">${montoVentas.toFixed(2)}</div>
          </div>
          <div 
            className={`bg-white rounded-lg border p-2 md:p-4 cursor-pointer transition-all ${filtroEstado === 'reembolsos' ? 'ring-2 ring-red-500 border-red-500' : 'hover:border-slate-300'}`}
            onClick={() => setFiltroEstado('reembolsos')}
          >
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Receipt size={16} className="md:hidden text-red-600" />
                <Receipt size={20} className="hidden md:block text-red-600" />
              </div>
              <div className="text-xs md:text-sm text-slate-600">Reembolsos</div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-red-600">{totalReembolsos}</div>
            <div className="text-xs md:text-sm text-slate-500 truncate">-${montoReembolsos.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg border p-2 md:p-4">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign size={16} className="md:hidden text-blue-600" />
                <DollarSign size={20} className="hidden md:block text-blue-600" />
              </div>
              <div className="text-xs md:text-sm text-slate-600">Netos</div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-blue-600 truncate">${(montoVentas - montoReembolsos).toFixed(2)}</div>
          </div>
        </div>

        {/* Lista de recibos en móvil / Tabla en desktop */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Vista móvil - Lista de cards */}
          <div className="md:hidden">
            {facturasPaginadas.map((factura) => (
              <div 
                key={factura.id} 
                className={`p-3 border-b cursor-pointer transition-colors ${
                  selectedFactura?.id === factura.id 
                    ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedFactura(factura)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono font-medium text-blue-600 text-sm">
                    #{factura.numero?.split('-').pop() || factura.numero}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    factura.estado === 'reembolsado' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {factura.estado === 'reembolsado' ? 'Reemb.' : 'OK'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    {formatDate(factura.fecha)} • {factura.vendedor_nombre || '-'}
                    {factura.cliente_nombre && <span className="text-slate-400"> • {factura.cliente_nombre}</span>}
                  </div>
                  <span className={`font-mono font-semibold ${
                    factura.estado === 'reembolsado' ? 'text-red-600 line-through' : 'text-green-600'
                  }`}>
                    ${factura.total?.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Vista desktop - Tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Recibo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Empleado</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturasPaginadas.map((factura) => (
                  <tr 
                    key={factura.id} 
                    className={`border-b cursor-pointer transition-colors ${
                      selectedFactura?.id === factura.id 
                        ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedFactura(factura)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-blue-600">
                        {factura.numero?.split('-').pop() || factura.numero}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(factura.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatTime(factura.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {factura.vendedor_nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {factura.cliente_nombre || '-'}
                    </td>
                    <td className={`text-right px-4 py-3 font-mono font-semibold ${
                      factura.estado === 'reembolsado' ? 'text-red-600 line-through' : 'text-green-600'
                    }`}>
                      ${factura.total?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        factura.estado === 'reembolsado' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {factura.estado === 'reembolsado' ? 'Reembolsado' : 'Completado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Controles de paginación */}
          <div className="px-4 py-3 border-t bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Mostrando</span>
              <select
                value={itemsPorPagina}
                onChange={(e) => {
                  setItemsPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="border rounded px-2 py-1 text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>de {facturasFiltradas.length} recibos</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPaginaActual(1)}
                disabled={paginaActual === 1}
                className="px-2 py-1 border rounded text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1 border rounded text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹ Anterior
              </button>
              
              <span className="px-3 py-1 text-sm font-medium">
                Página {paginaActual} de {totalPaginas || 1}
              </span>
              
              <button
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual >= totalPaginas}
                className="px-3 py-1 border rounded text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente ›
              </button>
              <button
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaActual >= totalPaginas}
                className="px-2 py-1 border rounded text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Panel lateral - Detalle del recibo (Modal en móvil, Panel en desktop) */}
      {selectedFactura && (
        <div className="fixed inset-0 z-40 md:relative md:inset-auto">
          {/* Overlay en móvil */}
          <div 
            className="absolute inset-0 bg-black/50 md:hidden"
            onClick={() => setSelectedFactura(null)}
          />
          
          {/* Panel */}
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto md:relative md:inset-auto md:w-[400px] bg-white rounded-t-2xl md:rounded-lg border shadow-lg md:sticky md:top-4 md:h-fit">
          {/* Header del panel */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
            <button
              onClick={() => setSelectedFactura(null)}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X size={20} />
            </button>
            <h3 className="font-semibold">Detalle del Recibo</h3>
            <div className="relative">
              <button
                onClick={() => setShowMenuRecibo(!showMenuRecibo)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
              {/* Menú desplegable */}
              {showMenuRecibo && (
                <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[180px]">
                  {/* Opción Reembolsar */}
                  {selectedFactura.estado !== 'reembolsado' ? (
                    <button
                      onClick={() => {
                        setShowMenuRecibo(false);
                        setShowReembolsoDialog(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3"
                    >
                      <RefreshCw size={16} className="text-slate-500" />
                      Reembolsar
                    </button>
                  ) : (
                    <div className="px-4 py-2.5 text-sm text-slate-400 flex items-center gap-3">
                      <RefreshCw size={16} />
                      Ya reembolsado
                    </div>
                  )}
                  {/* Separador */}
                  <div className="border-t my-1"></div>
                  {/* Opción Imprimir */}
                  <button
                    onClick={handleImprimir}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Imprimir
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Contenido del recibo */}
          <div className="p-4 space-y-4">
            {/* Total */}
            <div className="text-center py-4 border-b">
              <div className="text-sm text-slate-600 mb-1">Total</div>
              <div className={`text-4xl font-bold ${selectedFactura.estado === 'reembolsado' ? 'text-red-600 line-through' : ''}`}>
                ${selectedFactura.total?.toFixed(2)}
              </div>
              {selectedFactura.estado === 'reembolsado' && (
                <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  Reembolsado
                </span>
              )}
            </div>
            
            {/* Info del pedido */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Pedido</span>
                <span className="font-medium">{selectedFactura.numero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Empleado</span>
                <span className="font-medium">{selectedFactura.vendedor_nombre || '-'}</span>
              </div>
              {selectedFactura.cliente_nombre && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Cliente</span>
                  <span className="font-medium">{selectedFactura.cliente_nombre}</span>
                </div>
              )}
              {selectedFactura.mesa && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Mesa</span>
                  <span className="font-medium">{selectedFactura.mesa}</span>
                </div>
              )}
            </div>
            
            {/* Items */}
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Artículos</div>
              <div className="space-y-2">
                {selectedFactura.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <span className="text-slate-600">{item.cantidad || 1}x </span>
                      <span>{item.producto_nombre || item.nombre}</span>
                      {item.modificadores_aplicados?.length > 0 && (
                        <div className="text-xs text-slate-400 ml-4">
                          {item.modificadores_aplicados.map((m, i) => (
                            <span key={i}>+ {m.nombre}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">${(item.subtotal || item.precio * (item.cantidad || 1)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Subtotales */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>${(selectedFactura.subtotal || selectedFactura.total)?.toFixed(2)}</span>
              </div>
              {selectedFactura.impuesto > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Impuestos</span>
                  <span>${selectedFactura.impuesto?.toFixed(2)}</span>
                </div>
              )}
              {selectedFactura.descuento > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-${selectedFactura.descuento?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>${selectedFactura.total?.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Método de pago */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Método de pago</span>
                <span className="font-medium">{selectedFactura.metodo_pago_nombre || 'Efectivo'}</span>
              </div>
            </div>
            
            {/* Footer - Fecha y número */}
            <div className="border-t pt-4 text-sm text-slate-500 space-y-1 pb-4 md:pb-0">
              <div className="flex justify-between">
                <span>Fecha</span>
                <span>{formatDate(selectedFactura.fecha)} {formatTime(selectedFactura.fecha)}</span>
              </div>
              <div className="flex justify-between">
                <span>Nº de Recibo</span>
                <span className="font-mono">{selectedFactura.numero}</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mantener ReporteIngresos por compatibilidad (redirige a ReporteRecibos)
function ReporteIngresos({ facturas }) {
  return <ReporteRecibos facturas={facturas} />;
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
