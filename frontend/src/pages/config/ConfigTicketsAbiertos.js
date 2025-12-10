import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Plus, MoreVertical, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigTicketsAbiertos() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [usarPredefinidos, setUsarPredefinidos] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tickets-predefinidos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data);
    } catch (error) {
      toast.error('Error al cargar tickets predefinidos');
    }
  };

  const handleAdd = async () => {
    if (!nuevoNombre.trim()) {
      toast.error('Ingresa un nombre para el ticket');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/tickets-predefinidos`,
        { nombre: nuevoNombre },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Ticket predefinido creado');
      setNuevoNombre('');
      setShowDialog(false);
      fetchTickets();
    } catch (error) {
      toast.error('Error al crear ticket predefinido');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('¿Estás seguro de eliminar este ticket predefinido?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tickets-predefinidos/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Ticket predefinido eliminado');
      fetchTickets();
    } catch (error) {
      toast.error('Error al eliminar ticket predefinido');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Tickets abiertos</h2>
      </div>

      {/* Selector de Tienda (placeholder) */}
      <div className="flex justify-end">
        <div className="text-sm">
          <div className="text-slate-600 mb-1">Tienda</div>
          <div className="border rounded-md px-3 py-2 bg-white text-slate-700 min-w-[180px]">
            Dalicias ▼
          </div>
        </div>
      </div>

      {/* Opción de activación */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">Usar tickets predefinidos</h3>
            <p className="text-sm text-slate-600">
              Esta opción le permite asignar rápidamente nombres a los tickets abiertos. Por ejemplo, la mesa 1, mesa 2, etc.{' '}
              <a href="#" className="text-blue-600 inline-flex items-center gap-1">
                Más información <ExternalLink size={12} />
              </a>
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={usarPredefinidos}
              onChange={(e) => setUsarPredefinidos(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </Card>

      {/* Lista de Tickets Predefinidos */}
      {usarPredefinidos && (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <MoreVertical className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-900">{ticket.nombre}</span>
                </div>

                <button
                  onClick={() => handleDelete(ticket.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}

            {tickets.length === 0 && (
              <div className="px-6 py-12 text-center text-slate-500">
                No hay tickets predefinidos.
                <br />
                Añade tu primer ticket usando el botón de abajo.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Botón Añadir */}
      {usarPredefinidos && (
        <Button
          onClick={() => setShowDialog(true)}
          variant="ghost"
          className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50 font-semibold"
        >
          <Plus className="mr-2 h-5 w-5" />
          AÑADIR TICKETS PREDEFINIDOS
        </Button>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline">CANCELAR</Button>
        <Button className="bg-green-600 hover:bg-green-700">GUARDAR</Button>
      </div>

      {/* Dialog para añadir ticket */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Ticket Predefinido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre del ticket</Label>
              <Input
                id="nombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej: Mesa 3, Terraza, Barra"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setNuevoNombre('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={loading}>
              {loading ? 'Añadiendo...' : 'Añadir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
