import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Settings, CreditCard, Receipt, FileText, ClipboardList, ShoppingBag, Store, Monitor } from 'lucide-react';
import ConfigRecibo from './config/ConfigRecibo';
import ConfigFunciones from './config/ConfigFunciones';
import ConfigImpuestos from './config/ConfigImpuestos';
import ConfigMetodosPago from './config/ConfigMetodosPago';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfiguracionNew() {
  const [activeSection, setActiveSection] = useState('funciones');

  const menuSections = [
    {
      title: 'Configuración del sistema',
      items: [
        { id: 'funciones', label: 'Funciones', icon: Settings },
        { id: 'metodos-pago', label: 'Métodos de pago', icon: CreditCard },
        { id: 'impuestos', label: 'Impuestos', icon: FileText },
        { id: 'recibo', label: 'Recibo', icon: Receipt },
        { id: 'tickets-abiertos', label: 'Tickets abiertos', icon: ClipboardList },
        { id: 'tipo-pedido', label: 'Tipo de pedido', icon: ShoppingBag },
      ]
    },
    {
      title: 'Configuración de la tienda y el TPV',
      items: [
        { id: 'tiendas', label: 'Tiendas', icon: Store },
        { id: 'dispositivos-tpv', label: 'Dispositivos TPV', icon: Monitor },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'funciones':
        return <ConfigFunciones />;
      case 'recibo':
        return <ConfigRecibo />;
      case 'metodos-pago':
        return <PlaceholderSection title="Métodos de pago" />;
      case 'impuestos':
        return <ConfigImpuestos />;
      case 'tickets-abiertos':
        return <PlaceholderSection title="Tickets abiertos" />;
      case 'tipo-pedido':
        return <PlaceholderSection title="Tipo de pedido" />;
      case 'tiendas':
        return <PlaceholderSection title="Tiendas" />;
      case 'dispositivos-tpv':
        return <PlaceholderSection title="Dispositivos TPV" />;
      default:
        return <ConfigFunciones />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Menú Lateral */}
      <div className="w-full md:w-64 flex-shrink-0">
        <Card className="p-4">
          <h2 className="text-lg font-bold mb-4">Configuración</h2>
          
          {menuSections.map((section, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}

function PlaceholderSection({ title }) {
  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings size={32} className="text-slate-400" />
        </div>
        <p className="text-slate-500">
          Esta sección estará disponible próximamente
        </p>
      </div>
    </Card>
  );
}
