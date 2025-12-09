import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import {
  Package,
  ShoppingBag,
  DollarSign,
  Users,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (error) {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  const user = JSON.parse(localStorage.getItem('user'));
  
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
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Resumen general de tu negocio
        </p>
      </div>

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
              href="/facturas"
              data-testid="quick-action-invoices"
              className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
            >
              <p className="font-semibold text-purple-900">Ver Facturas</p>
              <p className="text-sm text-purple-700">
                Consultar historial de ventas
              </p>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
