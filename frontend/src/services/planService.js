import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Verifica si se puede crear un nuevo recurso según el plan
 * @param {string} recurso - Tipo de recurso: 'facturas', 'usuarios', 'productos', 'tpv', 'clientes'
 * @returns {Promise<{puede: boolean, mensaje: string, uso: number, limite: number}>}
 */
export async function verificarLimitePlan(recurso) {
  try {
    const token = sessionStorage.getItem('token');
    const response = await axios.get(`${API_URL}/api/verificar-limite/${recurso}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return {
      puede: response.data.puede_crear,
      mensaje: response.data.mensaje,
      uso: response.data.uso_actual,
      limite: response.data.limite,
      ilimitado: response.data.ilimitado
    };
  } catch (error) {
    console.error('Error al verificar límite:', error);
    return { puede: true, mensaje: '', uso: 0, limite: -1, ilimitado: true };
  }
}

/**
 * Muestra un toast de error cuando se alcanza el límite del plan
 * @param {string} mensaje - Mensaje de error
 */
export function mostrarErrorLimite(mensaje) {
  toast.error(mensaje, {
    duration: 5000,
    action: {
      label: 'Ver Planes',
      onClick: () => window.location.href = '/mi-plan'
    }
  });
}

/**
 * Maneja errores de respuesta HTTP que pueden incluir límites de plan
 * @param {Error} error - Error de axios
 * @returns {string} Mensaje de error para mostrar
 */
export function manejarErrorPlan(error) {
  const response = error.response;
  
  if (response?.status === 403) {
    const detail = response.data?.detail;
    
    // Si es un objeto con code PLAN_LIMIT
    if (detail?.code === 'PLAN_LIMIT') {
      mostrarErrorLimite(detail.message);
      return detail.message;
    }
    
    // Si es un string que parece ser un error de límite
    if (typeof detail === 'string' && detail.includes('límite')) {
      mostrarErrorLimite(detail);
      return detail;
    }
  }
  
  // Error genérico
  const mensaje = response?.data?.detail || 'Error al realizar la operación';
  return typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje);
}

/**
 * Obtiene el plan actual del usuario
 * @returns {Promise<object|null>}
 */
export async function obtenerMiPlan() {
  try {
    const token = sessionStorage.getItem('token');
    const response = await axios.get(`${API_URL}/api/mi-plan`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener plan:', error);
    return null;
  }
}

/**
 * Calcula el porcentaje de uso de un recurso
 * @param {number} uso - Uso actual
 * @param {number} limite - Límite del plan
 * @returns {number} Porcentaje de uso (0-100)
 */
export function calcularPorcentajeUso(uso, limite) {
  if (limite === -1) return 0; // Ilimitado
  if (limite === 0) return 100;
  return Math.min((uso / limite) * 100, 100);
}

/**
 * Determina si se debe mostrar una alerta por uso alto
 * @param {number} uso - Uso actual
 * @param {number} limite - Límite del plan
 * @returns {boolean}
 */
export function deberiaAlertarUso(uso, limite) {
  if (limite === -1) return false; // Ilimitado
  return calcularPorcentajeUso(uso, limite) >= 80;
}
