import React, { useState, useEffect, useMemo } from 'react';
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
import { 
  Plus, Minus, Trash2, Scan, Printer, X, Search, Menu, Bell, User, 
  MoreVertical, ChevronDown, UserPlus, RefreshCw, Split, Combine, Eraser,
  LayoutDashboard, ShoppingCart, FileText, Package, Users, ChevronLeft, Save, Wallet, LogOut, Briefcase
} from 'lucide-react';
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
  const [tipoPedidoFuncionActiva, setTipoPedidoFuncionActiva] = useState(false);
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
  const [showMobileTicketMenu, setShowMobileTicketMenu] = useState(false);
  const [showDividirDialog, setShowDividirDialog] = useState(false);
  const [showCombinarDialog, setShowCombinarDialog] = useState(false);
  const [ticketsParaCombinar, setTicketsParaCombinar] = useState([]);
  const [productosParaDividir, setProductosParaDividir] = useState([]);
  const [cantidadesParaDividir, setCantidadesParaDividir] = useState({});
  const [nombreNuevoTicket, setNombreNuevoTicket] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('all');
  const [showCobroDialog, setShowCobroDialog] = useState(false);
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNavSidebar, setShowNavSidebar] = useState(false);
  
  // Estados para modificadores
  const [modificadores, setModificadores] = useState([]);
  const [showModificadorDialog, setShowModificadorDialog] = useState(false);
  const [productoConModificadores, setProductoConModificadores] = useState(null);
  const [modificadoresSeleccionados, setModificadoresSeleccionados] = useState({});
  
  // Estado para impuestos activos
  const [impuestosActivos, setImpuestosActivos] = useState([]);
  
  // Estados para descuentos
  const [descuentos, setDescuentos] = useState([]);
  const [showDescuentoDialog, setShowDescuentoDialog] = useState(false);
  const [nuevoDescuento, setNuevoDescuento] = useState({ tipo: 'porcentaje', valor: '', motivo: '' });
  
  // Estado para animación fly-to-cart
  const [flyingProduct, setFlyingProduct] = useState(null);
  const ticketButtonRef = React.useRef(null);
  
  // Obtener usuario actual
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const esMesero = currentUser?.rol === 'mesero';
  const esCajero = currentUser?.rol === 'cajero';
  const esEmpleado = esMesero || esCajero; // Empleados con acceso limitado
  const esAdministrador = currentUser?.rol === 'administrador';
  const esPropietario = currentUser?.rol === 'propietario';
  
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
    fetchModificadores();
    fetchImpuestos();
  }, []);

  const fetchImpuestos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/impuestos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Solo cargar impuestos activos
      const activos = response.data.filter(imp => imp.activo);
      setImpuestosActivos(activos);
    } catch (error) {
      console.error('Error al cargar impuestos:', error);
    }
  };

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
      setTipoPedidoFuncionActiva(response.data.tipo_pedido);
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

  const handleEliminarTicket = async (ticketId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tickets-abiertos-pos/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Ticket eliminado');
      fetchTicketsAbiertos();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar ticket');
    }
  };

  const fetchModificadores = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/modificadores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModificadores(response.data);
    } catch (error) {
      console.log('Error al cargar modificadores');
    }
  };

  // Función para verificar si un producto tiene modificadores activos
  const getModificadoresProducto = (producto) => {
    if (!producto.modificadores_activos || producto.modificadores_activos.length === 0) {
      return [];
    }
    return modificadores.filter(m => producto.modificadores_activos.includes(m.id));
  };

  // Función para manejar click en producto
  const handleProductoClick = (producto, event) => {
    const startElement = event?.currentTarget;
    const modsProducto = getModificadoresProducto(producto);
    
    if (modsProducto.length > 0) {
      // Si tiene modificadores, mostrar diálogo
      setProductoConModificadores(producto);
      setModificadoresSeleccionados({});
      setShowModificadorDialog(true);
    } else {
      // Si no tiene modificadores, añadir directamente con animación
      addToCart(producto, startElement);
    }
  };

  // Función para añadir producto con modificadores al carrito
  const addToCartConModificadores = () => {
    if (!productoConModificadores) return;
    
    const modsProducto = getModificadoresProducto(productoConModificadores);
    
    // Verificar que los modificadores obligatorios estén seleccionados
    for (const mod of modsProducto) {
      if (mod.obligatorio && !modificadoresSeleccionados[mod.id]) {
        toast.error(`Debes seleccionar una opción de "${mod.nombre}"`);
        return;
      }
    }
    
    // Calcular precio adicional de modificadores
    let precioModificadores = 0;
    const modsSeleccionados = [];
    
    Object.entries(modificadoresSeleccionados).forEach(([modId, opcionId]) => {
      const mod = modificadores.find(m => m.id === modId);
      if (mod && opcionId) {
        const opcion = mod.opciones.find(o => o.id === opcionId);
        if (opcion) {
          precioModificadores += opcion.precio || 0;
          modsSeleccionados.push({
            modificador_id: mod.id,
            modificador_nombre: mod.nombre,
            opcion_id: opcion.id,
            opcion_nombre: opcion.nombre,
            precio: opcion.precio || 0
          });
        }
      }
    });
    
    const precioFinal = productoConModificadores.precio + precioModificadores;
    
    // Crear un ID único para este item (producto + combinación de modificadores)
    const itemId = `${productoConModificadores.id}_${modsSeleccionados.map(m => m.opcion_id).sort().join('_') || 'base'}`;
    
    const existing = cart.find((item) => item.item_id === itemId);
    
    if (existing) {
      if (!ventaConStock || existing.cantidad < productoConModificadores.stock) {
        setCart(
          cart.map((item) =>
            item.item_id === itemId
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
      if (!ventaConStock || productoConModificadores.stock > 0) {
        setCart([
          ...cart,
          {
            item_id: itemId,
            producto_id: productoConModificadores.id,
            nombre: productoConModificadores.nombre,
            precio: precioFinal,
            precio_base: productoConModificadores.precio,
            cantidad: 1,
            subtotal: precioFinal,
            max_stock: productoConModificadores.stock,
            modificadores: modsSeleccionados,
          },
        ]);
      } else {
        toast.error('Producto sin stock');
      }
    }
    
    setShowModificadorDialog(false);
    setProductoConModificadores(null);
    setModificadoresSeleccionados({});
  };

  const addToCart = (producto, startElement = null) => {
    // Activar animación fly-to-cart en móvil
    if (startElement && window.innerWidth < 768) {
      triggerFlyAnimation(producto, startElement);
    }
    
    const itemId = `${producto.id}_base`;
    const existing = cart.find((item) => item.item_id === itemId || (item.producto_id === producto.id && !item.modificadores?.length));
    if (existing) {
      // Si venta con stock está desactivado O hay stock suficiente
      if (!ventaConStock || existing.cantidad < producto.stock) {
        setCart(
          cart.map((item) =>
            (item.item_id === itemId || (item.producto_id === producto.id && !item.modificadores?.length))
              ? { 
                  ...item, 
                  cantidad: item.cantidad + 1,
                  subtotal: (item.cantidad + 1) * item.precio
                }
              : item
          )
        );
        // Vibración háptica en móvil
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        toast.error('No hay suficiente stock');
      }
    } else {
      // Si venta con stock está desactivado O hay stock disponible
      if (!ventaConStock || producto.stock > 0) {
        setCart([
          ...cart,
          {
            item_id: itemId,
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1,
            subtotal: producto.precio,
            max_stock: producto.stock,
            modificadores: [],
          },
        ]);
        // Vibración háptica en móvil
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        toast.error('Producto sin stock');
      }
    }
  };

  // Función para animar el producto volando al carrito
  const triggerFlyAnimation = (producto, startElement) => {
    const startRect = startElement.getBoundingClientRect();
    const ticketButton = ticketButtonRef.current;
    
    if (!ticketButton) return;
    
    const endRect = ticketButton.getBoundingClientRect();
    
    setFlyingProduct({
      producto,
      startX: startRect.left + startRect.width / 2,
      startY: startRect.top + startRect.height / 2,
      endX: endRect.left + endRect.width / 2,
      endY: endRect.top + endRect.height / 2,
    });
    
    // Remover la animación después de completarse
    setTimeout(() => {
      setFlyingProduct(null);
    }, 450);
  };

  const updateQuantity = (item_id, delta) => {
    const item = cart.find((i) => i.item_id === item_id);
    if (!item) return;
    const newQty = item.cantidad + delta;

    if (newQty <= 0) {
      removeFromCart(item_id);
    } else {
      // Si venta con stock está desactivado O no excede el stock
      if (!ventaConStock || newQty <= item.max_stock) {
        setCart(
          cart.map((cartItem) =>
            cartItem.item_id === item_id
              ? {
                  ...cartItem,
                  cantidad: newQty,
                  subtotal: newQty * cartItem.precio,
                }
              : cartItem
          )
        );
      } else {
        toast.error('No hay suficiente stock');
      }
    }
  };

  const removeFromCart = (item_id) => {
    setCart(cart.filter((item) => item.item_id !== item_id));
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

    // Abrir diálogo de cobro
    setEfectivoRecibido(total.toFixed(2));
    setShowCobroDialog(true);
  };

  const procesarCobro = async () => {
    if (!metodoPagoSeleccionado) {
      toast.error('Selecciona un método de pago');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const totalVenta = cart.reduce((sum, item) => sum + item.subtotal, 0);

      const response = await axios.post(
        `${API_URL}/api/facturas`,
        {
          items: cart,
          total: totalVenta,
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
      setShowCobroDialog(false);
      setEfectivoRecibido('');
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
      
      // Verificar si la impresión automática está habilitada
      if (!config.imprimir_ticket) {
        return; // No imprimir si está deshabilitado
      }
      
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
        .logo { text-align: center; margin-bottom: 10px; }
        .logo img { max-width: 150px; max-height: 80px; }
      `);
      printWindow.document.write('</style></head><body>');
      
      // Mostrar logo si existe
      if (config.logo_url) {
        printWindow.document.write('<div class="logo">');
        printWindow.document.write(`<img src="${API_URL}${config.logo_url}" alt="Logo" />`);
        printWindow.document.write('</div>');
      }
      
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
    // Calcular total de unidades en el carrito
    const totalUnidades = cart.reduce((sum, item) => sum + item.cantidad, 0);
    
    if (totalUnidades < 2) {
      toast.error('Necesitas al menos 2 unidades para dividir el ticket');
      return;
    }
    setProductosParaDividir([]);
    setCantidadesParaDividir({});
    setNombreNuevoTicket('');
    setShowDividirDialog(true);
    setShowTicketMenu(false);
  };

  const toggleProductoDividir = (itemId, maxCantidad) => {
    setProductosParaDividir(prev => {
      if (prev.includes(itemId)) {
        // Deseleccionar
        setCantidadesParaDividir(cant => {
          const newCant = {...cant};
          delete newCant[itemId];
          return newCant;
        });
        return prev.filter(id => id !== itemId);
      } else {
        // Seleccionar con cantidad por defecto = toda la cantidad
        setCantidadesParaDividir(cant => ({...cant, [itemId]: maxCantidad}));
        return [...prev, itemId];
      }
    });
  };

  const actualizarCantidadDividir = (itemId, cantidad, maxCantidad) => {
    const cantidadValida = Math.max(1, Math.min(cantidad, maxCantidad));
    setCantidadesParaDividir(prev => ({...prev, [itemId]: cantidadValida}));
  };

  const ejecutarDividirTicket = async () => {
    if (productosParaDividir.length === 0) {
      toast.error('Selecciona al menos un producto para dividir');
      return;
    }

    // Calcular cuántas unidades se van a mover
    const unidadesAMover = productosParaDividir.reduce((sum, itemId) => {
      return sum + (cantidadesParaDividir[itemId] || 0);
    }, 0);
    
    // Calcular total de unidades en el carrito
    const totalUnidades = cart.reduce((sum, item) => sum + item.cantidad, 0);
    
    if (unidadesAMover >= totalUnidades) {
      toast.error('No puedes mover todas las unidades. Deja al menos una en el ticket actual.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Construir los items para el nuevo ticket y actualizar el carrito actual
      const productosNuevoTicket = [];
      const productosTicketActual = [];
      
      cart.forEach(item => {
        if (productosParaDividir.includes(item.item_id)) {
          const cantidadAMover = cantidadesParaDividir[item.item_id] || item.cantidad;
          const cantidadRestante = item.cantidad - cantidadAMover;
          
          // Agregar al nuevo ticket
          const precioUnitario = item.subtotal / item.cantidad;
          productosNuevoTicket.push({
            ...item,
            item_id: `${item.producto_id}_${Date.now()}_new`,
            cantidad: cantidadAMover,
            subtotal: precioUnitario * cantidadAMover
          });
          
          // Si quedan unidades, mantener en ticket actual
          if (cantidadRestante > 0) {
            productosTicketActual.push({
              ...item,
              cantidad: cantidadRestante,
              subtotal: precioUnitario * cantidadRestante
            });
          }
        } else {
          // No seleccionado, mantener completo en ticket actual
          productosTicketActual.push(item);
        }
      });
      
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
      setCantidadesParaDividir({});
      setNombreNuevoTicket('');
      toast.success(`Ticket dividido. ${unidadesAMover} unidad(es) movidas a "${nuevoTicket.nombre}".`);
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

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.cantidad, 0);
  
  // Calcular impuestos con useMemo para mejor rendimiento
  const { totalImpuestosAgregados, desgloseImpuestos, total } = useMemo(() => {
    let totalImpAgregados = 0;
    const desglose = [];
    
    if (impuestosActivos.length > 0 && subtotal > 0) {
      impuestosActivos.forEach(imp => {
        let montoImpuesto = 0;
        
        if (imp.tipo === 'incluido') {
          // El impuesto ya está incluido en el precio
          montoImpuesto = subtotal - (subtotal / (1 + imp.tasa / 100));
        } else {
          // Impuesto no incluido, se agrega al subtotal
          montoImpuesto = subtotal * (imp.tasa / 100);
          totalImpAgregados += montoImpuesto;
        }
        
        desglose.push({
          nombre: imp.nombre,
          tasa: imp.tasa,
          tipo: imp.tipo,
          monto: montoImpuesto
        });
      });
    }
    
    return { 
      totalImpuestosAgregados: totalImpAgregados, 
      desgloseImpuestos: desglose,
      total: subtotal + totalImpAgregados
    };
  }, [impuestosActivos, subtotal]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100" data-testid="pos-page">
      
      {/* ============ ANIMACIÓN FLY-TO-CART ============ */}
      {flyingProduct && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: flyingProduct.startX,
            top: flyingProduct.startY,
            animation: 'flyToCart 400ms ease-out forwards',
            '--end-x': `${flyingProduct.endX - flyingProduct.startX}px`,
            '--end-y': `${flyingProduct.endY - flyingProduct.startY}px`,
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-2 flex items-center gap-2 transform -translate-x-1/2 -translate-y-1/2">
            {flyingProduct.producto.imagen ? (
              <img 
                src={flyingProduct.producto.imagen} 
                alt={flyingProduct.producto.nombre}
                className="w-10 h-10 rounded object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {flyingProduct.producto.nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="max-w-[100px]">
              <p className="text-xs font-semibold truncate">{flyingProduct.producto.nombre}</p>
              <p className="text-xs text-blue-600 font-bold">${flyingProduct.producto.precio.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para la animación */}
      <style>{`
        @keyframes flyToCart {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.3)) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(var(--end-x), var(--end-y)) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>

      {/* ============ HEADER AZUL - MÓVIL ============ */}
      <div className="md:hidden bg-blue-600 text-white px-2 py-2 flex items-center justify-between">
        {/* Izquierda: Menú hamburguesa (navegación) */}
        <button 
          onClick={() => setShowNavSidebar(true)}
          className="p-2 hover:bg-blue-700 rounded-lg"
        >
          <Menu size={22} />
        </button>
        
        {/* Centro: Ticket con contador */}
        <button 
          ref={ticketButtonRef}
          onClick={() => setShowMobileCart(true)}
          className="flex items-center gap-2 relative"
        >
          <span className="font-semibold text-lg">Ticket</span>
          <span 
            className={`bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full transition-transform ${
              flyingProduct ? 'scale-125' : ''
            }`}
          >
            {cartItemCount || 0}
          </span>
        </button>
        
        {/* Derecha: Cliente + Menú opciones (3 puntos) */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowClienteDialog(true)}
            className="p-2 hover:bg-blue-700 rounded-lg relative"
          >
            <UserPlus size={20} />
            {clienteSeleccionado && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
            )}
          </button>
          <button 
            onClick={() => setShowMobileTicketMenu(!showMobileTicketMenu)}
            className="p-2 hover:bg-blue-700 rounded-lg relative"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Selector de tipo de pedido - MÓVIL (debajo del header) */}
      {tipoPedidoFuncionActiva && tiposPedido.length > 0 && (
        <div className="md:hidden bg-slate-50 border-b px-4 py-2">
          <select
            value={tipoPedidoSeleccionado || ''}
            onChange={(e) => setTipoPedidoSeleccionado(e.target.value)}
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tiposPedido.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Menú de opciones del ticket (3 puntos) - MÓVIL */}
      {showMobileTicketMenu && (
        <div className="md:hidden absolute right-2 top-12 bg-white rounded-lg shadow-xl border z-[60] py-2 w-52">
          <button
            onClick={() => {
              handleDespejarTicket();
              setShowMobileTicketMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
          >
            <Eraser size={18} className="text-slate-500" />
            <span>Despejar ticket</span>
          </button>
          <button
            onClick={() => {
              handleDividirTicket();
              setShowMobileTicketMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
          >
            <Split size={18} className="text-slate-500" />
            <span>Dividir ticket</span>
          </button>
          <button
            onClick={() => {
              handleCombinarTicket();
              setShowMobileTicketMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
          >
            <Combine size={18} className="text-slate-500" />
            <span>Combinar ticket</span>
          </button>
        </div>
      )}

      {/* Overlay para cerrar menú móvil */}
      {showMobileTicketMenu && (
        <div 
          className="md:hidden fixed inset-0 z-[55]" 
          onClick={() => setShowMobileTicketMenu(false)}
        />
      )}

      {/* Sidebar de Navegación - TODAS LAS PANTALLAS */}
      {showNavSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setShowNavSidebar(false)}
        >
          <div 
            className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <span className="font-semibold">Menú</span>
              <button onClick={() => setShowNavSidebar(false)} className="p-1 hover:bg-blue-700 rounded">
                <X size={20} />
              </button>
            </div>
            <nav className="p-2">
              {/* Menú para propietarios - acceso completo */}
              {esPropietario && (
                <>
                  <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </a>
                  <a href="/pos" className="flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium">
                    <ShoppingCart size={18} />
                    <span>Punto de Venta</span>
                  </a>
                  <a href="/facturas" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <FileText size={18} />
                    <span>Facturas</span>
                  </a>
                  <a href="/reportes" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <FileText size={18} />
                    <span>Reportes</span>
                  </a>
                  <a href="/productos" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <Package size={18} />
                    <span>Productos</span>
                  </a>
                  <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <Users size={18} />
                    <span>Clientes</span>
                  </a>
                  <div className="border-t my-2"></div>
                  <a href="/caja" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <Wallet size={18} />
                    <span>Caja</span>
                  </a>
                </>
              )}
              
              {/* Menú para administradores - POS, Caja y Back Office */}
              {esAdministrador && (
                <>
                  <a href="/pos" className="flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium">
                    <ShoppingCart size={18} />
                    <span>Punto de Venta</span>
                  </a>
                  <a href="/caja" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <Wallet size={18} />
                    <span>Caja</span>
                  </a>
                  <div className="border-t my-2"></div>
                  <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-purple-600 hover:bg-purple-50 rounded-lg font-medium">
                    <Briefcase size={18} />
                    <span>Back Office</span>
                  </a>
                </>
              )}
              
              {/* Menú reducido para cajeros y meseros */}
              {esEmpleado && (
                <>
                  <a href="/pos" className="flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium">
                    <ShoppingCart size={18} />
                    <span>Punto de Venta</span>
                  </a>
                  <a href="/caja" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg">
                    <Wallet size={18} />
                    <span>Caja</span>
                  </a>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* ============ HEADER AZUL - DESKTOP ============ */}
      <div className="hidden md:flex bg-blue-600 text-white px-4 py-2 items-center justify-between">
        {/* Izquierda: Menú hamburguesa (navegación) */}
        <button 
          onClick={() => setShowNavSidebar(true)}
          className="p-2 hover:bg-blue-700 rounded-lg"
        >
          <Menu size={22} />
        </button>
        
        {/* Centro: Ticket con contador */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Ticket</span>
          {cartItemCount > 0 && (
            <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {cartItemCount}
            </span>
          )}
        </div>
        
        {/* Derecha: Cliente + Menú opciones (3 puntos) */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowClienteDialog(true)}
            className="p-2 hover:bg-blue-700 rounded-lg relative"
          >
            <UserPlus size={20} />
            {clienteSeleccionado && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
            )}
          </button>
          <button 
            onClick={() => setShowTicketMenu(!showTicketMenu)}
            className="p-2 hover:bg-blue-700 rounded-lg"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Menú de opciones del ticket (3 puntos) - DESKTOP */}
      {showTicketMenu && (
        <div className="hidden md:block absolute right-2 top-12 bg-white rounded-lg shadow-xl border z-[60] py-2 w-52">
          <button
            onClick={() => {
              handleDespejarTicket();
              setShowTicketMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
          >
            <Eraser size={18} className="text-slate-500" />
            <span>Despejar ticket</span>
          </button>
          <button
            onClick={() => {
              handleDividirTicket();
              setShowTicketMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
          >
            <Split size={18} className="text-slate-500" />
            <span>Dividir ticket</span>
          </button>
          <button
            onClick={() => {
              handleCombinarTicket();
              setShowTicketMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
          >
            <Combine size={18} className="text-slate-500" />
            <span>Combinar ticket</span>
          </button>
          <div className="border-t my-2"></div>
          <button
            onClick={() => {
              handleSincronizar();
              setShowTicketMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 flex items-center gap-3 text-slate-700"
          >
            <RefreshCw size={18} className="text-slate-500" />
            <span>Sincronizar</span>
          </button>
        </div>
      )}

      {/* Overlay para cerrar menú desktop */}
      {showTicketMenu && (
        <div 
          className="hidden md:block fixed inset-0 z-[55]" 
          onClick={() => setShowTicketMenu(false)}
        />
      )}



      {showMobileCart && (
        <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header del carrito móvil */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <button 
              onClick={() => setShowMobileCart(false)}
              className="p-1 hover:bg-blue-700 rounded"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="font-semibold text-lg">Ticket</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowClienteDialog(true)}
                className="p-2 hover:bg-blue-700 rounded relative"
              >
                <UserPlus size={20} />
              </button>
              <button 
                onClick={() => setShowMobileTicketMenu(!showMobileTicketMenu)}
                className="p-2 hover:bg-blue-700 rounded"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Lista de productos del carrito */}
          <div className="flex-1 overflow-auto bg-slate-50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                <ShoppingCart size={48} className="mb-2" />
                <p className="text-sm">El ticket está vacío</p>
                <p className="text-xs">Añade productos para comenzar</p>
              </div>
            ) : (
              <div className="divide-y bg-white">
                {cart.map((item) => (
                  <div key={item.item_id} className="p-4 flex items-center gap-3">
                    {/* Cantidad y controles */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.item_id, -1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-l-lg"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">{item.cantidad}</span>
                      <button
                        onClick={() => updateQuantity(item.item_id, 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-r-lg"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    
                    {/* Nombre y precio */}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      {item.modificadores?.length > 0 && (
                        <div>
                          {item.modificadores.map((mod, idx) => (
                            <p key={idx} className="text-xs text-blue-600">
                              + {mod.opcion_nombre}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-slate-500">${item.precio.toFixed(2)} c/u</p>
                    </div>
                    
                    {/* Subtotal */}
                    <span className="font-bold text-blue-600">${item.subtotal.toFixed(2)}</span>
                    
                    {/* Botón eliminar */}
                    <button
                      onClick={() => removeFromCart(item.item_id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total y Botones */}
          <div className="bg-white border-t p-4 space-y-3">
            {/* Subtotal e Impuestos */}
            {cart.length > 0 && (
              <div className="space-y-1 text-sm border-b pb-3 mb-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {desgloseImpuestos.length > 0 ? (
                  desgloseImpuestos.map((imp, idx) => (
                    <div key={idx} className={`flex justify-between ${imp.tipo === 'incluido' ? 'text-slate-400 text-xs' : 'text-slate-600'}`}>
                      <span>
                        {imp.nombre} ({imp.tasa}%)
                        {imp.tipo === 'incluido' && <span className="ml-1">[Incl.]</span>}
                      </span>
                      <span>
                        {imp.tipo !== 'incluido' && <span className="text-green-600">+</span>}
                        ${imp.monto.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400">Sin impuestos configurados</div>
                )}
              </div>
            )}
            
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-700">Total</span>
              <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
            </div>

            {/* Botones */}
            <div className="grid grid-cols-2 gap-2">
              {ticketsAbiertosFuncionActiva && (
                <Button
                  onClick={() => {
                    if (cart.length > 0) {
                      handleClickGuardar();
                    } else {
                      fetchTicketsAbiertos();
                      setShowTicketsAbiertosDialog(true);
                    }
                  }}
                  variant={cart.length > 0 ? "default" : "outline"}
                  className={cart.length > 0 ? "bg-blue-600 hover:bg-blue-700" : "border-blue-600 text-blue-600"}
                >
                  {cart.length > 0 ? (
                    <>
                      <Save size={18} className="mr-1" />
                      GUARDAR
                    </>
                  ) : (
                    'TICKETS ABIERTOS'
                  )}
                </Button>
              )}
              <Button
                onClick={() => {
                  setShowMobileCart(false);
                  handleCheckout();
                }}
                disabled={cart.length === 0}
                className={`bg-blue-600 hover:bg-blue-700 ${!ticketsAbiertosFuncionActiva ? 'col-span-2' : ''}`}
              >
                COBRAR ${total.toFixed(2)}
              </Button>
            </div>
          </div>
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
                  onClick={(e) => handleProductoClick(producto, e)}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-400 transition-all group"
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
                    <p className="text-sm font-bold text-blue-400">${producto.precio.toFixed(2)}</p>
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

          {/* Botón Tickets Abiertos - SOLO MÓVIL */}
          {ticketsAbiertosFuncionActiva && (
            <div className="md:hidden bg-white border-t px-4 py-2">
              <Button
                onClick={() => {
                  fetchTicketsAbiertos();
                  setShowTicketsAbiertosDialog(true);
                }}
                variant="outline"
                className="w-full border-blue-600 text-blue-600 font-semibold"
              >
                TICKETS ABIERTOS
              </Button>
            </div>
          )}

          {/* Barra de categorías (abajo) */}
          <div className="bg-white border-t px-2 py-2 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setCategoriaSeleccionada('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                categoriaSeleccionada === 'all'
                  ? 'bg-blue-600 text-white'
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
                    ? 'bg-blue-600 text-white'
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
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between relative z-50">
            <span className="font-semibold">Ticket</span>
          </div>

          {/* Selector de tipo de pedido - DESKTOP */}
          {tipoPedidoFuncionActiva && tiposPedido.length > 0 && (
            <div className="bg-slate-50 border-b px-3 py-2">
              <select
                value={tipoPedidoSeleccionado || ''}
                onChange={(e) => setTipoPedidoSeleccionado(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tiposPedido.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                  <div key={item.item_id} className="p-3 hover:bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.nombre}</p>
                        {item.modificadores?.length > 0 && (
                          <div className="mt-1">
                            {item.modificadores.map((mod, idx) => (
                              <p key={idx} className="text-xs text-blue-600">
                                + {mod.opcion_nombre} {mod.precio > 0 && `($${mod.precio.toFixed(2)})`}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">${item.precio.toFixed(2)} c/u</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.item_id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.item_id, -1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-l-lg"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{item.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(item.item_id, 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-r-lg"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-bold text-blue-600">${item.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones del ticket */}
          <div className="border-t p-4 space-y-3">
            {/* Subtotal e Impuestos */}
            {cart.length > 0 && (
              <div className="space-y-1 text-sm border-b pb-3 mb-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {desgloseImpuestos.length > 0 ? (
                  desgloseImpuestos.map((imp, idx) => (
                    <div key={idx} className={`flex justify-between ${imp.tipo === 'incluido' ? 'text-slate-400 text-xs' : 'text-slate-600'}`}>
                      <span>
                        {imp.nombre} ({imp.tasa}%)
                        {imp.tipo === 'incluido' && <span className="ml-1">[Incl.]</span>}
                      </span>
                      <span>
                        {imp.tipo !== 'incluido' && <span className="text-green-600">+</span>}
                        ${imp.monto.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400">Sin impuestos configurados</div>
                )}
              </div>
            )}
            
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-700">Total</span>
              <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
            </div>

            {/* Botones GUARDAR/TICKETS y COBRAR */}
            <div className={`grid ${ticketsAbiertosFuncionActiva ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
              {ticketsAbiertosFuncionActiva && (
                cart.length > 0 ? (
                  <Button
                    onClick={handleClickGuardar}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    GUARDAR
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      fetchTicketsAbiertos();
                      setShowTicketsAbiertosDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    TICKETS ABIERTOS
                  </Button>
                )
              )}
              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                COBRAR
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ INDICADOR DE CAJERO ============ */}
      {cajaActiva && (
        <div className="fixed bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-slate-200 z-40 flex items-center gap-3">
          <User size={16} className="text-blue-600" />
          <div className="text-sm">
            <span className="text-slate-500">Cajero: </span>
            <span className="font-semibold text-slate-800">
              {cajaActiva.tpv_nombre || currentUser?.nombre || 'Sin asignar'}
            </span>
          </div>
          <div className="border-l border-slate-300 h-5"></div>
          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de cerrar sesión?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
              }
            }}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            data-testid="logout-button"
          >
            <LogOut size={14} />
            <span>Salir</span>
          </button>
        </div>
      )}

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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  {esMesero 
                    ? 'No hay TPVs disponibles. Todos están ocupados o no existen. Contacta al administrador.'
                    : 'No hay TPVs disponibles. Se creará uno automáticamente al abrir la caja.'}
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
                      onClick={(e) => handleEliminarTicket(ticket.id, e)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                      handleProductoClick(producto);
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
              {cart.map((item) => {
                const isSelected = productosParaDividir.includes(item.item_id);
                const cantidadSeleccionada = cantidadesParaDividir[item.item_id] || item.cantidad;
                
                return (
                  <div 
                    key={item.item_id}
                    className={`p-3 border rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleProductoDividir(item.item_id, item.cantidad)}
                    >
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 accent-blue-600" 
                        checked={isSelected}
                        onChange={() => {}}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.nombre}</p>
                        {item.modificadores_seleccionados && item.modificadores_seleccionados.length > 0 && (
                          <div className="text-xs text-blue-600">
                            {item.modificadores_seleccionados.map((mod, idx) => (
                              <span key={idx}>+ {mod.opcion_nombre} {mod.opcion_precio > 0 && `($${mod.opcion_precio.toFixed(2)})`}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">${(item.subtotal / item.cantidad).toFixed(2)} c/u</p>
                      </div>
                      <span className="font-mono text-sm font-semibold">${item.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Control de cantidad cuando está seleccionado y tiene más de 1 */}
                    {isSelected && item.cantidad > 1 && (
                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <span className="text-xs text-slate-600">Cantidad a mover:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              actualizarCantidadDividir(item.item_id, cantidadSeleccionada - 1, item.cantidad);
                            }}
                            disabled={cantidadSeleccionada <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-semibold">{cantidadSeleccionada}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              actualizarCantidadDividir(item.item_id, cantidadSeleccionada + 1, item.cantidad);
                            }}
                            disabled={cantidadSeleccionada >= item.cantidad}
                          >
                            +
                          </Button>
                          <span className="text-xs text-slate-500">/ {item.cantidad}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {productosParaDividir.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>{productosParaDividir.reduce((sum, itemId) => sum + (cantidadesParaDividir[itemId] || 0), 0)}</strong> unidad(es) seleccionada(s) - 
                  Total: <strong>${cart.filter(i => productosParaDividir.includes(i.item_id)).reduce((s, i) => {
                    const cantMover = cantidadesParaDividir[i.item_id] || i.cantidad;
                    const precioUnit = i.subtotal / i.cantidad;
                    return s + (precioUnit * cantMover);
                  }, 0).toFixed(2)}</strong>
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDividirDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={ejecutarDividirTicket}
                disabled={productosParaDividir.length === 0}
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
                      ? 'bg-blue-50 border-blue-300' 
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
                    className="w-4 h-4 accent-blue-600" 
                    checked={ticketsParaCombinar.includes(ticket.id)}
                    onChange={() => {}}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{ticket.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {ticket.items?.length || 0} producto(s)
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-blue-600">${ticket.subtotal?.toFixed(2) || '0.00'}</span>
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
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                Combinar ({ticketsParaCombinar.length})
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cobro - Pantalla de Pago */}
      <Dialog open={showCobroDialog} onOpenChange={setShowCobroDialog}>
        <DialogContent className="max-w-4xl p-0 gap-0">
          <div className="flex h-[80vh] max-h-[600px]">
            {/* Panel izquierdo - Recibo */}
            <div className="w-1/3 bg-slate-100 border-r flex flex-col">
              <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                <span className="font-semibold">Recibo</span>
                <button 
                  onClick={() => setShowClienteDialog(true)}
                  className="p-1 hover:bg-blue-700 rounded"
                >
                  <UserPlus size={18} />
                </button>
              </div>
              
              {/* Items del recibo */}
              <div className="flex-1 overflow-auto p-4">
                {cart.map((item) => (
                  <div key={item.producto_id} className="flex justify-between items-center py-2 border-b border-slate-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.nombre}</p>
                      <p className="text-xs text-slate-500">x {item.cantidad}</p>
                    </div>
                    <span className="font-mono text-sm">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              {/* Total del recibo */}
              <div className="p-4 border-t bg-white">
                <div className="flex justify-between text-sm text-slate-500 mb-1">
                  <span>Impuesto (incluido)</span>
                  <span>-</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Panel derecho - Pago */}
            <div className="flex-1 flex flex-col bg-white">
              {/* Header */}
              <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                <button 
                  onClick={() => setShowCobroDialog(false)}
                  className="p-1 hover:bg-blue-700 rounded"
                >
                  <X size={18} />
                </button>
                <span className="font-semibold">Pago</span>
                <div className="w-6"></div>
              </div>
              
              {/* Contenido del pago */}
              <div className="flex-1 p-6 overflow-auto">
                {/* Total a pagar */}
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-slate-900">${total.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">Cantidad total a pagar</p>
                </div>
                
                {/* Efectivo recibido */}
                <div className="mb-6">
                  <Label className="text-sm text-slate-600 mb-2 block">Efectivo recibido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={efectivoRecibido}
                      onChange={(e) => setEfectivoRecibido(e.target.value)}
                      className="pl-8 text-xl font-mono text-right h-12"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                {/* Botones de billetes predefinidos */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    Math.ceil(total),
                    Math.ceil(total / 5) * 5,
                    Math.ceil(total / 10) * 10,
                    Math.ceil(total / 20) * 20
                  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4).map((monto) => (
                    <button
                      key={monto}
                      onClick={() => setEfectivoRecibido(monto.toFixed(2))}
                      className={`py-3 px-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        parseFloat(efectivoRecibido) === monto
                          ? 'border-orange-400 bg-white text-slate-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      ${monto.toFixed(2)}
                    </button>
                  ))}
                </div>
                
                {/* Cambio */}
                {parseFloat(efectivoRecibido) > total && (
                  <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium">Cambio a devolver</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${(parseFloat(efectivoRecibido) - total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Métodos de pago */}
                <div className="mb-6">
                  <Label className="text-sm text-slate-600 mb-3 block">Método de pago</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {metodosPago.map((metodo) => (
                      <button
                        key={metodo.id}
                        onClick={() => setMetodoPagoSeleccionado(metodo.id)}
                        className={`py-3 px-4 rounded-lg border-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                          metodoPagoSeleccionado === metodo.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {metodo.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Botón Cobrar */}
              <div className="p-4 border-t">
                <Button 
                  onClick={procesarCobro}
                  disabled={loading || !metodoPagoSeleccionado}
                  className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Procesando...' : 'COBRAR'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Modificadores */}
      <Dialog open={showModificadorDialog} onOpenChange={setShowModificadorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Seleccionar opciones</span>
            </DialogTitle>
          </DialogHeader>
          
          {productoConModificadores && (
            <div className="space-y-4">
              {/* Info del producto */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-semibold text-slate-900">{productoConModificadores.nombre}</p>
                <p className="text-lg font-bold text-blue-600">${productoConModificadores.precio.toFixed(2)}</p>
              </div>
              
              {/* Lista de modificadores */}
              {getModificadoresProducto(productoConModificadores).map((mod) => (
                <div key={mod.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900">{mod.nombre}</p>
                    {mod.obligatorio && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Obligatorio</span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {mod.opciones?.map((opcion) => (
                      <label
                        key={opcion.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          modificadoresSeleccionados[mod.id] === opcion.id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={mod.id}
                            checked={modificadoresSeleccionados[mod.id] === opcion.id}
                            onChange={() => setModificadoresSeleccionados({
                              ...modificadoresSeleccionados,
                              [mod.id]: opcion.id
                            })}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-slate-700">{opcion.nombre}</span>
                        </div>
                        {opcion.precio > 0 && (
                          <span className="text-green-600 font-medium">+${opcion.precio.toFixed(2)}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Precio total con modificadores */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${(
                      productoConModificadores.precio +
                      Object.entries(modificadoresSeleccionados).reduce((sum, [modId, opcionId]) => {
                        const mod = modificadores.find(m => m.id === modId);
                        const opcion = mod?.opciones?.find(o => o.id === opcionId);
                        return sum + (opcion?.precio || 0);
                      }, 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModificadorDialog(false);
                    setProductoConModificadores(null);
                    setModificadoresSeleccionados({});
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={addToCartConModificadores}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Añadir al ticket
                </Button>
              </div>
            </div>
          )}
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
