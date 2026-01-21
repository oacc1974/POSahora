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
  Package,
  ShoppingBag,
  DollarSign,
  Users,
  Calendar,
  Filter,
  RefreshCw,
  Store,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [cajeroId, setCajeroId] = useState('');
  const [tiendaId, setTiendaId] = useState('');
  
  // Datos para filtros
  const [empleados, setEmpleados] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const codigoTienda = user?.codigo_tienda;
  const isAdmin = ['propietario', 'administrador'].includes(user?.rol);

  useEffect(() => {
    // Establecer fechas predeterminadas
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    setFechaDesde(monthAgo.toISOString().split('T')[0]);
    setFechaHasta(today);
    
    loadFilterData();
    fetchDashboard();
  }, []);

  const loadFilterData = async () => {
    if (!isAdmin) return;
    
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
      console.error('Error al cargar datos de filtros:', error);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      if (cajeroId) params.append('cajero_id', cajeroId);
      if (tiendaId) params.append('tienda_id', tiendaId);
      
      const response = await axios.get(
        `${API_URL}/api/dashboard?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (error) {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    setFechaDesde(monthAgo.toISOString().split('T')[0]);
    setFechaHasta(today);
    setCajeroId('');
    setTiendaId('');
  };

  const handleApplyFilters = () => {
    fetchDashboard();
  };

  if (loading && !data) {
    return <div>Cargando...</div>;
  }

  const stats = [
    {
      name: 'Total Productos',
      value: data?.total_productos || 0,
      icon: Package,
      color: 'bg-blue-500',
      testId: 'stat-total-products',
      show: ['propietario', 'administrador'].includes(user?.rol),
    },
    {
      name: 'Ventas Realizadas',
      value: data?.total_ventas || 0,
      icon: ShoppingBag,
      color: 'bg-green-500',
      testId: 'stat-total-sales',
      show: true,
    },
    {
      name: 'Ingresos Totales',
      value: `$${(data?.total_ingresos || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      testId: 'stat-total-revenue',
      show: true,
    },
    {
      name: 'Total Empleados',
      value: data?.total_empleados || 0,
      icon: Users,
      color: 'bg-indigo-500',
      testId: 'stat-total-employees',
      show: user?.rol === 'propietario',
    },
  ].filter(stat => stat.show);

  return (
    <div data-testid="dashboard">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Dashboard
            </h1>
            <p className="text-sm md:text-base text-slate-600">
              Resumen general de tu negocio
            </p>
          </div>
          
          {user?.rol === 'propietario' && codigoTienda && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 w-full md:w-auto">
              <p className="text-xs text-slate-600 mb-1">Código de Tienda POS</p>
              <div className="flex items-center gap-3">
                <p className="text-xl md:text-2xl font-bold font-mono text-blue-600">
                  {codigoTienda}
                </p>
                <button
                  onClick={async () => {
                    try {
                      // Método moderno
                      if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(codigoTienda);
                      } else {
                        // Fallback para contextos no seguros
                        const textArea = document.createElement('textarea');
                        textArea.value = codigoTienda;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                      }
                      toast.success('Código copiado');
                    } catch (err) {
                      toast.error('No se pudo copiar el código');
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Comparte con tus empleados para acceso al POS
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Filtros (solo para admin) */}
      {isAdmin && (
        <Card className="p-4 mb-6">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-600" />
              <span className="font-semibold">Filtros</span>
              {(cajeroId || tiendaId) && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Filtros activos
                </span>
              )}
            </div>
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Cajero</Label>
                  <Select value={cajeroId || "all"} onValueChange={(v) => setCajeroId(v === "all" ? "" : v)}>
                    <SelectTrigger className="text-sm">
                      <User size={14} className="mr-2 text-slate-400" />
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cajeros</SelectItem>
                      {empleados.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre} ({emp.rol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Tienda */}
                {tiendas.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Tienda</Label>
                    <Select value={tiendaId || "all"} onValueChange={(v) => setTiendaId(v === "all" ? "" : v)}>
                      <SelectTrigger className="text-sm">
                        <Store size={14} className="mr-2 text-slate-400" />
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
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button onClick={handleApplyFilters} size="sm" className="gap-2">
                  <RefreshCw size={14} />
                  Aplicar
                </Button>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.name}
              data-testid={stat.testId}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold font-mono text-slate-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Facturas Recientes</h2>
          <div className="space-y-3">
            {data?.facturas_recientes?.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No hay facturas recientes
              </p>
            ) : (
              data?.facturas_recientes?.map((factura) => (
                <div
                  key={factura.id}
                  data-testid={`recent-invoice-${factura.id}`}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {factura.numero}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(factura.fecha).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-blue-600">
                    ${factura.total.toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
          <div className="space-y-3">
            <a
              href="/productos"
              data-testid="quick-action-products"
              className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <p className="font-semibold text-blue-900">Gestionar Productos</p>
              <p className="text-sm text-blue-700">
                Agregar, editar o eliminar productos
              </p>
            </a>
            <a
              href="/pos"
              data-testid="quick-action-pos"
              className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <p className="font-semibold text-green-900">Nuevo Punto de Venta</p>
              <p className="text-sm text-green-700">
                Iniciar una nueva venta
              </p>
            </a>
            <a
              href="/reportes"
              data-testid="quick-action-reports"
              className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
            >
              <p className="font-semibold text-purple-900">Ver Reportes</p>
              <p className="text-sm text-purple-700">
                Analiza el rendimiento de tu negocio
              </p>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
