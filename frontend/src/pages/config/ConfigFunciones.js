import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Clock, ClipboardList, Printer, Timer } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigFunciones() {
  const [config, setConfig] = useState({
    cierres_caja_turnos: false,
    funcion_reloj: false,
    tickets_abiertos: true,
    impresoras_cocina: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/config/funciones`, { headers });
      setConfig(response.data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setSaving(true);

    try {
      await axios.put(`${API_URL}/api/config/funciones`, newConfig, { headers });
      toast.success('Configuración actualizada');
    } catch (error) {
      // Revertir cambio si falla
      setConfig(config);
      toast.error('Error al actualizar configuración');
    } finally {
      setSaving(false);
    }
  };

  const funciones = [
    {
      key: 'cierres_caja_turnos',
      icon: Timer,
      titulo: 'Cierres de caja por turnos',
      descripcion: 'Controla el dinero que entra y sale del cajón por cada turno de trabajo'
    },
    {
      key: 'funcion_reloj',
      icon: Clock,
      titulo: 'Función de reloj',
      descripcion: 'Controla los tiempos de entrada y salida de los empleados'
    },
    {
      key: 'tickets_abiertos',
      icon: ClipboardList,
      titulo: 'Tickets abiertos',
      descripcion: 'Permite guardar y editar pedidos antes de cobrar y cerrarlos'
    },
    {
      key: 'impresoras_cocina',
      icon: Printer,
      titulo: 'Impresoras de cocina',
      descripcion: 'Envía comandas a la cocina a través de una impresora o pantalla'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="config-funciones">
      <div>
        <h1 className="text-2xl font-bold">Funciones</h1>
        <p className="text-muted-foreground">Activa o desactiva las funciones del sistema</p>
      </div>

      <div className="grid gap-4">
        {funciones.map((funcion) => {
          const Icon = funcion.icon;
          return (
            <Card key={funcion.key}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">{funcion.titulo}</Label>
                      <p className="text-sm text-muted-foreground">{funcion.descripcion}</p>
                    </div>
                  </div>
                  <Switch
                    checked={config[funcion.key]}
                    onCheckedChange={(value) => handleToggle(funcion.key, value)}
                    disabled={saving}
                    data-testid={`toggle-${funcion.key}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
