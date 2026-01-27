/**
 * Documentos Electrónicos
 * Listado y gestión de facturas y notas de crédito electrónicas
 */
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  FileText, Download, RefreshCw, Search, Eye, Send,
  CheckCircle, XCircle, Clock, AlertCircle, FileDown,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { feApi } from '../../services/feApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

export default function DocumentosElectronicos() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    doc_type: '',
    date_from: '',
    date_to: '',
    customer_id: ''
  });
  
  // Modal de detalle
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Modal de nota de crédito
  const [showNCModal, setShowNCModal] = useState(false);
  const [ncReason, setNcReason] = useState('');
  const [creatingNC, setCreatingNC] = useState(false);
  
  // Estado de sincronización
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [pagination.page, filters]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await feApi.getDocuments({
        page: pagination.page,
        limit: 20,
        ...filters
      });
      setDocuments(data.documents || []);
      setPagination({
        page: data.page || 1,
        pages: data.pages || 1,
        total: data.total || 0
      });
    } catch (error) {
      console.error('Error cargando documentos:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (doc) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const data = await feApi.getDocument(doc.document_id);
      setSelectedDoc(data);
    } catch (error) {
      toast.error('Error al cargar detalle');
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadXML = async (doc) => {
    try {
      const blob = await feApi.downloadXML(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.doc_number.replace(/-/g, '')}.xml`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('XML descargado');
    } catch (error) {
      toast.error('Error al descargar XML');
    }
  };

  const handleDownloadPDF = async (doc) => {
    try {
      const blob = await feApi.downloadPDF(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.doc_number.replace(/-/g, '')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleResend = async (doc) => {
    if (!window.confirm('¿Reenviar este documento al SRI?')) return;
    
    try {
      const result = await feApi.resendDocument(doc.document_id);
      if (result.sri_status === 'AUTORIZADO') {
        toast.success('Documento autorizado correctamente');
      } else {
        toast.error(`Estado: ${result.sri_status}`);
      }
      loadDocuments();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCreateNC = async () => {
    if (!ncReason.trim()) {
      toast.error('Ingrese el motivo de la nota de crédito');
      return;
    }
    
    setCreatingNC(true);
    try {
      // Usar todos los items de la factura original
      const result = await feApi.createCreditNote({
        invoice_id: selectedDoc.document.document_id,
        reason: ncReason,
        items: selectedDoc.document.items.map(item => ({
          code: item.code,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          iva_rate: item.iva_rate || 15
        }))
      });
      
      if (result.sri_status === 'AUTORIZADO') {
        toast.success(`Nota de crédito creada: ${result.doc_number}`);
      } else {
        toast.warning(`NC creada pero estado: ${result.sri_status}`);
      }
      
      setShowNCModal(false);
      setNcReason('');
      setShowDetail(false);
      loadDocuments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreatingNC(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'AUTORIZADO': 'bg-green-100 text-green-800',
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'RECHAZADO': 'bg-red-100 text-red-800',
      'NO_AUTORIZADO': 'bg-red-100 text-red-800',
      'ERROR': 'bg-red-100 text-red-800',
      'EN_PROCESO': 'bg-blue-100 text-blue-800'
    };
    
    const icons = {
      'AUTORIZADO': <CheckCircle size={14} />,
      'PENDIENTE': <Clock size={14} />,
      'RECHAZADO': <XCircle size={14} />,
      'NO_AUTORIZADO': <XCircle size={14} />,
      'ERROR': <AlertCircle size={14} />,
      'EN_PROCESO': <RefreshCw size={14} className="animate-spin" />
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const getDocTypeName = (type) => {
    return type === '01' ? 'Factura' : type === '04' ? 'Nota Crédito' : type;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-blue-600" />
            Documentos Electrónicos
          </h1>
          <p className="text-slate-600 mt-1">
            {pagination.total} documentos encontrados
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline" disabled={loading}>
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm text-slate-600">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full h-10 px-3 border rounded-md mt-1"
            >
              <option value="">Todos</option>
              <option value="AUTORIZADO">Autorizado</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-slate-600">Tipo</label>
            <select
              value={filters.doc_type}
              onChange={(e) => setFilters({...filters, doc_type: e.target.value})}
              className="w-full h-10 px-3 border rounded-md mt-1"
            >
              <option value="">Todos</option>
              <option value="01">Factura</option>
              <option value="04">Nota de Crédito</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-slate-600">Desde</label>
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm text-slate-600">Hasta</label>
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm text-slate-600">Identificación</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                value={filters.customer_id}
                onChange={(e) => setFilters({...filters, customer_id: e.target.value})}
                placeholder="Buscar..."
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabla de documentos */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 font-medium text-slate-600">Fecha</th>
                <th className="text-left p-4 font-medium text-slate-600">Tipo</th>
                <th className="text-left p-4 font-medium text-slate-600">Número</th>
                <th className="text-left p-4 font-medium text-slate-600">Cliente</th>
                <th className="text-right p-4 font-medium text-slate-600">Total</th>
                <th className="text-center p-4 font-medium text-slate-600">Estado</th>
                <th className="text-center p-4 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <RefreshCw className="animate-spin mx-auto text-blue-600" size={32} />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No se encontraron documentos
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.document_id} className="border-t hover:bg-slate-50">
                    <td className="p-4">
                      {new Date(doc.issue_date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${doc.doc_type === '01' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {getDocTypeName(doc.doc_type)}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-sm">{doc.doc_number}</td>
                    <td className="p-4">
                      <div className="text-sm">{doc.customer?.name}</div>
                      <div className="text-xs text-slate-500">{doc.customer?.identification}</div>
                    </td>
                    <td className="p-4 text-right font-medium">
                      ${doc.totals?.total?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(doc.sri_status)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetail(doc)} title="Ver detalle">
                          <Eye size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadXML(doc)} title="Descargar XML">
                          <FileDown size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(doc)} title="Descargar PDF">
                          <Download size={16} />
                        </Button>
                        {doc.sri_status !== 'AUTORIZADO' && (
                          <Button size="sm" variant="ghost" onClick={() => handleResend(doc)} title="Reenviar">
                            <Send size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-slate-600">
              Página {pagination.page} de {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalle */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDoc?.document?.doc_type === '01' ? 'Factura' : 'Nota de Crédito'} {selectedDoc?.document?.doc_number}
            </DialogTitle>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="animate-spin mx-auto" size={32} />
            </div>
          ) : selectedDoc && (
            <div className="space-y-6">
              {/* Estado */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedDoc.document.sri_status)}
                {selectedDoc.document.sri_authorization_number && (
                  <span className="text-xs text-slate-500">
                    Auth: {selectedDoc.document.sri_authorization_number}
                  </span>
                )}
              </div>
              
              {/* Clave de acceso */}
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-500">Clave de Acceso</p>
                <p className="font-mono text-xs break-all">{selectedDoc.document.access_key}</p>
              </div>
              
              {/* Cliente */}
              <div>
                <h4 className="font-medium mb-2">Cliente</h4>
                <div className="bg-slate-50 p-3 rounded text-sm">
                  <p><strong>{selectedDoc.document.customer?.name}</strong></p>
                  <p>{selectedDoc.document.customer?.identification}</p>
                  {selectedDoc.document.customer?.email && <p>{selectedDoc.document.customer?.email}</p>}
                </div>
              </div>
              
              {/* Items */}
              <div>
                <h4 className="font-medium mb-2">Detalle</h4>
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left">Descripción</th>
                      <th className="p-2 text-right">Cant.</th>
                      <th className="p-2 text-right">P.Unit</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDoc.document.items?.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">${item.unit_price?.toFixed(2)}</td>
                        <td className="p-2 text-right">${item.subtotal?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Totales */}
              <div className="bg-slate-50 p-4 rounded">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${(selectedDoc.document.totals?.total - selectedDoc.document.totals?.total_iva)?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA:</span>
                  <span>${selectedDoc.document.totals?.total_iva?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                  <span>Total:</span>
                  <span>${selectedDoc.document.totals?.total?.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Acciones */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => handleDownloadXML(selectedDoc.document)}>
                  <FileDown size={16} className="mr-2" />
                  XML
                </Button>
                <Button variant="outline" onClick={() => handleDownloadPDF(selectedDoc.document)}>
                  <Download size={16} className="mr-2" />
                  PDF
                </Button>
                {selectedDoc.document.doc_type === '01' && 
                 selectedDoc.document.sri_status === 'AUTORIZADO' && 
                 !selectedDoc.document.has_credit_note && (
                  <Button variant="destructive" onClick={() => setShowNCModal(true)}>
                    Crear Nota de Crédito
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Nota de Crédito */}
      <Dialog open={showNCModal} onOpenChange={setShowNCModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nota de Crédito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Se creará una nota de crédito para anular la factura {selectedDoc?.document?.doc_number}
            </p>
            <div>
              <label className="text-sm font-medium">Motivo *</label>
              <Input
                value={ncReason}
                onChange={(e) => setNcReason(e.target.value)}
                placeholder="Ej: Devolución de mercadería"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNCModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateNC} disabled={creatingNC}>
                {creatingNC && <RefreshCw className="animate-spin mr-2" size={16} />}
                Crear Nota de Crédito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
