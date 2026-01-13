import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Wallet, ClipboardList, ShoppingBag, ExternalLink, Clock, Printer, Monitor, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigFunciones() {
  const [funciones, setFunciones] = useState({
    cierres_caja: true,
    tickets_abiertos: false,
    tipo_pedido: false,
    venta_con_stock: true,
    funcion_reloj: false,
    impresoras_cocina: false,
    pantalla_clientes: false,
    tickets_abiertos_count: 0,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFunciones();
  }, []);

  const fetchFunciones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/funciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFunciones(response.data);
    } catch (error) {
      console.error('Error al cargar funciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    // Si intenta desactivar tickets_abiertos y hay tickets guardados, mostrar advertencia
    if (key === 'tickets_abiertos' && funciones.tickets_abiertos && funciones.tickets_abiertos_count > 0) {
      toast.error(`No puedes desactivar esta opción porque tienes ${funciones.tickets_abiertos_count} ticket(s) guardado(s). Elimínalos primero.`);
      return;
    }
    
    setFunciones({
      ...funciones,
      [key]: !funciones[key]
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/funciones`, funciones, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Configuración guardada correctamente');
      // Recargar la página para actualizar el menú
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error('Error al guardar la configuración');
      setSaving(false);
    }
  };

  const funcionesData = [
    {
      id: 'cierres_caja',
      key: 'cierres_caja',
      icon: Wallet,
      title: 'Cierres de caja por turnos',
      description: 'Controla el dinero que entra y sale del cajón de efectivo.',
      enabled: funciones.cierres_caja,
      active: true,
    },
    {
      id: 'tickets_abiertos',
      key: 'tickets_abiertos',
      icon: ClipboardList,
      title: 'Tickets abiertos',
      description: 'Permite guardar y editar pedidos antes de completar un pago.',
      enabled: funciones.tickets_abiertos,
      active: true,
    },
    {
      id: 'tipo_pedido',
      key: 'tipo_pedido',
      icon: ShoppingBag,
      title: 'Tipo de pedido',
      description: 'Toma pedidos para cenar dentro, para llevar o a domicilio.',
      enabled: funciones.tipo_pedido,
      active: true,
    },
    {
      id: 'venta_con_stock',
      key: 'venta_con_stock',
      icon: ShoppingBag,
      title: 'Venta con stock',
      description: 'Controla si se permite vender productos sin stock disponible.',
      enabled: funciones.venta_con_stock,
      active: true,
    },
    {
      id: 'funcion_reloj',
      key: 'funcion_reloj',
      icon: Clock,
      title: 'Función de reloj',
      description: 'Permite a los empleados registrar su entrada y salida del trabajo.',
      enabled: funciones.funcion_reloj,
      active: true,
    },
    {
      id: 'impresoras_cocina',
      key: 'impresoras_cocina',
      icon: Printer,
      title: 'Impresoras de cocina',
      description: 'Envía los pedidos directamente a la impresora de cocina para preparación.',
      enabled: funciones.impresoras_cocina,
      active: true,
    },
    {
      id: 'pantalla_clientes',
      key: 'pantalla_clientes',
      icon: Monitor,
      title: 'Pantalla para clientes',
      description: 'Muestra la información del pedido en una pantalla secundaria para el cliente.',
      enabled: funciones.pantalla_clientes,
      active: true,
    },
  ];

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Funciones</h2>
        <p className="text-slate-600">
          Activa o desactiva funciones del sistema según las necesidades de tu negocio
        </p>
      </div>

      <div className="space-y-4">
        {funcionesData.map((funcion) => {
          const Icon = funcion.icon;
          
          return (
            <div
              key={funcion.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-blue-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">
                    {funcion.title}
                  </h3>
                  {!funcion.active && (
                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  {funcion.description}
                </p>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  onClick={() => toast.info('Documentación próximamente disponible')}
                >
                  Más información
                  <ExternalLink size={14} />
                </button>
              </div>

              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => funcion.active && handleToggle(funcion.key)}
                  disabled={!funcion.active}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    funcion.enabled
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  } ${!funcion.active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      funcion.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFunciones({
              cierres_caja: true,
              tickets_abiertos: false,
              tipo_pedido: false,
              venta_con_stock: true,
              funcion_reloj: false,
              impresoras_cocina: false,
              pantalla_clientes: false,
            });
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </Card>
  );
}
