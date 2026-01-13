import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { FileText, Printer, MoreVertical, RotateCcw, X, Calendar, User, CreditCard, Receipt, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReembolsoDialog, setShowReembolsoDialog] = useState(false);
  const [reembolsoMotivo, setReembolsoMotivo] = useState('');

  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/facturas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFacturas(response.data);
      // Seleccionar la primera factura por defecto si hay facturas
      if (response.data.length > 0 && !selectedFactura) {
        setSelectedFactura(response.data[0]);
      }
    } catch (error) {
      toast.error('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  const handleReembolso = async () => {
    if (!selectedFactura) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/facturas/${selectedFactura.id}/reembolso`,
        { motivo: reembolsoMotivo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Reembolso procesado correctamente');
      setShowReembolsoDialog(false);
      setReembolsoMotivo('');
      fetchFacturas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar reembolso');
    }
  };

  const printInvoice = async (invoice) => {
    try {
      const token = localStorage.getItem('token');
      const configResponse = await axios.get(`${API_URL}/api/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const config = configResponse.data;

      const printWindow = window.open('', '', 'height=600,width=400');
      printWindow.document.write('<html><head><title>Factura</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: monospace; padding: 20px; font-size: 12px; }
        h1 { text-align: center; font-size: 16px; margin: 0; }
        .header { text-align: center; margin-bottom: 15px; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write('<div class="header">');
      printWindow.document.write(`<h1>${config.nombre_negocio || 'Mi Negocio'}</h1>`);
      if (config.direccion) printWindow.document.write(`<p>${config.direccion}</p>`);
      printWindow.document.write('</div>');
      printWindow.document.write('<div class="divider"></div>');
      printWindow.document.write(`<p style="text-align:center;">Factura: ${invoice.numero}</p>`);
      printWindow.document.write(`<p style="text-align:center; font-size: 10px;">Fecha: ${new Date(invoice.fecha).toLocaleString('es-ES')}</p>`);
      printWindow.document.write('<div class="divider"></div>');
      invoice.items.forEach((item) => {
        printWindow.document.write(
          `<div class="item"><span>${item.nombre} x${item.cantidad}</span><span>$${item.subtotal.toFixed(2)}</span></div>`
        );
      });
      printWindow.document.write(
        `<div class="total"><div class="item"><span>TOTAL:</span><span>$${invoice.total.toFixed(2)}</span></div></div>`
      );
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      toast.error('Error al imprimir factura');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="invoices-page" className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ingresos</h1>
          <p className="text-sm text-slate-500">Historial de recibos y ventas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar size={16} />
            Hoy
            <ChevronDown size={14} />
          </Button>
        </div>
      </div>

      {facturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border">
          <FileText size={64} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay facturas</h3>
          <p className="text-slate-500">Las facturas aparecerán aquí cuando realices ventas</p>
        </div>
      ) : (
        <div className="flex gap-4 h-full">
          {/* Tabla de recibos (izquierda) */}
          <div className="flex-1 bg-white rounded-lg border overflow-hidden flex flex-col">
            {/* Header de la tabla */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b text-sm font-medium text-slate-600">
              <div className="col-span-2">Recibo</div>
              <div className="col-span-2">Fecha</div>
              <div className="col-span-2">Hora</div>
              <div className="col-span-2">Empleado</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-2 text-center">Estado</div>
            </div>
            
            {/* Filas de la tabla */}
            <div className="flex-1 overflow-auto">
              {facturas.map((factura) => (
                <div
                  key={factura.id}
                  data-testid={`invoice-row-${factura.id}`}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 border-b cursor-pointer transition-colors ${
                    selectedFactura?.id === factura.id 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedFactura(factura)}
                >
                  <div className="col-span-2 font-mono text-sm font-medium">
                    {factura.numero.split('-').pop()}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">
                    {formatDate(factura.fecha)}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">
                    {formatTime(factura.fecha)}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600 truncate">
                    {factura.vendedor_nombre}
                  </div>
                  <div className={`col-span-2 text-right font-mono font-semibold ${
                    factura.estado === 'reembolsado' ? 'text-red-600 line-through' : 'text-green-600'
                  }`}>
                    ${factura.total.toFixed(2)}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      factura.estado === 'reembolsado' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {factura.estado === 'reembolsado' ? 'Reembolsado' : 'Completado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel de detalle del recibo (derecha) */}
          {selectedFactura && (
            <Card className="w-96 flex flex-col overflow-hidden">
              {/* Header del ticket */}
              <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-lg">Recibo #{selectedFactura.numero.split('-').pop()}</h3>
                  <p className="text-sm text-slate-500">{selectedFactura.numero}</p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <MoreVertical size={20} className="text-slate-600" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-50 py-1 min-w-[160px]">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowReembolsoDialog(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-red-600"
                        disabled={selectedFactura.estado === 'reembolsado'}
                      >
                        <RotateCcw size={16} />
                        <span>Reembolsar</span>
                      </button>
                      <button
                        onClick={() => {
                          printInvoice(selectedFactura);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                      >
                        <Printer size={16} />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Info del ticket */}
              <div className="p-4 space-y-3 border-b">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-slate-600">
                    {new Date(selectedFactura.fecha).toLocaleString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User size={16} className="text-slate-400" />
                  <span className="text-slate-600">{selectedFactura.vendedor_nombre}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard size={16} className="text-slate-400" />
                  <span className="text-slate-600">{selectedFactura.metodo_pago_nombre || 'Efectivo'}</span>
                </div>
                {selectedFactura.estado === 'reembolsado' && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
                    <RotateCcw size={14} />
                    <span>Este recibo fue reembolsado</span>
                  </div>
                )}
              </div>

              {/* Lista de productos */}
              <div className="flex-1 overflow-auto p-4">
                <h4 className="text-sm font-semibold text-slate-500 mb-3">ARTÍCULOS</h4>
                <div className="space-y-3">
                  {selectedFactura.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {item.cantidad} × ${item.precio.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-mono font-semibold text-sm">${item.subtotal.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="p-4 border-t bg-slate-50">
                <div className="flex justify-between items-center mb-2 text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>${selectedFactura.subtotal?.toFixed(2) || selectedFactura.total.toFixed(2)}</span>
                </div>
                {selectedFactura.total_impuestos > 0 && (
                  <div className="flex justify-between items-center mb-2 text-sm text-slate-600">
                    <span>Impuestos</span>
                    <span>${selectedFactura.total_impuestos.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-bold">Total</span>
                  <span className={`text-xl font-bold font-mono ${
                    selectedFactura.estado === 'reembolsado' ? 'text-red-600 line-through' : 'text-green-600'
                  }`}>
                    ${selectedFactura.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Comentarios */}
              {selectedFactura.comentarios && (
                <div className="p-4 border-t">
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">COMENTARIOS</h4>
                  <p className="text-sm text-slate-600">{selectedFactura.comentarios}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Dialog de Reembolso */}
      <Dialog open={showReembolsoDialog} onOpenChange={setShowReembolsoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Reembolso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas reembolsar el recibo <strong>{selectedFactura?.numero}</strong> por <strong>${selectedFactura?.total.toFixed(2)}</strong>?
            </p>
            <p className="text-xs text-slate-500">
              Esta acción devolverá el stock de los productos vendidos.
            </p>
            <div>
              <label className="text-sm font-medium">Motivo del reembolso (opcional)</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-lg text-sm"
                rows={3}
                placeholder="Escribe el motivo del reembolso..."
                value={reembolsoMotivo}
                onChange={(e) => setReembolsoMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReembolsoDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReembolso}>
              Confirmar Reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay para cerrar menú */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
}
