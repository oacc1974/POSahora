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
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Productos() {
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
  });

  useEffect(() => {
    fetchProductos();
  }, []);

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
    });
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div data-testid="products-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Productos
          </h1>
          <p className="text-slate-600">
            Gestiona tu inventario de productos
          </p>
        </div>
        <Button
          onClick={() => openDialog()}
          data-testid="create-product-button"
          size="lg"
          className="gap-2"
        >
          <Plus size={20} />
          Nuevo Producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <Card className="p-12 text-center">
          <Package size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay productos</h3>
          <p className="text-slate-500 mb-6">
            Comienza agregando tu primer producto
          </p>
          <Button
            onClick={() => openDialog()}
            data-testid="create-first-product-button"
          >
            <Plus size={20} className="mr-2" />
            Crear Producto
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map((producto) => (
            <Card
              key={producto.id}
              data-testid={`product-card-${producto.id}`}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900 mb-1">
                    {producto.nombre}
                  </h3>
                  {producto.codigo_barras && (
                    <p className="text-sm text-slate-500 font-mono">
                      {producto.codigo_barras}
                    </p>
                  )}
                </div>
              </div>

              {producto.descripcion && (
                <p className="text-sm text-slate-600 mb-4">
                  {producto.descripcion}
                </p>
              )}

              <div className="mb-4">
                <p className="text-sm text-slate-500">Precio</p>
                <p className="text-2xl font-bold font-mono text-blue-600">
                  ${producto.precio.toFixed(2)}
                </p>
              </div>

              <div className="mb-4 pb-4 border-b border-slate-200">
                <p className="text-sm text-slate-500">Stock</p>
                <p
                  className={`text-lg font-semibold ${
                    producto.stock <= 5
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {producto.stock} unidades
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => openDialog(producto)}
                  data-testid={`edit-product-${producto.id}`}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Pencil size={16} className="mr-2" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(producto.id)}
                  data-testid={`delete-product-${producto.id}`}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  <Trash2 size={16} className="mr-2" />
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                data-testid="product-name-input"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="precio">Precio *</Label>
              <Input
                id="precio"
                data-testid="product-price-input"
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e) =>
                  setFormData({ ...formData, precio: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="codigo_barras">Código de Barras</Label>
              <Input
                id="codigo_barras"
                data-testid="product-barcode-input"
                value={formData.codigo_barras}
                onChange={(e) =>
                  setFormData({ ...formData, codigo_barras: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                data-testid="product-description-input"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                data-testid="product-stock-input"
                type="number"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="save-product-button"
                className="flex-1"
              >
                {editingProduct ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
