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
import { Plus, Minus, Trash2, Scan, Printer, X, Search, Menu, Bell, User, MoreVertical, ChevronDown, UserPlus, RefreshCw, Split, Combine, Eraser } from 'lucide-react';
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
  const [showTicketMenu, setShowTicketMenu] = useState(false);
  const [showDividirDialog, setShowDividirDialog] = useState(false);
  const [showCombinarDialog, setShowCombinarDialog] = useState(false);
  const [ticketsParaCombinar, setTicketsParaCombinar] = useState([]);
  const [productosParaDividir, setProductosParaDividir] = useState([]);
  const [nombreNuevoTicket, setNombreNuevoTicket] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('all');
  
  // Obtener usuario actual
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const esMesero = currentUser?.rol === 'mesero';
  
  // Obtener categorías únicas
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
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

  // Funciones del menú de ticket
  const handleDespejarTicket = () => {
    if (cart.length === 0) {
      toast.info('El ticket ya está vacío');
      return;
    }
    setCart([]);
    setClienteSeleccionado(null);
    setComentarios('');
    setTicketActualId(null);
    setShowTicketMenu(false);
    toast.success('Ticket despejado');
  };

  const handleDividirTicket = () => {
    if (cart.length < 2) {
      toast.error('Necesitas al menos 2 productos para dividir el ticket');
      return;
    }
    setProductosParaDividir([]);
    setNombreNuevoTicket('');
    setShowDividirDialog(true);
    setShowTicketMenu(false);
  };

  const toggleProductoDividir = (productoId) => {
    setProductosParaDividir(prev => 
      prev.includes(productoId)
        ? prev.filter(id => id !== productoId)
        : [...prev, productoId]
    );
  };

  const ejecutarDividirTicket = async () => {
    if (productosParaDividir.length === 0) {
      toast.error('Selecciona al menos un producto para dividir');
      return;
    }

    if (productosParaDividir.length === cart.length) {
      toast.error('No puedes mover todos los productos. Deja al menos uno en el ticket actual.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Separar productos
      const productosNuevoTicket = cart.filter(item => productosParaDividir.includes(item.producto_id));
      const productosTicketActual = cart.filter(item => !productosParaDividir.includes(item.producto_id));
      
      // Crear nuevo ticket con los productos seleccionados
      const nuevoTicket = {
        nombre: nombreNuevoTicket || `Dividido ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        items: productosNuevoTicket,
        subtotal: productosNuevoTicket.reduce((sum, item) => sum + item.subtotal, 0),
        cliente_id: null,
        cliente_nombre: null,
        comentarios: null
      };

      await axios.post(`${API_URL}/api/tickets-abiertos-pos`, nuevoTicket, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Actualizar carrito actual
      setCart(productosTicketActual);
      
      await fetchTicketsAbiertos();
      setShowDividirDialog(false);
      setProductosParaDividir([]);
      setNombreNuevoTicket('');
      toast.success(`Ticket dividido. ${productosNuevoTicket.length} producto(s) movidos a "${nuevoTicket.nombre}".`);
    } catch (error) {
      console.error('Error dividir:', error.response?.data || error);
      toast.error(error.response?.data?.detail || 'Error al dividir el ticket');
    }
  };

  const handleCombinarTicket = async () => {
    await fetchTicketsAbiertos();
    
    // Esperar un poco para que se actualice el estado
    setTimeout(() => {
      if (ticketsAbiertos.length === 0) {
        toast.error('No hay tickets abiertos para combinar');
        return;
      }
      setTicketsParaCombinar([]);
      setShowCombinarDialog(true);
      setShowTicketMenu(false);
    }, 100);
  };

  const ejecutarCombinarTickets = async () => {
    if (ticketsParaCombinar.length === 0) {
      toast.error('Selecciona al menos un ticket para combinar');
      return;
    }

    try {
      // Combinar todos los items de los tickets seleccionados
      let itemsCombinados = [...cart];
      
      for (const ticketId of ticketsParaCombinar) {
        const ticket = ticketsAbiertos.find(t => t.id === ticketId);
        if (ticket && ticket.items) {
          ticket.items.forEach(item => {
            const existente = itemsCombinados.find(i => i.producto_id === item.producto_id);
            if (existente) {
              existente.cantidad += item.cantidad;
              existente.subtotal = existente.cantidad * existente.precio;
            } else {
              itemsCombinados.push({ ...item });
            }
          });
        }
      }

      setCart(itemsCombinados);

      // Eliminar los tickets combinados del servidor
      const token = localStorage.getItem('token');
      for (const ticketId of ticketsParaCombinar) {
        await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      await fetchTicketsAbiertos();
      setShowCombinarDialog(false);
      setTicketsParaCombinar([]);
      setTicketActualId(null);
      toast.success(`${ticketsParaCombinar.length} ticket(s) combinados en el ticket actual`);
    } catch (error) {
      toast.error('Error al combinar tickets');
    }
  };

  const handleSincronizar = async () => {
    setShowTicketMenu(false);
    try {
      await Promise.all([
        fetchProductos(),
        fetchTicketsAbiertos(),
        verificarCaja()
      ]);
      toast.success('Datos sincronizados');
    } catch (error) {
      toast.error('Error al sincronizar');
    }
  };

  const filteredProductos = productos.filter(
    (p) => {
      const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategoria = categoriaSeleccionada === 'all' || p.categoria === categoriaSeleccionada;
      return matchesSearch && matchesCategoria;
    }
  );

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // Componente del menú de ticket
  const TicketMenuDropdown = () => (
    <div 
      className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-2xl border z-[9999] py-2 w-52"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDespejarTicket();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
      >
        <Eraser size={18} className="text-slate-500" />
        <span>Despejar el ticket</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDividirTicket();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
      >
        <Split size={18} className="text-slate-500" />
        <span>Dividir ticket</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleCombinarTicket();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
      >
        <Combine size={18} className="text-slate-500" />
        <span>Combinar ticket</span>
      </button>
      <div className="border-t my-1"></div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSincronizar();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
      >
        <RefreshCw size={18} className="text-slate-500" />
        <span>Sincronizar</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100" data-testid="pos-page">
      
      {/* ============ HEADER VERDE (ESTILO LOYVERSE) ============ */}
      <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-green-700 rounded-lg">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {categoriaSeleccionada === 'all' ? 'Todos los artículos' : categoriaSeleccionada}
            </span>
            <ChevronDown size={16} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="p-2 hover:bg-green-700 rounded-lg"
          >
            <Search size={20} />
          </button>
          <button 
            onClick={() => setShowClienteDialog(true)}
            className="p-2 hover:bg-green-700 rounded-lg relative"
          >
            <UserPlus size={20} />
            {clienteSeleccionado && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
            )}
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowTicketMenu(!showTicketMenu)}
              className="p-2 hover:bg-green-700 rounded-lg"
            >
              <MoreVertical size={20} />
            </button>
            {showTicketMenu && <TicketMenuDropdown />}
          </div>
        </div>
      </div>

      {/* Barra de búsqueda (móvil - expandible) */}
      {showMobileSearch && (
        <div className="bg-green-600 px-4 pb-2 md:hidden">
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-green-700 border-green-500 text-white placeholder:text-green-200"
            autoFocus
          />
        </div>
      )}

      {/* ============ CONTENIDO PRINCIPAL ============ */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* PANEL DE PRODUCTOS */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Barra de búsqueda (desktop) */}
          <div className="hidden md:flex items-center gap-4 p-4 bg-white border-b">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar productos por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowScanner(true)}
              variant="outline"
              size="icon"
            >
              <Scan size={18} />
            </Button>
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProductos.map((producto) => (
                <div
                  key={producto.id}
                  data-testid={`pos-product-${producto.id}`}
                  onClick={() => addToCart(producto)}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-green-400 transition-all group"
                >
                  {/* Imagen del producto */}
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden">
                    {producto.imagen ? (
                      <img 
                        src={producto.imagen} 
                        alt={producto.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-slate-300">
                        {producto.nombre.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {producto.stock <= 5 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1 rounded">
                        Bajo stock
                      </span>
                    )}
                  </div>
                  {/* Info del producto */}
                  <div className="p-2 bg-slate-800 text-white">
                    <p className="text-xs font-medium truncate">{producto.nombre}</p>
                    <p className="text-sm font-bold text-green-400">${producto.precio.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredProductos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Search size={48} className="mb-2" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>

          {/* Barra de categorías (abajo) */}
          <div className="bg-white border-t px-2 py-2 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setCategoriaSeleccionada('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                categoriaSeleccionada === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  categoriaSeleccionada === cat
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ============ PANEL DEL TICKET (DERECHA) ============ */}
        <div className="hidden md:flex w-80 lg:w-96 flex-col bg-white border-l relative">
          {/* Header del ticket */}
          <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between relative z-50">
            <span className="font-semibold">Ticket</span>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTicketMenu(!showTicketMenu);
                }}
                className="p-1 hover:bg-green-700 rounded"
                data-testid="ticket-menu-btn"
              >
                <MoreVertical size={18} />
              </button>
              {showTicketMenu && <TicketMenuDropdown />}
            </div>
          </div>

          {/* Cliente seleccionado */}
          {clienteSeleccionado && (
            <div className="p-3 bg-blue-50 border-b flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">{clienteSeleccionado.nombre}</p>
                <p className="text-xs text-blue-700">{clienteSeleccionado.cedula_ruc}</p>
              </div>
              <button onClick={() => setClienteSeleccionado(null)} className="text-blue-600">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Lista de items del ticket */}
          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                <p className="text-sm">Selecciona productos</p>
                <p className="text-xs">para agregar al ticket</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.producto_id} className="p-3 hover:bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.nombre}</p>
                        <p className="text-xs text-slate-500">${item.precio.toFixed(2)} c/u</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.producto_id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.producto_id, -1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-l-lg"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{item.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(item.producto_id, 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-r-lg"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-bold text-green-600">${item.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones del ticket */}
          <div className="border-t p-4 space-y-3">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-700">Total</span>
              <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
            </div>

            {/* Botones GUARDAR/TICKETS y COBRAR */}
            <div className="grid grid-cols-2 gap-2">
              {cart.length > 0 ? (
                <Button
                  onClick={() => setShowGuardarTicketDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  GUARDAR
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    fetchTicketsAbiertos();
                    setShowTicketsAbiertosDialog(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  TICKETS
                </Button>
              )}
              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                COBRAR
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ BARRA INFERIOR MÓVIL ============ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 z-40">
        <Button
          onClick={() => setShowMobileCart(true)}
          variant="outline"
          className="flex-1 relative"
        >
          <span>Ticket</span>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {cart.reduce((sum, item) => sum + item.cantidad, 0)}
            </span>
          )}
        </Button>
        <Button
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 font-semibold"
        >
          COBRAR ${total.toFixed(2)}
        </Button>
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

      {/* Dialog Dividir Ticket */}
      <Dialog open={showDividirDialog} onOpenChange={setShowDividirDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dividir Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecciona los productos que deseas mover a un nuevo ticket:
            </p>
            
            {/* Nombre del nuevo ticket */}
            <div>
              <Label className="text-sm">Nombre del nuevo ticket (opcional)</Label>
              <Input
                placeholder="Ej: Mesa 5, Pedido 2..."
                value={nombreNuevoTicket}
                onChange={(e) => setNombreNuevoTicket(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {cart.map((item) => (
                <div 
                  key={item.producto_id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    productosParaDividir.includes(item.producto_id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => toggleProductoDividir(item.producto_id)}
                >
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-blue-600" 
                    checked={productosParaDividir.includes(item.producto_id)}
                    onChange={() => {}}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.nombre}</p>
                    <p className="text-xs text-slate-500">Cantidad: {item.cantidad}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {productosParaDividir.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>{productosParaDividir.length}</strong> producto(s) seleccionado(s) - 
                  Total: <strong>${cart.filter(i => productosParaDividir.includes(i.producto_id)).reduce((s, i) => s + i.subtotal, 0).toFixed(2)}</strong>
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDividirDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={ejecutarDividirTicket}
                disabled={productosParaDividir.length === 0 || productosParaDividir.length === cart.length}
              >
                Dividir Ticket
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Combinar Tickets */}
      <Dialog open={showCombinarDialog} onOpenChange={setShowCombinarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Combinar Tickets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecciona los tickets que deseas combinar con el ticket actual:
            </p>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {ticketsAbiertos.map((ticket) => (
                <div 
                  key={ticket.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    ticketsParaCombinar.includes(ticket.id) 
                      ? 'bg-green-50 border-green-300' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setTicketsParaCombinar(prev => 
                      prev.includes(ticket.id)
                        ? prev.filter(id => id !== ticket.id)
                        : [...prev, ticket.id]
                    );
                  }}
                >
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-green-600" 
                    checked={ticketsParaCombinar.includes(ticket.id)}
                    onChange={() => {}}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{ticket.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {ticket.items?.length || 0} producto(s)
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-green-600">${ticket.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
              ))}
              {ticketsAbiertos.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-2">No hay tickets abiertos</p>
                  <p className="text-xs text-slate-400">Guarda un ticket primero para poder combinarlo</p>
                </div>
              )}
            </div>

            {ticketsParaCombinar.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>{ticketsParaCombinar.length}</strong> ticket(s) seleccionado(s)
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCombinarDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={ejecutarCombinarTickets}
                disabled={ticketsParaCombinar.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Combinar ({ticketsParaCombinar.length})
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overlay para cerrar menú */}
      {showTicketMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowTicketMenu(false)}
        />
      )}
    </div>
  );
}
