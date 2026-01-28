import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Settings, CreditCard, Receipt, FileText, ClipboardList, ShoppingBag, Store, Monitor, ChevronDown, ChevronRight } from 'lucide-react';
import axios from 'axios';
import ConfigRecibo from './config/ConfigRecibo';
import ConfigFunciones from './config/ConfigFunciones';
import ConfigImpuestos from './config/ConfigImpuestos';
import ConfigMetodosPago from './config/ConfigMetodosPago';
import ConfigTicketsAbiertos from './config/ConfigTicketsAbiertos';
import ConfigTipoPedido from './config/ConfigTipoPedido';
import ConfigTiendas from './config/ConfigTiendas';
import ConfigTPV from './config/ConfigTPV';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfiguracionNew() {
  const { seccion } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(seccion || 'funciones');
  
  useEffect(() => {
    if (seccion) {
      setActiveSection(seccion);
    }
  }, [seccion]);
  const [funcionesConfig, setFuncionesConfig] = React.useState({
    cierres_caja: true,
    tickets_abiertos: false,
    tipo_pedido: false,
  });

  const fetchFuncionesConfig = React.useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/funciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFuncionesConfig(response.data);
    } catch (error) {
      console.error('Error al cargar funciones:', error);
    }
  }, []);

  React.useEffect(() => {
    fetchFuncionesConfig();
  }, [fetchFuncionesConfig]);

  const allMenuItems = [
    {
      title: 'Configuración del sistema',
      items: [
        { id: 'funciones', label: 'Funciones', icon: Settings, alwaysShow: true },
        { id: 'metodos-pago', label: 'Métodos de pago', icon: CreditCard, alwaysShow: true },
        { id: 'impuestos', label: 'Impuestos', icon: FileText, alwaysShow: true },
        { id: 'recibo', label: 'Recibo', icon: Receipt, alwaysShow: true },
        { id: 'tickets-abiertos', label: 'Tickets abiertos', icon: ClipboardList, showWhen: 'tickets_abiertos' },
        { id: 'tipo-pedido', label: 'Tipo de pedido', icon: ShoppingBag, showWhen: 'tipo_pedido' },
      ]
    },
    {
      title: 'Configuración de la tienda y el TPV',
      items: [
        { id: 'tiendas', label: 'Tiendas', icon: Store, alwaysShow: true },
        { id: 'dispositivos-tpv', label: 'Dispositivos TPV', icon: Monitor, alwaysShow: true },
      ]
    }
  ];

  // Filtrar items según configuración de funciones
  const menuSections = allMenuItems.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.alwaysShow || (item.showWhen && funcionesConfig[item.showWhen])
    )
  }));

  const renderContent = () => {
    switch (activeSection) {
      case 'funciones':
        return <ConfigFunciones />;
      case 'recibo':
        return <ConfigRecibo />;
      case 'metodos-pago':
        return <ConfigMetodosPago />;
      case 'impuestos':
        return <ConfigImpuestos />;
      case 'tickets-abiertos':
        return <ConfigTicketsAbiertos />;
      case 'tipo-pedido':
        return <ConfigTipoPedido />;
      case 'tiendas':
        return <ConfigTiendas />;
      case 'dispositivos-tpv':
        return <ConfigTPV />;
      default:
        return <ConfigFunciones />;
    }
  };

  const [showMobileMenu, setShowMobileMenu] = useState(true);

  return (
    <div>
      {/* Header móvil */}
      <div className="md:hidden bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center gap-3 mb-0">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 hover:bg-blue-700 rounded-lg"
        >
          {showMobileMenu ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        <h1 className="font-semibold">
          {menuSections.flatMap(s => s.items).find(i => i.id === activeSection)?.label || 'Configuración'}
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">
        {/* Menú Lateral - colapsable en móvil */}
        <div className={`${showMobileMenu ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0`}>
          <Card className="p-4">
            <h2 className="hidden md:block text-lg font-bold mb-4">Configuración</h2>
            
            {menuSections.map((section, idx) => (
              <div key={idx} className="mb-4 md:mb-6">
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
                        onClick={() => {
                          setActiveSection(item.id);
                          navigate(`/configuracion/${item.id}`);
                          setShowMobileMenu(false); // Ocultar menú en móvil
                        }}
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

        {/* Contenido Principal - oculto en móvil cuando menú está visible */}
        <div className={`${showMobileMenu ? 'hidden md:block' : 'block'} flex-1`}>
          {renderContent()}
        </div>
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
