import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, Trash2, Users, Package, ShoppingCart, Calendar, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Organizaciones() {
  const [organizaciones, setOrganizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);

  useEffect(() => {
    fetchOrganizaciones();
  }, []);

  const fetchOrganizaciones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/organizaciones`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setOrganizaciones(response.data);
    } catch (error) {
      console.error('Error al cargar organizaciones:', error);
      toast.error('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (org) => {
    setOrgToDelete(org);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orgToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/organizaciones/${orgToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      toast.success('Organización eliminada correctamente');
      setShowDeleteDialog(false);
      setOrgToDelete(null);
      fetchOrganizaciones();
    } catch (error) {
      console.error('Error al eliminar organización:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar organización');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
          Gestión de Organizaciones
        </h1>
        <p className="text-slate-600">Panel de administración de todas las organizaciones</p>
      </div>

      {organizaciones.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold mb-2">No hay organizaciones</h3>
          <p className="text-slate-500">Aún no se han registrado organizaciones</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {organizaciones.map((org) => (
            <Card key={org.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-1 break-words">
                        {org.nombre}
                      </h3>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Propietario:</span> {org.propietario_nombre}
                      </p>
                      {org.propietario_email && (
                        <p className="text-sm text-slate-500 break-all">{org.propietario_email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Users size={16} className="text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Usuarios</p>
                        <p className="text-sm font-semibold">{org.total_usuarios}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Package size={16} className="text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Productos</p>
                        <p className="text-sm font-semibold">{org.total_productos}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <ShoppingCart size={16} className="text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Ventas</p>
                        <p className="text-sm font-semibold">{org.total_ventas}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Calendar size={16} className="text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">ID</p>
                        <p className="text-xs font-mono truncate" title={org.id}>{org.id}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span>Creada: {formatDate(org.fecha_creacion)}</span>
                    </div>
                    {org.ultima_actividad && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span>Última actividad: {formatDate(org.ultima_actividad)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
                  {org.id !== 'admin' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(org)}
                      className="gap-2"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>¿Eliminar Organización?</DialogTitle>
            <DialogDescription>
              Esta acción es permanente y eliminará:
            </DialogDescription>
          </DialogHeader>

          {orgToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-slate-900 mb-2">{orgToDelete.nombre}</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• {orgToDelete.total_usuarios} usuario(s)</li>
                  <li>• {orgToDelete.total_productos} producto(s)</li>
                  <li>• {orgToDelete.total_ventas} venta(s)</li>
                  <li>• Todas las cajas y clientes</li>
                  <li>• Toda la configuración</li>
                </ul>
              </div>

              <p className="text-sm text-red-600 font-medium">
                ⚠️ Esta acción no se puede deshacer
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  className="flex-1"
                >
                  Eliminar Permanentemente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
