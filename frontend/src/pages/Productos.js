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
import { 
  Plus, Pencil, Trash2, Package, ShoppingBasket, List, Tag, 
  Layers, Percent, ChevronDown, ChevronRight 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Productos() {
  // Estado del menú
  const [activeSection, setActiveSection] = useState('productos');
  const [menuExpanded, setMenuExpanded] = useState(true);
  
  // Estados para Productos
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    codigo_barras: '',
    descripcion: '',
    stock: '',
    categoria: '',
  });

  // Estados para Categorías
  const [categorias, setCategorias] = useState([]);
  const [showCategoriaDialog, setShowCategoriaDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [categoriaForm, setCategoriaForm] = useState({ nombre: '', color: '#3B82F6' });

  // Estados para Modificadores
  const [modificadores, setModificadores] = useState([]);
  const [showModificadorDialog, setShowModificadorDialog] = useState(false);
  const [editingModificador, setEditingModificador] = useState(null);
  const [modificadorForm, setModificadorForm] = useState({ nombre: '', precio: '', tipo: 'adicional' });

  // Estados para Descuentos
  const [descuentos, setDescuentos] = useState([]);
  const [showDescuentoDialog, setShowDescuentoDialog] = useState(false);
  const [editingDescuento, setEditingDescuento] = useState(null);
  const [descuentoForm, setDescuentoForm] = useState({ nombre: '', porcentaje: '', activo: true });

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
    fetchModificadores();
    fetchDescuentos();
  }, []);

  // ============ FETCH FUNCTIONS ============
  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/productos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductos(response.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/categorias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategorias(response.data);
    } catch (error) {
      // Si no existe el endpoint, usar categorías de productos
      const cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
      setCategorias(cats.map((c, i) => ({ id: i, nombre: c })));
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
      setModificadores([]);
    }
  };

  const fetchDescuentos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/descuentos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDescuentos(response.data);
    } catch (error) {
      setDescuentos([]);
    }
  };

  // ============ PRODUCTOS HANDLERS ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/productos/${editingProduct.id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Producto actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/api/productos`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Producto creado correctamente');
      }

      setShowDialog(false);
      resetForm();
      fetchProductos();
    } catch (error) {
      toast.error('Error al guardar producto');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/productos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Producto eliminado correctamente');
      fetchProductos();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const openDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nombre: product.nombre,
        precio: product.precio.toString(),
        codigo_barras: product.codigo_barras || '',
        descripcion: product.descripcion || '',
        stock: product.stock.toString(),
        categoria: product.categoria || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      nombre: '',
      precio: '',
      codigo_barras: '',
      descripcion: '',
      stock: '',
      categoria: '',
    });
  };

  // ============ CATEGORIAS HANDLERS ============
  const handleCategoriaSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingCategoria) {
        await axios.put(`${API_URL}/api/categorias/${editingCategoria.id}`, categoriaForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Categoría actualizada');
      } else {
        await axios.post(`${API_URL}/api/categorias`, categoriaForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Categoría creada');
      }
      setShowCategoriaDialog(false);
      setEditingCategoria(null);
      setCategoriaForm({ nombre: '', color: '#3B82F6' });
      fetchCategorias();
    } catch (error) {
      toast.error('Error al guardar categoría');
    }
  };

  const handleDeleteCategoria = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/categorias/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Categoría eliminada');
      fetchCategorias();
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  // ============ MODIFICADORES HANDLERS ============
  const handleModificadorSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = { ...modificadorForm, precio: parseFloat(modificadorForm.precio) || 0 };
      if (editingModificador) {
        await axios.put(`${API_URL}/api/modificadores/${editingModificador.id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Modificador actualizado');
      } else {
        await axios.post(`${API_URL}/api/modificadores`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Modificador creado');
      }
      setShowModificadorDialog(false);
      setEditingModificador(null);
      setModificadorForm({ nombre: '', precio: '', tipo: 'adicional' });
      fetchModificadores();
    } catch (error) {
      toast.error('Error al guardar modificador');
    }
  };

  const handleDeleteModificador = async (id) => {
    if (!window.confirm('¿Eliminar este modificador?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/modificadores/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Modificador eliminado');
      fetchModificadores();
    } catch (error) {
      toast.error('Error al eliminar modificador');
    }
  };

  // ============ DESCUENTOS HANDLERS ============
  const handleDescuentoSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = { ...descuentoForm, porcentaje: parseFloat(descuentoForm.porcentaje) };
      if (editingDescuento) {
        await axios.put(`${API_URL}/api/descuentos/${editingDescuento.id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Descuento actualizado');
      } else {
        await axios.post(`${API_URL}/api/descuentos`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Descuento creado');
      }
      setShowDescuentoDialog(false);
      setEditingDescuento(null);
      setDescuentoForm({ nombre: '', porcentaje: '', activo: true });
      fetchDescuentos();
    } catch (error) {
      toast.error('Error al guardar descuento');
    }
  };

  const handleDeleteDescuento = async (id) => {
    if (!window.confirm('¿Eliminar este descuento?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/descuentos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Descuento eliminado');
      fetchDescuentos();
    } catch (error) {
      toast.error('Error al eliminar descuento');
    }
  };

  // ============ MENU ITEMS ============
  const menuItems = [
    { id: 'productos', label: 'Lista de productos', icon: List },
    { id: 'categorias', label: 'Categorías', icon: Layers },
    { id: 'modificadores', label: 'Modificadores', icon: Tag },
    { id: 'descuentos', label: 'Descuentos', icon: Percent },
  ];

  if (loading) {
    return <div>Cargando...</div>;
  }

  // ============ RENDER SECTIONS ============
  const renderProductos = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lista de productos</h2>
          <p className="text-slate-600 text-sm">Gestiona tu inventario de productos</p>
        </div>
        <Button onClick={() => openDialog()} data-testid="create-product-button" className="gap-2">
          <Plus size={18} />
          Nuevo Producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <Card className="p-12 text-center">
          <Package size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay productos</h3>
          <p className="text-slate-500 mb-6">Comienza agregando tu primer producto</p>
          <Button onClick={() => openDialog()}>
            <Plus size={20} className="mr-2" />
            Crear Producto
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((producto) => (
            <Card key={producto.id} data-testid={`product-card-${producto.id}`} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{producto.nombre}</h3>
                  {producto.categoria && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{producto.categoria}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xl font-bold text-blue-600">${producto.precio.toFixed(2)}</p>
                <p className={`text-sm font-medium ${producto.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {producto.stock} uds
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => openDialog(producto)} variant="outline" size="sm" className="flex-1">
                  <Pencil size={14} className="mr-1" /> Editar
                </Button>
                <Button onClick={() => handleDelete(producto.id)} variant="destructive" size="sm" className="flex-1">
                  <Trash2 size={14} className="mr-1" /> Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderCategorias = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Categorías</h2>
          <p className="text-slate-600 text-sm">Organiza tus productos por categorías</p>
        </div>
        <Button onClick={() => { setEditingCategoria(null); setCategoriaForm({ nombre: '', color: '#3B82F6' }); setShowCategoriaDialog(true); }} className="gap-2">
          <Plus size={18} />
          Nueva Categoría
        </Button>
      </div>

      {categorias.length === 0 ? (
        <Card className="p-12 text-center">
          <Layers size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay categorías</h3>
          <p className="text-slate-500 mb-6">Crea categorías para organizar tus productos</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((cat) => (
            <Card key={cat.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color || '#3B82F6' }}>
                  <Layers size={20} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900">{cat.nombre}</h3>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setEditingCategoria(cat); setCategoriaForm({ nombre: cat.nombre, color: cat.color || '#3B82F6' }); setShowCategoriaDialog(true); }} variant="outline" size="sm" className="flex-1">
                  <Pencil size={14} className="mr-1" /> Editar
                </Button>
                <Button onClick={() => handleDeleteCategoria(cat.id)} variant="destructive" size="sm" className="flex-1">
                  <Trash2 size={14} className="mr-1" /> Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderModificadores = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Modificadores</h2>
          <p className="text-slate-600 text-sm">Opciones adicionales para tus productos</p>
        </div>
        <Button onClick={() => { setEditingModificador(null); setModificadorForm({ nombre: '', precio: '', tipo: 'adicional' }); setShowModificadorDialog(true); }} className="gap-2">
          <Plus size={18} />
          Nuevo Modificador
        </Button>
      </div>

      {modificadores.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay modificadores</h3>
          <p className="text-slate-500 mb-6">Crea modificadores como extras, tamaños, etc.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modificadores.map((mod) => (
            <Card key={mod.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-900">{mod.nombre}</h3>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{mod.tipo}</span>
              </div>
              <p className="text-lg font-bold text-green-600 mb-3">+${mod.precio?.toFixed(2) || '0.00'}</p>
              <div className="flex gap-2">
                <Button onClick={() => { setEditingModificador(mod); setModificadorForm({ nombre: mod.nombre, precio: mod.precio?.toString() || '', tipo: mod.tipo || 'adicional' }); setShowModificadorDialog(true); }} variant="outline" size="sm" className="flex-1">
                  <Pencil size={14} className="mr-1" /> Editar
                </Button>
                <Button onClick={() => handleDeleteModificador(mod.id)} variant="destructive" size="sm" className="flex-1">
                  <Trash2 size={14} className="mr-1" /> Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderDescuentos = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Descuentos</h2>
          <p className="text-slate-600 text-sm">Configura descuentos para aplicar en ventas</p>
        </div>
        <Button onClick={() => { setEditingDescuento(null); setDescuentoForm({ nombre: '', porcentaje: '', activo: true }); setShowDescuentoDialog(true); }} className="gap-2">
          <Plus size={18} />
          Nuevo Descuento
        </Button>
      </div>

      {descuentos.length === 0 ? (
        <Card className="p-12 text-center">
          <Percent size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay descuentos</h3>
          <p className="text-slate-500 mb-6">Crea descuentos para aplicar en tus ventas</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {descuentos.map((desc) => (
            <Card key={desc.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-900">{desc.nombre}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${desc.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {desc.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-600 mb-3">{desc.porcentaje}%</p>
              <div className="flex gap-2">
                <Button onClick={() => { setEditingDescuento(desc); setDescuentoForm({ nombre: desc.nombre, porcentaje: desc.porcentaje?.toString() || '', activo: desc.activo }); setShowDescuentoDialog(true); }} variant="outline" size="sm" className="flex-1">
                  <Pencil size={14} className="mr-1" /> Editar
                </Button>
                <Button onClick={() => handleDeleteDescuento(desc.id)} variant="destructive" size="sm" className="flex-1">
                  <Trash2 size={14} className="mr-1" /> Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div data-testid="products-page" className="flex gap-6">
      {/* Menú lateral */}
      <div className="w-64 flex-shrink-0">
        <Card className="p-2">
          {/* Header del menú */}
          <button
            onClick={() => setMenuExpanded(!menuExpanded)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <ShoppingBasket size={20} className="text-pink-600" />
            </div>
            <span className="font-semibold text-slate-900 flex-1 text-left">Artículos</span>
            {menuExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
          </button>

          {/* Items del menú */}
          {menuExpanded && (
            <div className="mt-1 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Contenido principal */}
      <div className="flex-1">
        {activeSection === 'productos' && renderProductos()}
        {activeSection === 'categorias' && renderCategorias()}
        {activeSection === 'modificadores' && renderModificadores()}
        {activeSection === 'descuentos' && renderDescuentos()}
      </div>

      {/* Dialog Producto */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="precio">Precio *</Label>
                <Input id="precio" type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="stock">Stock *</Label>
                <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label htmlFor="categoria">Categoría</Label>
              <Input id="categoria" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} placeholder="Ej: Bebidas, Comida..." />
            </div>
            <div>
              <Label htmlFor="codigo_barras">Código de Barras</Label>
              <Input id="codigo_barras" value={formData.codigo_barras} onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1">{editingProduct ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Categoría */}
      <Dialog open={showCategoriaDialog} onOpenChange={setShowCategoriaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategoriaSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cat-nombre">Nombre *</Label>
              <Input id="cat-nombre" value={categoriaForm.nombre} onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="cat-color">Color</Label>
              <Input id="cat-color" type="color" value={categoriaForm.color} onChange={(e) => setCategoriaForm({ ...categoriaForm, color: e.target.value })} className="h-10" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCategoriaDialog(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1">{editingCategoria ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Modificador */}
      <Dialog open={showModificadorDialog} onOpenChange={setShowModificadorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModificador ? 'Editar Modificador' : 'Nuevo Modificador'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModificadorSubmit} className="space-y-4">
            <div>
              <Label htmlFor="mod-nombre">Nombre *</Label>
              <Input id="mod-nombre" value={modificadorForm.nombre} onChange={(e) => setModificadorForm({ ...modificadorForm, nombre: e.target.value })} required placeholder="Ej: Extra queso, Tamaño grande..." />
            </div>
            <div>
              <Label htmlFor="mod-precio">Precio adicional</Label>
              <Input id="mod-precio" type="number" step="0.01" value={modificadorForm.precio} onChange={(e) => setModificadorForm({ ...modificadorForm, precio: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="mod-tipo">Tipo</Label>
              <select id="mod-tipo" value={modificadorForm.tipo} onChange={(e) => setModificadorForm({ ...modificadorForm, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                <option value="adicional">Adicional</option>
                <option value="tamaño">Tamaño</option>
                <option value="preparacion">Preparación</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModificadorDialog(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1">{editingModificador ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Descuento */}
      <Dialog open={showDescuentoDialog} onOpenChange={setShowDescuentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDescuento ? 'Editar Descuento' : 'Nuevo Descuento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDescuentoSubmit} className="space-y-4">
            <div>
              <Label htmlFor="desc-nombre">Nombre *</Label>
              <Input id="desc-nombre" value={descuentoForm.nombre} onChange={(e) => setDescuentoForm({ ...descuentoForm, nombre: e.target.value })} required placeholder="Ej: Descuento empleados..." />
            </div>
            <div>
              <Label htmlFor="desc-porcentaje">Porcentaje *</Label>
              <Input id="desc-porcentaje" type="number" step="0.1" value={descuentoForm.porcentaje} onChange={(e) => setDescuentoForm({ ...descuentoForm, porcentaje: e.target.value })} required placeholder="10" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="desc-activo" checked={descuentoForm.activo} onChange={(e) => setDescuentoForm({ ...descuentoForm, activo: e.target.checked })} className="rounded" />
              <Label htmlFor="desc-activo">Activo</Label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDescuentoDialog(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1">{editingDescuento ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
