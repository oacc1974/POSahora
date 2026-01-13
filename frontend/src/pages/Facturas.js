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
import { FileText, Printer, MoreVertical, RotateCcw, ChevronLeft, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
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
      setSelectedFactura(null);
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
      
      let clienteData = null;
      if (invoice.cliente_id) {
        try {
          const clienteResponse = await axios.get(
            `${API_URL}/api/clientes/buscar/${invoice.cliente_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          clienteData = clienteResponse.data;
        } catch (error) {
          console.error('Error loading client:', error);
        }
      }

      const printWindow = window.open('', '', 'height=600,width=400');
      printWindow.document.write('<html><head><title>Factura</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: monospace; padding: 20px; font-size: 12px; }
        h1 { text-align: center; font-size: 16px; margin: 0; }
        .header { text-align: center; margin-bottom: 15px; }
        .header p { margin: 2px 0; font-size: 11px; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
        .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
        .footer { margin-top: 15px; text-align: center; font-size: 11px; }
      `);
      printWindow.document.write('</style></head><body>');
      
      printWindow.document.write('<div class="header">');
      printWindow.document.write(`<h1>${config.nombre_negocio || 'Mi Negocio'}</h1>`);
      if (config.direccion) printWindow.document.write(`<p>${config.direccion}</p>`);
      if (config.telefono) printWindow.document.write(`<p>Tel: ${config.telefono}</p>`);
      printWindow.document.write('</div>');
      printWindow.document.write('<div class="divider"></div>');
      printWindow.document.write(`<p style="text-align:center;">Factura: ${invoice.numero}</p>`);
      printWindow.document.write(`<p style="text-align:center; font-size: 10px;">Fecha: ${new Date(invoice.fecha).toLocaleString('es-ES')}</p>`);
      printWindow.document.write('<div class="divider"></div>');
      
      printWindow.document.write('<div class="items">');
      invoice.items.forEach((item) => {
        printWindow.document.write(
          `<div class="item"><span>${item.nombre} x${item.cantidad}</span><span>$${item.subtotal.toFixed(2)}</span></div>`
        );
      });
      printWindow.document.write('</div>');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Vista de detalle de factura
  if (selectedFactura) {
    return (
      <div data-testid="invoice-detail-page" className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setSelectedFactura(null)}
              className="flex items-center gap-2 text-slate-600"
            >
              <ChevronLeft size={20} />
              <span>Volver</span>
            </button>
            <h1 className="font-semibold">Recibo {selectedFactura.numero}</h1>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(showMenu === selectedFactura.id ? null : selectedFactura.id)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <MoreVertical size={20} />
              </button>
              {showMenu === selectedFactura.id && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-50 py-1 min-w-[180px]">
                  <button
                    onClick={() => {
                      setShowMenu(null);
                      setShowReembolsoDialog(true);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-red-600"
                  >
                    <RotateCcw size={18} />
                    <span>Reembolsar</span>
                  </button>
                  <button
                    onClick={() => {
                      printInvoice(selectedFactura);
                      setShowMenu(null);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <Printer size={18} />
                    <span>Imprimir</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contenido del recibo */}
        <div className="p-4 space-y-4">
          {/* Info general */}
          <Card className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500">Fecha</p>
                <p className="font-medium">{new Date(selectedFactura.fecha).toLocaleString('es-ES')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Estado</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  selectedFactura.estado === 'reembolsado' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {selectedFactura.estado === 'reembolsado' ? 'Reembolsado' : 'Completado'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Vendedor</p>
                <p className="font-medium">{selectedFactura.vendedor_nombre}</p>
              </div>
              <div>
                <p className="text-slate-500">Método de pago</p>
                <p className="font-medium">{selectedFactura.metodo_pago || 'Efectivo'}</p>
              </div>
            </div>
          </Card>

          {/* Productos */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Productos</h3>
            <div className="space-y-3">
              {selectedFactura.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-sm text-slate-500">
                      {item.cantidad} x ${item.precio.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-mono font-semibold">${item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Total */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-blue-600">${selectedFactura.total.toFixed(2)}</span>
            </div>
          </Card>

          {/* Comentarios si existen */}
          {selectedFactura.comentarios && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Comentarios</h3>
              <p className="text-sm text-slate-600">{selectedFactura.comentarios}</p>
            </Card>
          )}
        </div>

        {/* Dialog de Reembolso */}
        <Dialog open={showReembolsoDialog} onOpenChange={setShowReembolsoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Reembolso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                ¿Estás seguro de que deseas reembolsar este recibo por <strong>${selectedFactura.total.toFixed(2)}</strong>?
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
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
        )}
      </div>
    );
  }

  // Vista de lista de facturas
  return (
    <div data-testid="invoices-page" className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-2xl font-bold text-slate-900">Ingresos</h1>
        <p className="text-sm text-slate-500">Historial de ventas realizadas</p>
      </div>

      {facturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText size={64} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay facturas</h3>
          <p className="text-slate-500">Las facturas aparecerán aquí cuando realices ventas</p>
        </div>
      ) : (
        <div className="divide-y bg-white">
          {facturas.map((factura) => (
            <div
              key={factura.id}
              data-testid={`invoice-row-${factura.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => setSelectedFactura(factura)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{factura.numero}</p>
                  {factura.estado === 'reembolsado' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                      Reembolsado
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(factura.fecha).toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
                <p className="text-xs text-slate-400">{factura.vendedor_nombre}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold font-mono ${
                  factura.estado === 'reembolsado' ? 'text-red-600 line-through' : 'text-green-600'
                }`}>
                  ${factura.total.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">
                  {factura.items?.length || 0} artículos
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
