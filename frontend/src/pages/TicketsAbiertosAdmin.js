import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  ClipboardList, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  User,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function TicketsAbiertosAdmin() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tickets-abiertos-pos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data);
    } catch (error) {
      console.error('Error al cargar tickets:', error);
      toast.error('Error al cargar los tickets abiertos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (ticket) => {
    setTicketToDelete(ticket);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete) return;
    
    setDeleting(ticketToDelete.id);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticketToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Ticket "${ticketToDelete.nombre}" eliminado correctamente`);
      fetchTickets();
    } catch (error) {
      console.error('Error al eliminar ticket:', error);
      toast.error('Error al eliminar el ticket');
    } finally {
      setDeleting(null);
      setShowDeleteDialog(false);
      setTicketToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const token = localStorage.getItem('token');
      let deleted = 0;
      
      for (const ticket of tickets) {
        try {
          await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticket.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          deleted++;
        } catch (error) {
          console.error(`Error al eliminar ticket ${ticket.id}:`, error);
        }
      }
      
      toast.success(`${deleted} ticket(s) eliminado(s) correctamente`);
      fetchTickets();
    } catch (error) {
      console.error('Error al eliminar tickets:', error);
      toast.error('Error al eliminar los tickets');
    } finally {
      setShowDeleteAllDialog(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalAmount = tickets.reduce((sum, t) => sum + (t.subtotal || 0), 0);
  const totalItems = tickets.reduce((sum, t) => sum + (t.items?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets Abiertos</h1>
          <p className="text-slate-600">Administra los pedidos guardados sin cobrar</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchTickets}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="ml-2">Actualizar</span>
          </Button>
          {tickets.length > 0 && (
            <Button
              onClick={() => setShowDeleteAllDialog(true)}
              variant="destructive"
            >
              <Trash2 size={18} />
              <span className="ml-2">Eliminar Todos</span>
            </Button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
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
      </div>

      {/* Advertencia si hay tickets */}
      {tickets.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Tienes <strong>{tickets.length} ticket(s)</strong> abiertos. 
            Mientras haya tickets abiertos, no podrás desactivar la función "Tickets abiertos" en la configuración.
          </p>
        </div>
      )}

      {/* Lista de tickets */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Ticket</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Productos</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Subtotal</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Fecha Creación</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Acciones</th>
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
                          <p className="text-xs text-slate-500">ID: {ticket.id.slice(0, 8)}...</p>
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
                      <span className="font-mono font-semibold text-green-600">
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
                        onClick={() => handleDeleteClick(ticket)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deleting === ticket.id}
                      >
                        {deleting === ticket.id ? (
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

      {/* Dialog confirmar eliminación individual */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Ticket</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              ¿Estás seguro de eliminar el ticket <strong>"{ticketToDelete?.nombre}"</strong>?
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Esta acción no se puede deshacer. El pedido se perderá permanentemente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación masiva */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Todos los Tickets</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">
                Esta acción eliminará <strong>{tickets.length} ticket(s)</strong> por un valor total de <strong>${totalAmount.toFixed(2)}</strong>
              </p>
            </div>
            <p className="text-slate-600">
              ¿Estás seguro de eliminar todos los tickets abiertos?
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Esta acción no se puede deshacer. Todos los pedidos se perderán permanentemente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll}>
              Eliminar Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
