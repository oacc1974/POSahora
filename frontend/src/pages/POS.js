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
  DialogFooter,
} from '../components/ui/dialog';
import BarcodeScanner from '../components/BarcodeScanner';
import { Plus, Minus, Trash2, Scan, Printer, X, Search, Menu, Bell, User, MoreVertical, ChevronDown, UserPlus } from 'lucide-react';
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
  const [ticketsAbiertosFuncionActiva, setTicketsAbiertosFuncionActiva] = useState(false);
  const [ventaConStock, setVentaConStock] = useState(true);
  const [ticketsAbiertos, setTicketsAbiertos] = useState([]);
  const [showGuardarTicketDialog, setShowGuardarTicketDialog] = useState(false);
  const [showTicketsAbiertosDialog, setShowTicketsAbiertosDialog] = useState(false);
  const [mesasPredefinidas, setMesasPredefinidas] = useState([]);
  const [modoGuardar, setModoGuardar] = useState('mesa'); // 'mesa' o 'personalizado'
  const [nombreTicketPersonalizado, setNombreTicketPersonalizado] = useState('');
  const [ticketActualId, setTicketActualId] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  // Obtener usuario actual
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const esMesero = currentUser?.rol === 'mesero';
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    nombre: '',
    cedula_ruc: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [tpvsDisponibles, setTpvsDisponibles] = useState([]);
  const [tpvSeleccionado, setTpvSeleccionado] = useState(null);

  useEffect(() => {
    fetchProductos();
    verificarCaja();
    fetchMetodosPago();
    fetchTiposPedido();
    fetchFuncionesConfig();
    fetchMesasPredefinidas();
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
        // Cargar TPVs disponibles antes de mostrar el diálogo
        fetchTpvsDisponibles();
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
      setTicketsAbiertosFuncionActiva(response.data.tickets_abiertos);
      setVentaConStock(response.data.venta_con_stock);
      
      // Si tickets abiertos está activo, cargar la lista
      if (response.data.tickets_abiertos) {
        fetchTicketsAbiertos();
      }
    } catch (error) {
      console.error('Error al cargar configuración de funciones:', error);
    }
  };

  const fetchMesasPredefinidas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tickets-predefinidos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMesasPredefinidas(response.data);
    } catch (error) {
      console.error('Error al cargar mesas predefinidas:', error);
    }
  };

  const fetchTicketsAbiertos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tickets-abiertos-pos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTicketsAbiertos(response.data);
    } catch (error) {
      console.error('Error al cargar tickets abiertos:', error);
    }
  };

  const fetchTpvsDisponibles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tpv/disponibles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTpvsDisponibles(response.data);
      // Si hay TPVs disponibles, seleccionar el primero por defecto
      if (response.data.length > 0) {
        setTpvSeleccionado(response.data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar TPVs disponibles:', error);
    }
  };

  const handleClickGuardar = async () => {
    // Si hay un ticket actual (recuperado), actualizar automáticamente
    if (ticketActualId) {
      const ticketActual = ticketsAbiertos.find(t => t.id === ticketActualId);
      if (ticketActual) {
        await handleGuardarTicket(ticketActual.nombre);
      }
    } else {
      // Si es nuevo, mostrar dialog para seleccionar mesa
      setShowGuardarTicketDialog(true);
    }
  };

  const handleGuardarTicket = async (nombreMesa) => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!cajaActiva) {
      toast.error('Debes abrir una caja antes de guardar tickets');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

      // Si hay un ticket actual (recuperado), actualizar ese ticket
      if (ticketActualId) {
        await axios.put(
          `${API_URL}/api/tickets-abiertos-pos/${ticketActualId}`,
          {
            nombre: nombreMesa,
            items: cart,
            subtotal: total,
            cliente_id: clienteSeleccionado?.id || null,
            cliente_nombre: clienteSeleccionado?.nombre || null,
            comentarios: comentarios || null,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success(`Ticket "${nombreMesa}" actualizado correctamente`);
      } else {
        // Es un ticket nuevo, validar que el nombre no esté en uso
        const nombreExiste = ticketsAbiertos.some(
          (ticket) => ticket.nombre.toLowerCase() === nombreMesa.toLowerCase()
        );
        
        if (nombreExiste) {
          toast.error(`Ya existe un ticket con el nombre "${nombreMesa}"`);
          setLoading(false);
          return;
        }

        // Crear nuevo ticket
        await axios.post(
          `${API_URL}/api/tickets-abiertos-pos`,
          {
            nombre: nombreMesa,
            items: cart,
            subtotal: total,
            cliente_id: clienteSeleccionado?.id || null,
            cliente_nombre: clienteSeleccionado?.nombre || null,
            comentarios: comentarios || null,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success(`Ticket "${nombreMesa}" guardado correctamente`);
      }

      setCart([]);
      setClienteSeleccionado(null);
      setComentarios('');
      setTicketActualId(null);
      setShowGuardarTicketDialog(false);
      setNombreTicketPersonalizado('');
      setModoGuardar('mesa');
      fetchTicketsAbiertos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCargarTicket = (ticket) => {
    setCart(ticket.items);
    setTicketActualId(ticket.id);
    
    if (ticket.cliente_id) {
      setClienteSeleccionado({
        id: ticket.cliente_id,
        nombre: ticket.cliente_nombre
      });
    }
    
    if (ticket.comentarios) {
      setComentarios(ticket.comentarios);
    }

    setShowTicketsAbiertosDialog(false);
    toast.success(`Ticket "${ticket.nombre}" cargado`);
  };

  const handleEliminarTicket = async (ticketId) => {
    if (!window.confirm('¿Estás seguro de eliminar este ticket?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Ticket eliminado');
      fetchTicketsAbiertos();
    } catch (error) {
      toast.error('Error al eliminar ticket');
    }
  };

  const addToCart = (producto) => {
    const existing = cart.find((item) => item.producto_id === producto.id);
    if (existing) {
      // Si venta con stock está desactivado O hay stock suficiente
      if (!ventaConStock || existing.cantidad < producto.stock) {
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
      // Si venta con stock está desactivado O hay stock disponible
      if (!ventaConStock || producto.stock > 0) {
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
    } else {
      // Si venta con stock está desactivado O no excede el stock
      if (!ventaConStock || newQty <= item.max_stock) {
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
      const monto = requiereCierres ? parseFloat(montoInicial) : 0;
      const payload = { 
        monto_inicial: monto,
        tpv_id: tpvSeleccionado || null
      };
      const response = await axios.post(
        `${API_URL}/api/caja/abrir`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCajaActiva(response.data);
      setShowAperturaCaja(false);
      setMontoInicial('');
      setTpvSeleccionado(null);
      
      // Mensaje de éxito con info del TPV si corresponde
      if (response.data.tpv_nombre) {
        toast.success(`Caja abierta en ${response.data.tpv_nombre}. ¡Puedes comenzar a vender!`);
      } else {
        toast.success('Caja abierta correctamente. ¡Puedes comenzar a vender!');
      }
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
      fetchTpvsDisponibles();
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
      
      // Si venía de un ticket guardado, eliminarlo
      if (ticketActualId) {
        try {
          await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticketActualId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchTicketsAbiertos();
        } catch (error) {
          console.error('Error al eliminar ticket:', error);
        }
      }
      
      setCart([]);
      setClienteSeleccionado(null);
      setComentarios('');
      setTicketActualId(null);
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
    <div className="flex flex-col h-auto md:h-[calc(100vh-8rem)]" data-testid="pos-page">
      {/* Header Móvil */}
      <div className="md:hidden sticky top-0 z-50 bg-white border-b">
        {/* Barra superior con iconos */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Menu size={24} />
            <button 
              onClick={() => setShowMobileCart(true)}
              className="flex items-center gap-2"
            >
              <span className="font-semibold">Ticket</span>
              <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                {cart.reduce((sum, item) => sum + item.cantidad, 0)}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Bell size={20} />
            <button 
              onClick={() => setShowClienteDialog(true)}
              className="relative"
            >
              <User size={20} />
              {clienteSeleccionado && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
              )}
            </button>
            <MoreVertical size={20} />
          </div>
        </div>

        {/* Botones GUARDAR, TICKETS ABIERTOS y COBRAR */}
        <div className="bg-blue-600 px-4 pb-3">
          {ticketsAbiertosFuncionActiva ? (
            <div className="grid grid-cols-2 gap-2">
              {/* GUARDAR solo si hay productos */}
              {cart.length > 0 && (
                <Button
                  onClick={handleClickGuardar}
                  className="bg-blue-500 hover:bg-blue-400 h-10 font-semibold"
                >
                  {ticketActualId ? 'ACTUALIZAR' : 'GUARDAR'}
                </Button>
              )}
              
              {/* TICKETS ABIERTOS solo si HAY tickets guardados */}
              {ticketsAbiertos.length > 0 && (
                <Button
                  onClick={() => {
                    fetchTicketsAbiertos();
                    setShowTicketsAbiertosDialog(true);
                  }}
                  className={`bg-blue-500 hover:bg-blue-400 h-10 font-semibold ${cart.length === 0 ? 'col-span-2' : ''}`}
                >
                  TICKETS ABIERTOS
                </Button>
              )}

              {/* COBRAR - siempre visible si hay productos */}
              {cart.length > 0 && (
                <Button
                  onClick={() => setShowMobileCart(true)}
                  className={`bg-blue-700 hover:bg-blue-600 h-10 font-semibold ${ticketsAbiertos.length === 0 ? 'col-span-2' : ''}`}
                >
                  COBRAR ${total.toFixed(2)}
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={() => setShowMobileCart(true)}
              disabled={cart.length === 0}
              className="w-full bg-blue-700 hover:bg-blue-600 h-10 font-semibold"
            >
              COBRAR ${total.toFixed(2)}
            </Button>
          )}
        </div>

        {/* Selector de categoría y búsqueda */}
        <div className="px-4 py-3 flex items-center justify-between gap-2 bg-white">
          <button className="flex items-center gap-2 text-sm font-medium">
            <span>Todos los artículos</span>
            <ChevronDown size={16} />
          </button>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowScanner(true)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Scan size={20} />
            </Button>
            <Button
              onClick={() => setShowMobileSearch(true)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Search size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-col md:flex-row h-full gap-0 md:gap-6">
        {/* Columna de productos */}
        <div className="flex-1 flex flex-col md:order-1">
          {/* Header Desktop */}
          <div className="hidden md:block mb-4 lg:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                  Punto de Venta
                </h1>
                <p className="text-sm md:text-base text-slate-600">Selecciona productos para la venta</p>
              </div>
              {cajaActiva && (
                <div className="px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
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

          {/* Búsqueda Desktop */}
          <div className="hidden md:flex flex-col sm:flex-row gap-3 lg:gap-4 mb-4 lg:mb-6">
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

      {/* Botón flotante para añadir cliente (solo móvil) */}
      {cart.length > 0 && !clienteSeleccionado && (
        <button
          onClick={() => setShowClienteDialog(true)}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={24} />
        </button>
      )}

      {/* Carrito Desktop (siempre visible) */}
      <Card className="hidden md:flex w-full lg:w-96 flex-col shadow-xl lg:sticky lg:top-0">
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

          {/* Botones de tickets abiertos */}
          {ticketsAbiertosFuncionActiva && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                onClick={handleClickGuardar}
                disabled={cart.length === 0}
                variant="outline"
                className="h-10 text-sm font-semibold"
              >
                {ticketActualId ? 'ACTUALIZAR' : 'GUARDAR'}
              </Button>
              <Button
                onClick={() => {
                  fetchTicketsAbiertos();
                  setShowTicketsAbiertosDialog(true);
                }}
                variant="outline"
                className="h-10 text-sm font-semibold"
              >
                TICKETS ABIERTOS
              </Button>
            </div>
          )}

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
      </div>

      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />

      {/* Dialog Apertura de Caja */}
      <Dialog open={showAperturaCaja} onOpenChange={setShowAperturaCaja}>
        <DialogContent data-testid="apertura-caja-dialog" className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{esMesero ? 'Asignar TPV para Tomar Pedidos' : 'Abrir Caja para Vender'}</DialogTitle>
          </DialogHeader>

          <div className="mb-4">
            <p className="text-slate-600">
              {esMesero 
                ? 'Selecciona un TPV para comenzar a tomar pedidos. Como mesero, no necesitas manejar dinero.'
                : requiereCierres 
                  ? 'Antes de realizar ventas, debes abrir tu caja con una base inicial.'
                  : 'Confirma para abrir la caja y comenzar a vender.'
              }
            </p>
          </div>

          <form onSubmit={handleAbrirCaja} className="space-y-4">
            {/* Selección de TPV */}
            {tpvsDisponibles.length > 0 && (
              <div>
                <Label htmlFor="tpv_seleccion">Selecciona un TPV (Punto de Venta) {esMesero && '*'}</Label>
                <select
                  id="tpv_seleccion"
                  value={tpvSeleccionado || ''}
                  onChange={(e) => setTpvSeleccionado(e.target.value || null)}
                  className="w-full mt-2 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={esMesero}
                >
                  <option value="">-- {esMesero ? 'Selecciona un TPV' : 'Sin TPV asignado'} --</option>
                  {tpvsDisponibles.map((tpv) => (
                    <option key={tpv.id} value={tpv.id}>
                      {tpv.nombre} ({tpv.tienda_nombre}) - Punto: {tpv.punto_emision}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  {esMesero 
                    ? 'Debes seleccionar un TPV para poder tomar pedidos'
                    : 'Las facturas usarán la numeración del TPV seleccionado'
                  }
                </p>
              </div>
            )}

            {tpvsDisponibles.length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  No hay TPVs disponibles. {esMesero ? 'Contacta al administrador.' : 'Puedes continuar sin TPV o contacta al administrador.'}
                </p>
              </div>
            )}

            {/* Solo mostrar monto inicial para cajeros/admin cuando cierres está activo */}
            {!esMesero && requiereCierres && (
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
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                data-testid="confirmar-apertura-pos-button"
                className="flex-1"
                disabled={esMesero && tpvsDisponibles.length > 0 && !tpvSeleccionado}
              >
                {esMesero 
                  ? 'Comenzar a Tomar Pedidos'
                  : requiereCierres 
                    ? 'Abrir Caja y Comenzar' 
                    : 'Comenzar a Vender'
                }
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

      {/* Dialog Guardar Ticket */}
      <Dialog open={showGuardarTicketDialog} onOpenChange={setShowGuardarTicketDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Buscar mesa */}
            <div>
              <Input
                placeholder="Buscar..."
                className="w-full"
              />
            </div>

            {/* Lista de mesas */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {mesasPredefinidas
                .filter((mesa) => !ticketsAbiertos.some((ticket) => ticket.nombre === mesa.nombre))
                .map((mesa) => (
                  <button
                    key={mesa.id}
                    onClick={() => handleGuardarTicket(mesa.nombre)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
                  >
                    {mesa.nombre}
                  </button>
                ))}

              {/* Mensaje si todas las mesas están ocupadas */}
              {mesasPredefinidas.length > 0 && 
               mesasPredefinidas.every((mesa) => ticketsAbiertos.some((ticket) => ticket.nombre === mesa.nombre)) && (
                <div className="text-center py-4 text-slate-500 text-sm">
                  Todas las mesas están ocupadas
                </div>
              )}

              {/* Ticket Personalizado */}
              <button
                onClick={() => setModoGuardar('personalizado')}
                className="w-full text-left px-4 py-3 bg-blue-50 border-2 border-blue-500 text-blue-700 font-semibold rounded-md hover:bg-blue-100 transition-colors"
              >
                TICKET PERSONALIZADO
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ticket Personalizado */}
      <Dialog open={modoGuardar === 'personalizado'} onOpenChange={() => setModoGuardar('mesa')}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar ticket</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nombreTicketPersonalizado.trim()) {
                handleGuardarTicket(nombreTicketPersonalizado);
                setModoGuardar('mesa');
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="nombre-ticket">Nombre</Label>
              <Input
                id="nombre-ticket"
                value={nombreTicketPersonalizado}
                onChange={(e) => setNombreTicketPersonalizado(e.target.value)}
                placeholder={`Ticket - ${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`}
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="comentario-ticket">Comentario</Label>
              <Input
                id="comentario-ticket"
                placeholder="Opcional"
                disabled
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModoGuardar('mesa');
                  setNombreTicketPersonalizado('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'GUARDAR'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Tickets Abiertos */}
      <Dialog open={showTicketsAbiertosDialog} onOpenChange={setShowTicketsAbiertosDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Tickets abiertos</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            {ticketsAbiertos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No hay tickets abiertos
              </div>
            ) : (
              ticketsAbiertos.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{ticket.nombre}</h3>
                      <p className="text-sm text-slate-600">
                        {new Date(ticket.fecha_creacion).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${ticket.subtotal.toFixed(2)}</p>
                      <p className="text-sm text-slate-600">{ticket.items.length} items</p>
                    </div>
                  </div>

                  {/* Items del ticket */}
                  <div className="space-y-1 mb-3 text-sm">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-600">
                        <span>{item.cantidad}x {item.nombre}</span>
                        <span>${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCargarTicket(ticket)}
                      className="flex-1"
                      size="sm"
                    >
                      Cargar
                    </Button>
                    <Button
                      onClick={() => handleEliminarTicket(ticket.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet del Carrito para Móvil */}
      <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
        <DialogContent className="md:hidden sm:max-w-full h-[90vh] p-0 flex flex-col">
          {/* Header del sheet */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Carrito ({cart.length} items)</h2>
            <button onClick={() => setShowMobileCart(false)} className="text-white">
              <X size={24} />
            </button>
          </div>

          {/* Contenido del carrito */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Cliente */}
            <div className="mb-4">
              {clienteSeleccionado ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {clienteSeleccionado.nombre}
                    </p>
                    <p className="text-xs text-blue-700">
                      Cédula: {clienteSeleccionado.cedula_ruc}
                    </p>
                  </div>
                  <button
                    onClick={() => setClienteSeleccionado(null)}
                    className="text-blue-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setShowMobileCart(false);
                    setShowClienteDialog(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                >
                  <Plus size={16} />
                  Agregar Cliente
                </Button>
              )}
            </div>

            {/* Items del carrito */}
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">El carrito está vacío</p>
                <p className="text-sm text-slate-400 mt-2">
                  Agrega productos para comenzar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.producto_id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.nombre}</p>
                      <p className="text-sm text-slate-600">
                        ${item.precio.toFixed(2)} × {item.cantidad}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.producto_id, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-200 rounded hover:bg-slate-300"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-bold">{item.cantidad}</span>
                      <button
                        onClick={() => updateQuantity(item.producto_id, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-200 rounded hover:bg-slate-300"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.producto_id)}
                        className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comentarios */}
            {cart.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm mb-2 block">Comentarios (opcional)</Label>
                <Textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}

            {/* Selectores de método de pago y tipo de pedido */}
            {cart.length > 0 && (
              <div className="mt-4 space-y-3">
                {metodosPago.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Método de Pago
                    </Label>
                    <select
                      value={metodoPagoSeleccionado || ''}
                      onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    >
                      {metodosPago.map((metodo) => (
                        <option key={metodo.id} value={metodo.id}>
                          {metodo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {tiposPedido.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Tipo de Pedido
                    </Label>
                    <select
                      value={tipoPedidoSeleccionado || ''}
                      onChange={(e) => setTipoPedidoSeleccionado(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    >
                      {tiposPedido.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer con total y botón */}
          {cart.length > 0 && (
            <div className="border-t p-4 space-y-3 bg-white">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold font-mono text-blue-600">
                  ${total.toFixed(2)}
                </span>
              </div>

              {ticketsAbiertosFuncionActiva && (
                <Button
                  onClick={() => {
                    setShowMobileCart(false);
                    setShowTicketsAbiertosDialog(true);
                  }}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  TICKETS ABIERTOS
                </Button>
              )}

              <Button
                onClick={() => {
                  setShowMobileCart(false);
                  handleCheckout();
                }}
                disabled={loading}
                className="w-full h-12 text-lg font-semibold gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Printer size={20} />
                {loading ? 'Procesando...' : 'Finalizar Venta'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Búsqueda Móvil */}
      <Dialog open={showMobileSearch} onOpenChange={setShowMobileSearch}>
        <DialogContent className="md:hidden sm:max-w-full h-[80vh] p-0 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button
                onClick={() => setShowMobileSearch(false)}
                variant="ghost"
                size="sm"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredProductos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No se encontraron productos</p>
                <p className="text-sm mt-2">Intenta con otro término de búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProductos.map((producto) => (
                  <button
                    key={producto.id}
                    onClick={() => {
                      addToCart(producto);
                      setShowMobileSearch(false);
                      setSearchQuery('');
                    }}
                    className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow text-left"
                  >
                    <p className="font-medium text-sm mb-1 line-clamp-2">{producto.nombre}</p>
                    <p className="text-lg font-bold text-blue-600">
                      ${producto.precio.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Stock: {producto.stock}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
