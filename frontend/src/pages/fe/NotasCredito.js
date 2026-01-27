import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { RefreshCw, Eye, Download, FileText, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import feApi from '../../services/feApi';

export default function NotasCredito() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await feApi.getDocuments({
        page: pagination.page,
        limit: 50,
        doc_type: '04' // Solo notas de crédito
      });
      setDocuments(data.documents || []);
      setPagination({
        page: data.page || 1,
        pages: data.pages || 1,
        total: data.total || 0
      });
    } catch (error) {
      toast.error('Error al cargar notas de crédito');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleViewDocument = async (doc) => {
    try {
      const fullDoc = await getDocument(doc.document_id);
      setSelectedDoc({ document: fullDoc, showDetail: true });
    } catch (error) {
      toast.error('Error al cargar detalle');
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const result = await syncPendingDocuments();
      if (result.authorized > 0) {
        toast.success(`${result.authorized} documento(s) autorizado(s)`);
      }
      await loadDocuments();
    } catch (error) {
      toast.error('Error al sincronizar');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXML = async (doc) => {
    try {
      await downloadXML(doc.document_id, doc.doc_number);
      toast.success('XML descargado');
    } catch (error) {
      toast.error('Error al descargar XML');
    }
  };

  const handleDownloadPDF = async (doc) => {
    try {
      await downloadPDF(doc.document_id, doc.doc_number);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'AUTORIZADO':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'EN_PROCESO':
      case 'RECIBIDA':
        return <Clock className="text-yellow-500" size={18} />;
      case 'ERROR':
      case 'NO_AUTORIZADO':
        return <XCircle className="text-red-500" size={18} />;
      default:
        return <AlertCircle className="text-gray-500" size={18} />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'AUTORIZADO': 'bg-green-100 text-green-700',
      'EN_PROCESO': 'bg-yellow-100 text-yellow-700',
      'RECIBIDA': 'bg-blue-100 text-blue-700',
      'ERROR': 'bg-red-100 text-red-700',
      'NO_AUTORIZADO': 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  // Extraer fecha de la clave de acceso (formato: DDMMAAAA en posiciones 0-7)
  const getDateFromAccessKey = (accessKey) => {
    if (accessKey && accessKey.length >= 8) {
      const day = accessKey.substring(0, 2);
      const month = accessKey.substring(2, 4);
      const year = accessKey.substring(4, 8);
      return `${day}/${month}/${year}`;
    }
    return 'N/A';
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="notas-credito-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notas de Crédito</h1>
          <p className="text-slate-500">{pagination.total} notas de crédito encontradas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar SRI
          </Button>
          <Button onClick={loadDocuments} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Notas de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p>No hay notas de crédito registradas</p>
              <p className="text-sm">Las notas de crédito se crean desde el detalle de una factura electrónica</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="nc-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-medium text-slate-600">Número</th>
                    <th className="text-left p-4 font-medium text-slate-600">Fecha</th>
                    <th className="text-left p-4 font-medium text-slate-600">Factura Ref.</th>
                    <th className="text-left p-4 font-medium text-slate-600">Cliente</th>
                    <th className="text-left p-4 font-medium text-slate-600">Total</th>
                    <th className="text-left p-4 font-medium text-slate-600">Estado</th>
                    <th className="text-left p-4 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.document_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 font-mono text-sm">{doc.doc_number}</td>
                      <td className="p-4 text-sm">{getDateFromAccessKey(doc.access_key)}</td>
                      <td className="p-4 text-sm font-mono text-slate-600">
                        {doc.invoice_reference?.doc_number || 'N/A'}
                      </td>
                      <td className="p-4 text-sm">{doc.customer?.name || 'N/A'}</td>
                      <td className="p-4 font-semibold">${doc.totals?.total?.toFixed(2) || '0.00'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(doc.sri_status)}`}>
                          {getStatusIcon(doc.sri_status)}
                          {doc.sri_status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDocument(doc)}
                            data-testid="view-nc-btn"
                          >
                            <Eye size={16} />
                          </Button>
                          {doc.sri_status === 'AUTORIZADO' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadPDF(doc)}
                                data-testid="download-pdf-btn"
                              >
                                <FileText size={16} className="text-red-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadXML(doc)}
                                data-testid="download-xml-btn"
                              >
                                <Download size={16} className="text-blue-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
              >
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm text-slate-600">
                Página {pagination.page} de {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle */}
      <Dialog open={selectedDoc?.showDetail} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Nota de Crédito</DialogTitle>
          </DialogHeader>
          {selectedDoc?.document && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Número</p>
                  <p className="font-mono font-semibold">{selectedDoc.document.doc_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Fecha de Emisión</p>
                  <p className="font-semibold">{getDateFromAccessKey(selectedDoc.document.access_key)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estado SRI</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedDoc.document.sri_status)}`}>
                    {getStatusIcon(selectedDoc.document.sri_status)}
                    {selectedDoc.document.sri_status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Factura Referencia</p>
                  <p className="font-mono">{selectedDoc.document.invoice_reference?.doc_number || 'N/A'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-slate-500 mb-2">Motivo</p>
                <p>{selectedDoc.document.reason || 'No especificado'}</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-slate-500 mb-2">Cliente</p>
                <p className="font-semibold">{selectedDoc.document.customer?.name}</p>
                <p className="text-sm text-slate-600">{selectedDoc.document.customer?.identification}</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-slate-500 mb-2">Items</p>
                <div className="space-y-2">
                  {selectedDoc.document.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-slate-500">{item.quantity} x ${item.unit_price?.toFixed(2)}</p>
                      </div>
                      <p className="font-semibold">${item.total?.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Total</p>
                  <p className="text-xl font-bold text-emerald-600">${selectedDoc.document.totals?.total?.toFixed(2)}</p>
                </div>
              </div>

              {selectedDoc.document.access_key && (
                <div className="border-t pt-4">
                  <p className="text-sm text-slate-500 mb-2">Clave de Acceso</p>
                  <p className="font-mono text-xs break-all">{selectedDoc.document.access_key}</p>
                </div>
              )}

              {selectedDoc.document.sri_authorization_number && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Número de Autorización</p>
                  <p className="font-mono text-xs break-all">{selectedDoc.document.sri_authorization_number}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
