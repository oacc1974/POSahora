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
import BarcodeScanner from '../components/BarcodeScanner';
import { Plus, Minus, Trash2, Scan, Printer, X, Search } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
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
  const [showClienteDialog, setShowClienteDialog] = useState(false);
  const [showNuevoClienteDialog, setShowNuevoClienteDialog] = useState(false);
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [comentarios, setComentarios] = useState('');
  const [metodosPago, setMetodosPago] = useState([]);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(null);
  const [tiposPedido, setTiposPedido] = useState([]);
  const [tipoPedidoSeleccionado, setTipoPedidoSeleccionado] = useState(null);
  const [requiereCierres, setRequiereCierres] = useState(true);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    nombre: '',
    cedula_ruc: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  useEffect(() => {
    fetchProductos();
    verificarCaja();
    fetchMetodosPago();
    fetchTiposPedido();
    fetchFuncionesConfig();
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

  const fetchMetodosPago = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/metodos-pago`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activos = response.data.filter(m => m.activo);
      setMetodosPago(activos);
      if (activos.length > 0) {
        setMetodoPagoSeleccionado(activos[0].id);
      }
    } catch (error) {
      console.error('Error al cargar métodos de pago:', error);
    }
  };

  const fetchTiposPedido = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tipos-pedido`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activos = response.data.filter(t => t.activo);
      setTiposPedido(activos);
      if (activos.length > 0) {
        setTipoPedidoSeleccionado(activos[0].id);
      }
    } catch (error) {
      console.error('Error al cargar tipos de pedido:', error);
    }
  };

  const fetchFuncionesConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/funciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequiereCierres(response.data.cierres_caja);
    } catch (error) {
      console.error('Error al cargar configuración de funciones:', error);
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
      setShowAperturaCaja(false);
      setMontoInicial('');
      toast.success('Caja abierta correctamente. ¡Puedes comenzar a vender!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al abrir caja');
    }
  };

  const buscarClientePorCedula = async () => {
    if (!cedulaBusqueda.trim()) {
      toast.error('Ingresa una cédula o RUC');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/clientes/buscar/${cedulaBusqueda}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setClienteSeleccionado(response.data);
      toast.success(`Cliente encontrado: ${response.data.nombre}`);
      setShowClienteDialog(false);
      setCedulaBusqueda('');
    } catch (error) {
      toast.error('Cliente no encontrado');
    }
  };

  const handleCrearNuevoCliente = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/clientes`,
        nuevoClienteForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setClienteSeleccionado(response.data);
      toast.success('Cliente creado y seleccionado');
      setShowNuevoClienteDialog(false);
      setShowClienteDialog(false);
      setNuevoClienteForm({
        nombre: '',
        cedula_ruc: '',
        telefono: '',
        email: '',
        direccion: '',
      });
    } catch (error) {
      toast.error('Error al crear cliente');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!cajaActiva) {
      toast.error('Debes abrir una caja antes de realizar ventas');
      setShowAperturaCaja(true);
      return;
    }

    if (!metodoPagoSeleccionado) {
      toast.error('Selecciona un método de pago');
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
          cliente_id: clienteSeleccionado?.id || null,
          comentarios: comentarios || null,
          metodo_pago_id: metodoPagoSeleccionado,
          tipo_pedido_id: tipoPedidoSeleccionado,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`Factura ${response.data.numero} creada correctamente`);
      setCart([]);
      setClienteSeleccionado(null);
      setComentarios('');
      fetchProductos();
      verificarCaja();
      printInvoice(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar la venta');
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
      
      if (config.mostrar_info_cliente && clienteData) {
        printWindow.document.write('<div style="margin-bottom: 10px;">');
        printWindow.document.write('<p style="font-weight: bold; font-size: 11px; margin: 2px 0;">CLIENTE:</p>');
        printWindow.document.write(`<p style="font-size: 11px; margin: 2px 0;">${clienteData.nombre}</p>`);
        if (clienteData.cedula_ruc) {
          printWindow.document.write(`<p style="font-size: 10px; margin: 2px 0;">Cédula/RUC: ${clienteData.cedula_ruc}</p>`);
        }
        if (clienteData.direccion) {
          printWindow.document.write(`<p style="font-size: 10px; margin: 2px 0;">${clienteData.direccion}</p>`);
        }
        if (clienteData.telefono) {
          printWindow.document.write(`<p style="font-size: 10px; margin: 2px 0;">Tel: ${clienteData.telefono}</p>`);
        }
        printWindow.document.write('</div>');
        printWindow.document.write('<div class="divider"></div>');
      }
      
      if (config.mostrar_comentarios && invoice.comentarios) {
        printWindow.document.write('<div style="margin-bottom: 10px;">');
        printWindow.document.write('<p style="font-weight: bold; font-size: 11px; margin: 2px 0;">COMENTARIOS:</p>');
        printWindow.document.write(`<p style="font-size: 10px; margin: 2px 0;">${invoice.comentarios}</p>`);
        printWindow.document.write('</div>');
        printWindow.document.write('<div class="divider"></div>');
      }
      printWindow.document.write('<div class="items">');
      invoice.items.forEach((item) => {
        printWindow.document.write(
          `<div class="item"><span>${item.nombre} x${item.cantidad}</span><span>$${item.subtotal.toFixed(2)}</span></div>`
        );
      });
      printWindow.document.write('</div>');
      
      // Mostrar subtotal si hay impuestos
      if (invoice.desglose_impuestos && invoice.desglose_impuestos.length > 0) {
        printWindow.document.write('<div class="divider"></div>');
        printWindow.document.write(
          `<div class="item"><span>SUBTOTAL:</span><span>$${invoice.subtotal.toFixed(2)}</span></div>`
        );
        
        // Mostrar cada impuesto
        invoice.desglose_impuestos.forEach((impuesto) => {
          printWindow.document.write(
            `<div class="item"><span>${impuesto.nombre} (${impuesto.tasa}%) ${impuesto.tipo === 'incluido' ? '[Incluido]' : ''}:</span><span>$${impuesto.monto.toFixed(2)}</span></div>`
          );
        });
      }
      
      printWindow.document.write(
        `<div class="total"><div class="item"><span>TOTAL:</span><span>$${invoice.total.toFixed(2)}</span></div></div>`
      );
      
      // Mostrar método de pago y tipo de pedido
      printWindow.document.write('<div class="divider"></div>');
      if (invoice.metodo_pago_nombre) {
        printWindow.document.write(
          `<div style="text-align: center; margin: 5px 0;"><p style="font-size: 11px; font-weight: bold;">Método de Pago: ${invoice.metodo_pago_nombre}</p></div>`
        );
      }
      if (invoice.tipo_pedido_nombre) {
        printWindow.document.write(
          `<div style="text-align: center; margin: 5px 0;"><p style="font-size: 11px; font-weight: bold;">Tipo de Pedido: ${invoice.tipo_pedido_nombre}</p></div>`
        );
      }
      
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                Punto de Venta
              </h1>
              <p className="text-sm md:text-base text-slate-600">Selecciona productos para la venta</p>
            </div>
            {cajaActiva && (
              <div className="hidden md:block px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-xs text-green-700 font-medium">
                  Caja Abierta
                </p>
                <p className="text-sm font-mono font-bold text-green-900">
                  ${cajaActiva.monto_final.toFixed(2)}
                </p>
              </div>
            )}
          </div>
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
          <h2 className="text-xl lg:text-2xl font-bold mb-3">Carrito</h2>
          
          {/* Cliente */}
          <div className="mb-3">
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">
                    {clienteSeleccionado.nombre}
                  </p>
                  <p className="text-xs text-blue-700">
                    Cédula: {clienteSeleccionado.cedula_ruc}
                  </p>
                </div>
                <button
                  onClick={() => setClienteSeleccionado(null)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <Button
                onClick={() => setShowClienteDialog(true)}
                data-testid="add-cliente-button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Plus size={16} />
                Agregar Cliente
              </Button>
            )}
          </div>

          {/* Comentarios */}
          <div>
            <Textarea
              placeholder="Comentarios (opcional)"
              data-testid="comentarios-input"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={2}
              maxLength={255}
              className="text-sm"
            />
          </div>
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
          {/* Selector de Método de Pago */}
          {metodosPago.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-semibold mb-2 block">
                Método de Pago
              </Label>
              <select
                value={metodoPagoSeleccionado || ''}
                onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {metodosPago.map((metodo) => (
                  <option key={metodo.id} value={metodo.id}>
                    {metodo.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Tipo de Pedido */}
          {tiposPedido.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-semibold mb-2 block">
                Tipo de Pedido
              </Label>
              <select
                value={tipoPedidoSeleccionado || ''}
                onChange={(e) => setTipoPedidoSeleccionado(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tiposPedido.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* Dialog Apertura de Caja */}
      <Dialog open={showAperturaCaja} onOpenChange={setShowAperturaCaja}>
        <DialogContent data-testid="apertura-caja-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Abrir Caja para Vender</DialogTitle>
          </DialogHeader>

          <div className="mb-4">
            <p className="text-slate-600">
              Antes de realizar ventas, debes abrir tu caja con una base inicial.
            </p>
          </div>

          <form onSubmit={handleAbrirCaja} className="space-y-4">
            <div>
              <Label htmlFor="monto_inicial_pos">Base de Caja (Monto Inicial) *</Label>
              <Input
                id="monto_inicial_pos"
                data-testid="monto-inicial-pos-input"
                type="number"
                step="0.01"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                required
                placeholder="0.00"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                Ingresa el monto con el que inicias tu caja
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                data-testid="confirmar-apertura-pos-button"
                className="flex-1"
              >
                Abrir Caja y Comenzar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Buscar Cliente */}
      <Dialog open={showClienteDialog} onOpenChange={setShowClienteDialog}>
        <DialogContent data-testid="buscar-cliente-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cedula_busqueda">Cédula o RUC</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="cedula_busqueda"
                  data-testid="cedula-busqueda-input"
                  value={cedulaBusqueda}
                  onChange={(e) => setCedulaBusqueda(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      buscarClientePorCedula();
                    }
                  }}
                  placeholder="Ingresa cédula o RUC"
                  maxLength={13}
                />
                <Button
                  onClick={buscarClientePorCedula}
                  data-testid="buscar-cliente-button"
                  className="gap-2"
                >
                  <Search size={16} />
                  Buscar
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                10 dígitos para Cédula, 13 para RUC
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  setShowClienteDialog(false);
                  setShowNuevoClienteDialog(true);
                }}
                data-testid="crear-nuevo-cliente-button"
                variant="outline"
                className="w-full gap-2"
              >
                <Plus size={16} />
                Crear Nuevo Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Crear Nuevo Cliente */}
      <Dialog open={showNuevoClienteDialog} onOpenChange={setShowNuevoClienteDialog}>
        <DialogContent data-testid="nuevo-cliente-dialog" className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCrearNuevoCliente} className="space-y-4">
            <div>
              <Label htmlFor="nuevo_nombre">Nombre *</Label>
              <Input
                id="nuevo_nombre"
                data-testid="nuevo-cliente-nombre-input"
                value={nuevoClienteForm.nombre}
                onChange={(e) =>
                  setNuevoClienteForm({ ...nuevoClienteForm, nombre: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="nuevo_cedula">Cédula o RUC *</Label>
              <Input
                id="nuevo_cedula"
                data-testid="nuevo-cliente-cedula-input"
                value={nuevoClienteForm.cedula_ruc}
                onChange={(e) =>
                  setNuevoClienteForm({ ...nuevoClienteForm, cedula_ruc: e.target.value })
                }
                placeholder="10 o 13 dígitos"
                maxLength={13}
                required
              />
            </div>

            <div>
              <Label htmlFor="nuevo_telefono">Teléfono</Label>
              <Input
                id="nuevo_telefono"
                data-testid="nuevo-cliente-telefono-input"
                value={nuevoClienteForm.telefono}
                onChange={(e) =>
                  setNuevoClienteForm({ ...nuevoClienteForm, telefono: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="nuevo_email">Email</Label>
              <Input
                id="nuevo_email"
                data-testid="nuevo-cliente-email-input"
                type="email"
                value={nuevoClienteForm.email}
                onChange={(e) =>
                  setNuevoClienteForm({ ...nuevoClienteForm, email: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="nuevo_direccion">Dirección</Label>
              <Input
                id="nuevo_direccion"
                data-testid="nuevo-cliente-direccion-input"
                value={nuevoClienteForm.direccion}
                onChange={(e) =>
                  setNuevoClienteForm({ ...nuevoClienteForm, direccion: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNuevoClienteDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="guardar-nuevo-cliente-button"
                className="flex-1"
              >
                Crear y Seleccionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
