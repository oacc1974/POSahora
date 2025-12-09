import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import BarcodeScanner from '../components/BarcodeScanner';
import { Plus, Minus, Trash2, Scan, Printer } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function POS() {
  const [productos, setProductos] = useState([]);
  const [cart, setCart] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [cajaActiva, setCajaActiva] = useState(null);
  const [showAperturaCaja, setShowAperturaCaja] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');

  useEffect(() => {
    fetchProductos();
    verificarCaja();
  }, []);

  const verificarCaja = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/caja/activa`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data) {
        setCajaActiva(response.data);
      } else {
        setShowAperturaCaja(true);
      }
    } catch (error) {
      console.error('Error al verificar caja:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/productos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductos(response.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    }
  };

  const addToCart = (producto) => {
    const existing = cart.find((item) => item.producto_id === producto.id);
    if (existing) {
      if (existing.cantidad < producto.stock) {
        setCart(
          cart.map((item) =>
            item.producto_id === producto.id
              ? { 
                  ...item, 
                  cantidad: item.cantidad + 1,
                  subtotal: (item.cantidad + 1) * item.precio
                }
              : item
          )
        );
      } else {
        toast.error('No hay suficiente stock');
      }
    } else {
      if (producto.stock > 0) {
        setCart([
          ...cart,
          {
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1,
            subtotal: producto.precio,
            max_stock: producto.stock,
          },
        ]);
      } else {
        toast.error('Producto sin stock');
      }
    }
  };

  const updateQuantity = (producto_id, delta) => {
    const item = cart.find((i) => i.producto_id === producto_id);
    const newQty = item.cantidad + delta;

    if (newQty <= 0) {
      removeFromCart(producto_id);
    } else if (newQty <= item.max_stock) {
      setCart(
        cart.map((item) =>
          item.producto_id === producto_id
            ? {
                ...item,
                cantidad: newQty,
                subtotal: newQty * item.precio,
              }
            : item
        )
      );
    } else {
      toast.error('No hay suficiente stock');
    }
  };

  const removeFromCart = (producto_id) => {
    setCart(cart.filter((item) => item.producto_id !== producto_id));
  };

  const handleScan = async (result) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/productos/barcode/${result.text}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      addToCart(response.data);
      toast.success(`Producto escaneado: ${response.data.nombre}`);
      setShowScanner(false);
    } catch (error) {
      toast.error('Producto no encontrado');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

      const response = await axios.post(
        `${API_URL}/api/facturas`,
        {
          items: cart,
          total,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`Factura ${response.data.numero} creada correctamente`);
      setCart([]);
      fetchProductos();
      printInvoice(response.data);
    } catch (error) {
      toast.error('Error al procesar la venta');
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
      if (config.cabecera && config.cabecera.trim() !== '') {
        printWindow.document.write('<div style="text-align:center; margin-bottom: 8px; padding: 5px 0;">');
        printWindow.document.write(`<p style="font-size: 11px; font-weight: bold; margin: 0;">${config.cabecera}</p>`);
        printWindow.document.write('</div>');
        printWindow.document.write('<div class="divider"></div>');
      }
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

  const filteredProductos = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.codigo_barras &&
        p.codigo_barras.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-4 lg:gap-6" data-testid="pos-page">
      <div className="flex-1 flex flex-col order-2 lg:order-1">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            Punto de Venta
          </h1>
          <p className="text-sm md:text-base text-slate-600">Selecciona productos para la venta</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 mb-4 lg:mb-6">
          <Input
            placeholder="Buscar productos..."
            data-testid="product-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => setShowScanner(true)}
            data-testid="open-scanner-button"
            variant="outline"
            className="gap-2 w-full sm:w-auto"
          >
            <Scan size={20} />
            Escanear
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {filteredProductos.map((producto) => (
              <Card
                key={producto.id}
                data-testid={`pos-product-${producto.id}`}
                onClick={() => addToCart(producto)}
                className="p-4 cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all product-card"
              >
                <h3 className="font-bold text-sm mb-2 truncate">
                  {producto.nombre}
                </h3>
                <p className="text-2xl font-bold font-mono text-blue-600 mb-2">
                  ${producto.precio.toFixed(2)}
                </p>
                <p
                  className={`text-sm ${
                    producto.stock <= 5 ? 'text-red-600' : 'text-slate-500'
                  }`}
                >
                  Stock: {producto.stock}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Card className="w-full lg:w-96 flex flex-col shadow-xl order-1 lg:order-2 lg:sticky lg:top-0">
        <div className="p-4 lg:p-6 border-b border-slate-200">
          <h2 className="text-xl lg:text-2xl font-bold">Carrito</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-6 max-h-[300px] lg:max-h-none">
          {cart.length === 0 ? (
            <div
              className="flex items-center justify-center h-full text-slate-400"
              data-testid="empty-cart"
            >
              <p>Carrito vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.producto_id}
                  data-testid={`cart-item-${item.producto_id}`}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm flex-1">
                      {item.nombre}
                    </h3>
                    <button
                      onClick={() => removeFromCart(item.producto_id)}
                      data-testid={`remove-cart-item-${item.producto_id}`}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.producto_id, -1)}
                        data-testid={`decrease-quantity-${item.producto_id}`}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-100"
                      >
                        <Minus size={16} />
                      </button>
                      <span
                        className="w-12 text-center font-semibold"
                        data-testid={`cart-item-quantity-${item.producto_id}`}
                      >
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.producto_id, 1)}
                        data-testid={`increase-quantity-${item.producto_id}`}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <p className="font-mono font-bold text-blue-600">
                      ${item.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 lg:p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <span className="text-base lg:text-lg font-semibold">Total:</span>
            <span
              className="text-2xl lg:text-3xl font-bold font-mono text-blue-600"
              data-testid="cart-total"
            >
              ${total.toFixed(2)}
            </span>
          </div>

          <Button
            onClick={handleCheckout}
            data-testid="checkout-button"
            disabled={cart.length === 0 || loading}
            className="w-full h-12 lg:h-14 text-base lg:text-lg font-semibold gap-2"
          >
            <Printer size={20} />
            {loading ? 'Procesando...' : 'Finalizar Venta'}
          </Button>
        </div>
      </Card>

      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </div>
  );
}
