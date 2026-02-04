import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  LogOut,
  Store,
  Menu,
  X,
  Wallet,
  UserCircle,
  Building2,
  BarChart3,
  FileCheck,
  ChevronDown,
  ChevronRight,
  FileX,
  Crown,
  Shield,
} from 'lucide-react';
import { Button } from './ui/button';

const getRolBadge = (rol) => {
  const badges = {
    propietario: { text: 'Propietario', color: 'bg-purple-100 text-purple-700' },
    administrador: { text: 'Administrador', color: 'bg-blue-100 text-blue-700' },
    cajero: { text: 'Cajero', color: 'bg-green-100 text-green-700' },
  };
  return badges[rol] || badges.cajero;
};

export default function Layout({ children, user, onLogout, hideSidebar = false }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [funciones, setFunciones] = useState({});
  const [feMenuOpen, setFeMenuOpen] = useState(false);

  // Cargar configuración de funciones para saber si FE está activa
  useEffect(() => {
    const loadFunciones = async () => {
      try {
        const API_URL = process.env.REACT_APP_BACKEND_URL;
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/funciones`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFunciones(data);
        }
      } catch (error) {
        console.error('Error loading funciones:', error);
      }
    };
    loadFunciones();
  }, []);

  // Auto-abrir el menú de FE si estamos en una de sus páginas
  useEffect(() => {
    if (location.pathname.includes('/documentos-electronicos') || location.pathname.includes('/notas-credito')) {
      setFeMenuOpen(true);
    }
  }, [location.pathname]);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      testId: 'nav-dashboard',
      show: true,
    },
    {
      name: 'Caja',
      href: '/caja',
      icon: Wallet,
      testId: 'nav-caja',
      show: true,
    },
    {
      name: 'Productos',
      href: '/productos',
      icon: Package,
      testId: 'nav-products',
      show: ['propietario', 'administrador'].includes(user.rol),
    },
    {
      name: 'Punto de Venta',
      href: '/pos',
      icon: ShoppingCart,
      testId: 'nav-pos',
      show: true,
    },
    {
      name: 'Facturas',
      href: '/facturas',
      icon: FileText,
      testId: 'nav-invoices',
      show: true,
    },
    {
      name: 'Reportes',
      href: '/reportes',
      icon: BarChart3,
      testId: 'nav-reportes',
      show: ['propietario', 'administrador'].includes(user.rol),
    },
    {
      name: 'Clientes',
      href: '/clientes',
      icon: UserCircle,
      testId: 'nav-clientes',
      show: true,
    },
    {
      name: 'Empleados',
      href: '/usuarios',
      icon: Users,
      testId: 'nav-users',
      show: user.rol === 'propietario',
    },
    {
      name: 'Mi Plan',
      href: '/mi-plan',
      icon: Crown,
      testId: 'nav-mi-plan',
      show: user.rol === 'propietario' && user.id !== 'admin',
    },
    {
      name: 'Super Admin',
      href: '/superadmin',
      icon: Shield,
      testId: 'nav-superadmin',
      show: user.id === 'admin',
    },
    {
      name: 'Organizaciones',
      href: '/organizaciones',
      icon: Building2,
      testId: 'nav-organizaciones',
      show: user.id === 'admin',
    },
    {
      name: 'Configuración',
      href: '/configuracion',
      icon: Settings,
      testId: 'nav-config',
      show: user.rol === 'propietario',
    },
  ].filter((item) => item.show);

  const rolBadge = getRolBadge(user.rol);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile header - oculto cuando hideSidebar está activo (el POS tiene su propio header) */}
      {!hideSidebar && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store size={24} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">POS Ahora</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      )}

      {/* Sidebar - siempre oculto cuando hideSidebar está activo */}
      {!hideSidebar && (
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 bg-white border-r border-slate-200 flex flex-col fixed md:sticky top-[73px] md:top-0 h-[calc(100vh-73px)] md:h-screen z-40`}
        >
        <div className="hidden md:block p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">POS Ahora</h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                data-testid={item.testId}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          
          {/* Submenú de Facturación Electrónica */}
          {funciones.facturacion_electronica && ['propietario', 'administrador'].includes(user.rol) && (
            <div className="mt-2">
              <button
                onClick={() => setFeMenuOpen(!feMenuOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  (location.pathname.includes('/documentos-electronicos') || location.pathname.includes('/notas-credito'))
                    ? 'bg-emerald-50 text-emerald-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                data-testid="nav-fe-menu"
              >
                <div className="flex items-center gap-3">
                  <FileCheck size={20} />
                  <span>Facturación Electrónica</span>
                </div>
                {feMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {feMenuOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-4">
                  <Link
                    to="/documentos-electronicos"
                    data-testid="nav-docs-electronicos"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                      location.pathname === '/documentos-electronicos'
                        ? 'bg-emerald-50 text-emerald-600 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <FileText size={16} />
                    <span>Facturas Electrónicas</span>
                  </Link>
                  <Link
                    to="/notas-credito"
                    data-testid="nav-notas-credito"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                      location.pathname === '/notas-credito'
                        ? 'bg-emerald-50 text-emerald-600 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <FileX size={16} />
                    <span>Notas de Crédito</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p
              className="text-sm font-medium text-slate-900 truncate"
              data-testid="user-name"
            >
              {user.nombre}
            </p>
            <p className="text-xs text-slate-500 truncate">@{user.username}</p>
            <span
              className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${rolBadge.color}`}
              data-testid="rol-badge"
            >
              {rolBadge.text}
            </span>
          </div>
          <Button
            onClick={onLogout}
            data-testid="logout-button"
            variant="outline"
            className="w-full justify-start gap-3"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </Button>
        </div>
      </aside>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className={hideSidebar ? 'h-full' : 'p-4 md:p-8'}>{children}</div>
      </main>

      {/* Overlay for mobile menu - solo cuando no hideSidebar */}
      {!hideSidebar && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
