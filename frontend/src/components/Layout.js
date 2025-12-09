import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  LogOut,
  Store,
} from 'lucide-react';
import { Button } from './ui/button';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      testId: 'nav-dashboard',
    },
    {
      name: 'Productos',
      href: '/productos',
      icon: Package,
      testId: 'nav-products',
    },
    {
      name: 'Punto de Venta',
      href: '/pos',
      icon: ShoppingCart,
      testId: 'nav-pos',
    },
    {
      name: 'Facturas',
      href: '/facturas',
      icon: FileText,
      testId: 'nav-invoices',
    },
  ];

  if (user.es_admin) {
    navigation.push({
      name: 'Usuarios',
      href: '/usuarios',
      icon: Users,
      testId: 'nav-users',
    });
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store size={24} className="text-white" />
            </div>
            <div>
              <h1
                className="text-lg font-bold text-slate-900"
                data-testid="app-title"
              >
                Sistema POS
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                data-testid={item.testId}
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
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-900" data-testid="user-name">
              {user.nombre}
            </p>
            <p className="text-xs text-slate-500">@{user.username}</p>
            {user.es_admin && (
              <span
                className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded"
                data-testid="admin-badge"
              >
                Administrador
              </span>
            )}
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

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
