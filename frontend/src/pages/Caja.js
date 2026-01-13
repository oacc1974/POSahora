import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Wallet, DollarSign, TrendingUp, Clock, CheckCircle, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Caja() {
  const navigate = useNavigate();
  const [cajaActiva, setCajaActiva] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApertura, setShowApertura] = useState(false);
  const [showCierre, setShowCierre] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');

  useEffect(() => {
    fetchCajaActiva();
    fetchHistorial();
  }, []);

  const fetchCajaActiva = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/caja/activa`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCajaActiva(response.data);
    } catch (error) {
      console.error('Error al cargar caja activa:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/caja/historial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistorial(response.data);
    } catch (error) {
      toast.error('Error al cargar historial');
    }
  };

  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/caja/abrir`,
        { monto_inicial: parseFloat(montoInicial) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCajaActiva(response.data);
      setShowApertura(false);
      setMontoInicial('');
      toast.success('Caja abierta correctamente');
      fetchHistorial();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al abrir caja');
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/caja/cerrar`,
        { efectivo_contado: parseFloat(efectivoContado) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      printCierreCaja(response.data);
      
      setCajaActiva(null);
      setShowCierre(false);
      setEfectivoContado('');
      toast.success('Caja cerrada correctamente');
      fetchHistorial();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar caja');
    }
  };

  const printCierreCaja = (caja) => {
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write('<html><head><title>Cierre de Caja</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: monospace; padding: 20px; font-size: 12px; }
      h1 { text-align: center; font-size: 16px; margin: 0; }
      .header { text-align: center; margin-bottom: 15px; }
      .divider { border-top: 1px dashed #000; margin: 10px 0; }
      .item { display: flex; justify-content: space-between; margin: 8px 0; }
      .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 14px; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<h1>CIERRE DE CAJA</h1>');
    printWindow.document.write(`<p>${caja.numero}</p>`);
    printWindow.document.write('</div>');
    printWindow.document.write('<div class="divider"></div>');
    printWindow.document.write(`<p>Cajero: ${caja.usuario_nombre}</p>`);
    printWindow.document.write(
      `<p>Apertura: ${new Date(caja.fecha_apertura).toLocaleString('es-ES')}</p>`
    );
    printWindow.document.write(
      `<p>Cierre: ${new Date(caja.fecha_cierre).toLocaleString('es-ES')}</p>`
    );
    printWindow.document.write('<div class="divider"></div>');
    printWindow.document.write(
      `<div class="item"><span>Base de Caja:</span><span>$${caja.monto_inicial.toFixed(2)}</span></div>`
    );
    printWindow.document.write(
      `<div class="item"><span>Ventas (${caja.total_ventas}):</span><span>$${caja.monto_ventas.toFixed(2)}</span></div>`
    );
    printWindow.document.write(
      `<div class="total"><div class="item"><span>TOTAL ESPERADO:</span><span>$${caja.monto_final.toFixed(2)}</span></div></div>`
    );
    printWindow.document.write('<div class="divider"></div>');
    printWindow.document.write(
      `<div class="item"><span>Efectivo Contado:</span><span>$${caja.efectivo_contado.toFixed(2)}</span></div>`
    );
    const diferenciaTxt = caja.diferencia >= 0 ? `+$${caja.diferencia.toFixed(2)}` : `-$${Math.abs(caja.diferencia).toFixed(2)}`;
    printWindow.document.write(
      `<div class="item" style="font-weight: bold; color: ${caja.diferencia >= 0 ? 'green' : 'red'}"><span>Diferencia:</span><span>${diferenciaTxt}</span></div>`
    );
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div data-testid="caja-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
          Gestión de Caja
        </h1>
        <p className="text-slate-600">Control de apertura y cierre de caja</p>
      </div>

      {cajaActiva ? (
        <Card className="p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Caja Abierta</h2>
              <p className="text-sm text-slate-500">{cajaActiva.numero}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Base de Caja</p>
              <p className="text-2xl font-bold font-mono text-blue-900">
                ${cajaActiva.monto_inicial.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 mb-1">Ventas ({cajaActiva.total_ventas})</p>
              <p className="text-2xl font-bold font-mono text-green-900">
                ${cajaActiva.monto_ventas.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 mb-1">Total en Caja</p>
              <p className="text-2xl font-bold font-mono text-purple-900">
                ${cajaActiva.monto_final.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowCierre(true)}
              data-testid="cerrar-caja-button"
              variant="destructive"
              size="lg"
              className="flex-1"
            >
              Cerrar Caja
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-8 md:p-12 text-center mb-6">
          <Wallet size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay caja abierta</h3>
          <p className="text-slate-500 mb-6">
            Debes abrir una caja antes de realizar ventas
          </p>
          <Button
            onClick={() => setShowApertura(true)}
            data-testid="abrir-caja-button"
            size="lg"
            className="gap-2"
          >
            <DollarSign size={20} />
            Abrir Caja
          </Button>
        </Card>
      )}

      {/* Historial */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Historial de Cajas</h2>
        {historial.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No hay historial</p>
        ) : (
          <div className="space-y-3">
            {historial.map((caja) => (
              <div
                key={caja.id}
                data-testid={`caja-${caja.id}`}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{caja.numero}</p>
                    <p className="text-sm text-slate-600">{caja.usuario_nombre}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(caja.fecha_apertura).toLocaleString('es-ES')}
                      {caja.fecha_cierre && ` - ${new Date(caja.fecha_cierre).toLocaleString('es-ES')}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Base: ${caja.monto_inicial.toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Ventas: ${caja.monto_ventas.toFixed(2)}</p>
                    <p className="text-lg font-bold font-mono text-blue-600">
                      Total: ${caja.monto_final.toFixed(2)}
                    </p>
                    {caja.estado === 'cerrada' && caja.efectivo_contado !== null && (
                      <>
                        <p className="text-sm text-slate-600 mt-1">
                          Contado: ${caja.efectivo_contado.toFixed(2)}
                        </p>
                        <p className={`text-sm font-semibold ${caja.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Diferencia: {caja.diferencia >= 0 ? '+' : ''}{caja.diferencia.toFixed(2)}
                        </p>
                      </>
                    )}
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
                        caja.estado === 'abierta'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {caja.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog Apertura */}
      <Dialog open={showApertura} onOpenChange={setShowApertura}>
        <DialogContent data-testid="apertura-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAbrirCaja} className="space-y-4">
            <div>
              <Label htmlFor="monto_inicial">Base de Caja (Monto Inicial) *</Label>
              <Input
                id="monto_inicial"
                data-testid="monto-inicial-input"
                type="number"
                step="0.01"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                required
                placeholder="0.00"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                Ingresa el monto con el que inicias la caja
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApertura(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="confirmar-apertura-button"
                className="flex-1"
              >
                Abrir Caja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cierre */}
      <Dialog open={showCierre} onOpenChange={setShowCierre}>
        <DialogContent data-testid="cierre-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCerrarCaja} className="space-y-4">
            <p className="text-slate-600">
              Ingresa el efectivo contado en caja para cerrar el turno
            </p>

            {cajaActiva && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base de Caja:</span>
                    <span className="font-mono">${cajaActiva.monto_inicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventas ({cajaActiva.total_ventas}):</span>
                    <span className="font-mono">${cajaActiva.monto_ventas.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total Esperado:</span>
                    <span className="font-mono text-blue-600">
                      ${cajaActiva.monto_final.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="efectivo_contado">Efectivo Contado *</Label>
              <Input
                id="efectivo_contado"
                data-testid="efectivo-contado-input"
                type="number"
                step="0.01"
                value={efectivoContado}
                onChange={(e) => setEfectivoContado(e.target.value)}
                required
                placeholder="0.00"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                Cuenta el efectivo físico en caja e ingresa el monto total
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCierre(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="confirmar-cierre-button"
                variant="destructive"
                className="flex-1"
              >
                Cerrar Caja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
