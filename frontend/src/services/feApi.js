/**
 * Servicio API para Facturación Electrónica
 * Conecta el POS con el Backend FE
 */

const FE_API_URL = process.env.REACT_APP_BACKEND_FE_URL || 'http://localhost:8002';

/**
 * Obtiene el tenant_id del localStorage
 * En el POS, usamos el organizacion_id como tenant_id
 */
const getTenantId = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.organizacion_id || '';
};

/**
 * Headers comunes para todas las peticiones
 */
const getHeaders = (contentType = 'application/json') => {
  const headers = {
    'X-Tenant-ID': getTenantId()
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
};

/**
 * Maneja errores de la API
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || error.error || 'Error en la petición');
  }
  return response.json();
};

export const feApi = {
  // ============ CONFIGURACIÓN ============
  
  /**
   * Guarda la configuración del emisor
   */
  saveEmitterConfig: async (data) => {
    const response = await fetch(`${FE_API_URL}/fe/config/emitter`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  /**
   * Sube el certificado .p12
   */
  uploadCertificate: async (file, password) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    
    const response = await fetch(`${FE_API_URL}/fe/config/certificate`, {
      method: 'POST',
      headers: { 'X-Tenant-ID': getTenantId() },
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Obtiene la configuración actual
   */
  getConfig: async () => {
    const response = await fetch(`${FE_API_URL}/fe/config`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Elimina el certificado
   */
  deleteCertificate: async () => {
    const response = await fetch(`${FE_API_URL}/fe/config/certificate`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  },

  // ============ DOCUMENTOS ============

  /**
   * Crea una factura electrónica
   */
  createInvoice: async (data) => {
    const response = await fetch(`${FE_API_URL}/fe/documents/invoice`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  /**
   * Crea una nota de crédito
   */
  createCreditNote: async (data) => {
    const response = await fetch(`${FE_API_URL}/fe/documents/credit-note`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  /**
   * Lista documentos con filtros
   */
  getDocuments: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.status) params.append('status', filters.status);
    if (filters.doc_type) params.append('doc_type', filters.doc_type);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.customer_id) params.append('customer_id', filters.customer_id);
    
    const response = await fetch(`${FE_API_URL}/fe/documents?${params}`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Obtiene un documento por ID
   */
  getDocument: async (documentId) => {
    const response = await fetch(`${FE_API_URL}/fe/documents/${documentId}`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Descarga el XML de un documento
   */
  downloadXML: async (documentId) => {
    const response = await fetch(`${FE_API_URL}/fe/documents/${documentId}/xml`, {
      headers: { 'X-Tenant-ID': getTenantId() }
    });
    
    if (!response.ok) {
      throw new Error('Error al descargar XML');
    }
    
    const blob = await response.blob();
    return blob;
  },

  /**
   * Descarga el PDF de un documento
   */
  downloadPDF: async (documentId) => {
    const response = await fetch(`${FE_API_URL}/fe/documents/${documentId}/pdf`, {
      headers: { 'X-Tenant-ID': getTenantId() }
    });
    
    if (!response.ok) {
      throw new Error('Error al descargar PDF');
    }
    
    const blob = await response.blob();
    return blob;
  },

  /**
   * Reenvía un documento al SRI
   */
  resendDocument: async (documentId) => {
    const response = await fetch(`${FE_API_URL}/fe/documents/${documentId}/resend`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(response);
  },

  // ============ UTILIDADES ============

  /**
   * Verifica el estado del servicio FE
   */
  healthCheck: async () => {
    const response = await fetch(`${FE_API_URL}/fe/health`);
    return handleResponse(response);
  },

  /**
   * Transforma una venta del POS al formato de factura FE
   */
  transformSaleToInvoice: (sale, customer, storeCode = '001', emissionPoint = '001') => {
    return {
      store_code: storeCode,
      emission_point: emissionPoint,
      customer: {
        identification_type: customer.tipo_identificacion || '05',
        identification: customer.identificacion || customer.cedula || '9999999999999',
        name: customer.nombre || 'CONSUMIDOR FINAL',
        email: customer.email || null,
        phone: customer.telefono || null,
        address: customer.direccion || null
      },
      items: sale.items.map(item => ({
        code: item.codigo || item.id || 'PROD',
        description: item.nombre || item.descripcion || 'Producto',
        quantity: item.cantidad || 1,
        unit_price: item.precio_unitario || item.precio || 0,
        discount: item.descuento || 0,
        iva_rate: item.iva || 15
      })),
      payments: sale.pagos ? sale.pagos.map(p => ({
        method: p.metodo_codigo || '01',
        total: p.monto || 0,
        term: p.plazo || 0
      })) : [{
        method: '01',
        total: sale.total || 0,
        term: 0
      }]
    };
  }
};

export default feApi;
