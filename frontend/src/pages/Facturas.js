import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Printer } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

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
        .header p { margin: 2px 0; font-size: 11px; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
        .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
        .footer { margin-top: 15px; text-align: center; font-size: 11px; }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write('<div class="header">');
      printWindow.document.write(`<h1>${config.nombre_negocio || 'Mi Negocio'}</h1>`);
      if (config.direccion) {
        printWindow.document.write(`<p>${config.direccion}</p>`);
      }
      if (config.telefono) {
        printWindow.document.write(`<p>Tel: ${config.telefono}</p>`);
      }
      if (config.rfc) {
        printWindow.document.write(`<p>RFC: ${config.rfc}</p>`);
      }
      if (config.email) {
        printWindow.document.write(`<p>${config.email}</p>`);
      }
      if (config.sitio_web) {
        printWindow.document.write(`<p>${config.sitio_web}</p>`);
      }
      printWindow.document.write('</div>');
      printWindow.document.write('<div class="divider"></div>');
      printWindow.document.write(`<p style="text-align:center; margin: 5px 0;">Factura: ${invoice.numero}</p>`);
      printWindow.document.write(
        `<p style="text-align:center; margin: 5px 0; font-size: 10px;">Fecha: ${new Date(invoice.fecha).toLocaleString('es-ES')}</p>`
      );
      printWindow.document.write(
        `<p style="text-align:center; margin: 5px 0; font-size: 10px;">Atendió: ${invoice.vendedor_nombre}</p>`
      );
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
      printWindow.document.write('<div class="divider"></div>');
      printWindow.document.write(
        `<div class="footer"><p>${config.mensaje_pie}</p></div>`
      );
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al imprimir factura');
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div data-testid="invoices-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Facturas</h1>
        <p className="text-slate-600">Historial de ventas realizadas</p>
      </div>

      {facturas.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay facturas</h3>
          <p className="text-slate-500">
            Las facturas aparecerán aquí cuando realices ventas
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {facturas.map((factura) => (
            <Card
              key={factura.id}
              data-testid={`invoice-card-${factura.id}`}
              className="p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    {factura.numero}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {new Date(factura.fecha).toLocaleString('es-ES')}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Vendedor: {factura.vendedor_nombre}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold font-mono text-blue-600">
                    ${factura.total.toFixed(2)}
                  </p>
                  <Button
                    onClick={() => printInvoice(factura)}
                    data-testid={`print-invoice-${factura.id}`}
                    size="sm"
                    className="mt-3 gap-2"
                  >
                    <Printer size={16} />
                    Imprimir
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-semibold mb-3">Productos:</h4>
                <div className="space-y-2">
                  {factura.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{item.nombre}</p>
                        <p className="text-sm text-slate-500">
                          Cantidad: {item.cantidad} x ${item.precio.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-blue-600">
                        ${item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
