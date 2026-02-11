import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Printer, Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfigImpresorasCocina() {
  const [grupos, setGrupos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    categorias: []
  });
  const [saving, setSaving] = useState(false);

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchGrupos();
    fetchCategorias();
  }, []);

  const fetchGrupos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/grupos-impresora`, { headers });
      setGrupos(response.data);
    } catch (error) {
      console.error('Error al cargar grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/categorias`, { headers });
      setCategorias(response.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleOpenDialog = (grupo = null) => {
    if (grupo) {
      setEditingGrupo(grupo);
      setFormData({
        nombre: grupo.nombre,
        categorias: grupo.categorias || []
      });
    } else {
      setEditingGrupo(null);
      setFormData({
        nombre: '',
        categorias: []
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      if (editingGrupo) {
        await axios.put(`${API_URL}/api/grupos-impresora/${editingGrupo.id}`, formData, { headers });
        toast.success('Grupo actualizado');
      } else {
        await axios.post(`${API_URL}/api/grupos-impresora`, formData, { headers });
        toast.success('Grupo creado');
      }
      setShowDialog(false);
      fetchGrupos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (grupoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este grupo de impresora?')) return;

    try {
      await axios.delete(`${API_URL}/api/grupos-impresora/${grupoId}`, { headers });
      toast.success('Grupo eliminado');
      fetchGrupos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleCategoriaToggle = (categoriaId) => {
    setFormData(prev => {
      const categorias = prev.categorias.includes(categoriaId)
        ? prev.categorias.filter(id => id !== categoriaId)
        : [...prev.categorias, categoriaId];
      return { ...prev, categorias };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="config-impresoras-cocina">
      <div>
        <h1 className="text-2xl font-bold">Impresoras de cocina</h1>
        <p className="text-muted-foreground">Configura los grupos de impresora para enviar comandas</p>
      </div>

      {/* Estado vacío o lista de grupos */}
      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Printer className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Impresoras de cocina</h3>
              <p className="text-muted-foreground mb-6">
                Agregar un grupo de impresora para imprimir pedidos para la cocina.
              </p>
              <Button onClick={() => handleOpenDialog()} data-testid="btn-agregar-grupo">
                <Plus className="w-4 h-4 mr-2" />
                AGREGAR GRUPO DE IMPRESORA
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Button onClick={() => handleOpenDialog()} data-testid="btn-agregar-grupo">
            <Plus className="w-4 h-4 mr-2" />
            AGREGAR GRUPO DE IMPRESORA
          </Button>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-medium">Nombre</th>
                    <th className="text-left p-4 font-medium">Categorías</th>
                    <th className="text-left p-4 font-medium w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((grupo) => (
                    <tr key={grupo.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{grupo.nombre}</td>
                      <td className="p-4 text-muted-foreground">
                        {grupo.categorias_nombres?.length > 0 
                          ? grupo.categorias_nombres.join(', ')
                          : 'Sin categorías'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(grupo)}
                            data-testid={`btn-editar-${grupo.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(grupo.id)}
                            className="text-red-500 hover:text-red-600"
                            data-testid={`btn-eliminar-${grupo.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Crear/Editar Grupo */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGrupo ? 'Editar grupo de impresora' : 'Nuevo grupo de impresora'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Cocina, Barra, Postres..."
                data-testid="input-nombre-grupo"
              />
            </div>

            <div>
              <Label className="mb-2 block">Categorías</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Categorías que este grupo de impresora imprime
              </p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {categorias.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay categorías creadas
                  </p>
                ) : (
                  categorias.map((categoria) => (
                    <div key={categoria.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${categoria.id}`}
                        checked={formData.categorias.includes(categoria.id)}
                        onCheckedChange={() => handleCategoriaToggle(categoria.id)}
                        data-testid={`checkbox-cat-${categoria.id}`}
                      />
                      <Label htmlFor={`cat-${categoria.id}`} className="font-normal cursor-pointer">
                        {categoria.nombre}
                      </Label>
                    </div>
                  ))
                )}
                
                {/* Opción "Sin categoría" */}
                <div className="flex items-center gap-2 pt-2 border-t mt-2">
                  <Checkbox
                    id="cat-sin-categoria"
                    checked={formData.categorias.includes('sin_categoria')}
                    onCheckedChange={() => handleCategoriaToggle('sin_categoria')}
                    data-testid="checkbox-sin-categoria"
                  />
                  <Label htmlFor="cat-sin-categoria" className="font-normal cursor-pointer text-muted-foreground">
                    Sin categoría
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              CANCELAR
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="btn-guardar-grupo">
              {saving ? 'GUARDANDO...' : 'GUARDAR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
