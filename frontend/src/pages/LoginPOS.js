import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowLeft, Key, User, Delete, CornerDownLeft, Building2, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = 'pos_tienda_codigo';

export default function LoginPOS({ onLogin }) {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('pin'); // 'pin' o 'password'
  
  // Estados para código de tienda
  const [codigoTienda, setCodigoTienda] = useState('');
  const [tiendaVerificada, setTiendaVerificada] = useState(null);
  const [verificandoTienda, setVerificandoTienda] = useState(false);
  const [mostrarInputCodigo, setMostrarInputCodigo] = useState(true);
  
  // Estados para login con PIN
  const [pin, setPin] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);
  
  // Estados para login con contraseña
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para sesión activa
  const [showSesionActivaDialog, setShowSesionActivaDialog] = useState(false);
  const [sesionActivaInfo, setSesionActivaInfo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // Cargar código de tienda guardado al iniciar
  useEffect(() => {
    const codigoGuardado = localStorage.getItem(STORAGE_KEY);
    if (codigoGuardado) {
      setCodigoTienda(codigoGuardado);
      verificarCodigoTienda(codigoGuardado);
    }
  }, []);

  // Verificar código de tienda
  const verificarCodigoTienda = async (codigo) => {
    if (!codigo || codigo.length < 2) return;
    
    setVerificandoTienda(true);
    try {
      const response = await axios.get(`${API_URL}/api/tienda/verificar/${codigo}`);
      setTiendaVerificada(response.data);
      setMostrarInputCodigo(false);
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, codigo.toUpperCase());
      setCodigoTienda(codigo.toUpperCase());
    } catch (error) {
      setTiendaVerificada(null);
      toast.error('Código de tienda no válido');
    } finally {
      setVerificandoTienda(false);
    }
  };

  // Cambiar tienda (borrar guardado)
  const cambiarTienda = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTiendaVerificada(null);
    setMostrarInputCodigo(true);
    setCodigoTienda('');
    setPin('');
  };

  // Manejar entrada del teclado físico para PIN
  useEffect(() => {
    if (loginMode !== 'pin' || !tiendaVerificada) return;
    
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9' && pin.length < 4) {
        const newPin = pin + e.key;
        setPin(newPin);
        // Auto-login cuando se completan 4 dígitos
        if (newPin.length === 4) {
          setTimeout(() => handlePinSubmitWithPin(newPin, false), 100);
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, pin, tiendaVerificada, codigoTienda]);

  // Manejar clic en tecla del teclado numérico
  const handleKeyPress = (key) => {
    if (key === 'delete') {
      setPin(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setPin('');
    } else if (key === 'enter') {
      if (pin.length === 4) handlePinSubmit(false);
    } else if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      // Auto-login cuando se completan 4 dígitos
      if (newPin.length === 4) {
        setTimeout(() => handlePinSubmitWithPin(newPin, false), 100);
      }
    }
  };

  // Obtener nombre del dispositivo/navegador
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return 'Tablet';
    if (/mobile|android|iphone/i.test(ua)) return 'Móvil';
    return 'Computadora';
  };

  // Login con PIN (usa el PIN del estado)
  const handlePinSubmit = async (forzarCierre = false) => {
    return handlePinSubmitWithPin(pin, forzarCierre);
  };

  // Login con PIN (recibe el PIN directamente - para auto-login)
  const handlePinSubmitWithPin = async (pinValue, forzarCierre = false) => {
    if (pinValue.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }
    
    if (!codigoTienda) {
      toast.error('Ingresa el código de tienda primero');
      return;
    }
    
    if (forzarCierre) {
      setCerrandoSesion(true);
    } else {
      setLoadingPin(true);
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login-pin`,
        { 
          pin: pinValue, 
          codigo_tienda: codigoTienda,
          forzar_cierre: forzarCierre,
          dispositivo: getDeviceName()
        },
        { withCredentials: true }
      );

      const { access_token, session_id, usuario, tienda } = response.data;
      
      // Guardar session_id para verificación
      sessionStorage.setItem('pos_session_id', session_id);
      
      setShowSesionActivaDialog(false);
      onLogin(usuario, access_token);
      toast.success(`¡Bienvenido, ${usuario.nombre}!`, {
        description: `Tienda: ${tienda.nombre}`
      });
    } catch (error) {
      // Verificar si es error de sesión activa (código 409)
      if (error.response?.status === 409) {
        const detail = error.response.data?.detail;
        if (detail?.code === 'SESSION_ACTIVE') {
          setSesionActivaInfo(detail.session_info);
          setShowSesionActivaDialog(true);
          return; // No limpiar el PIN
        }
      }
      
      const errorMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response?.data?.detail 
        : 'PIN inválido';
      toast.error(errorMsg);
      setPin('');
    } finally {
      setLoadingPin(false);
      setCerrandoSesion(false);
    }
  };

  // Login con contraseña (tradicional)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!codigoTienda) {
      toast.error('Ingresa el código de tienda primero');
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login-pos`,
        {
          codigo_tienda: codigoTienda,
          username,
          password,
        },
        { withCredentials: true }
      );

      const { access_token, user } = response.data;
      onLogin(user, access_token);
      toast.success('¡Bienvenido al POS!');
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Error al iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  };

  // Componente del teclado numérico
  const NumericKeypad = () => (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => handleKeyPress(num.toString())}
          className="h-16 text-2xl font-bold bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-400 active:bg-blue-100 active:border-blue-500 transition-all shadow-sm"
        >
          {num}
        </button>
      ))}
      <button
        type="button"
        onClick={() => handleKeyPress('clear')}
        className="h-16 text-sm font-medium bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 active:bg-slate-300 transition-all text-slate-600"
      >
        Borrar
      </button>
      <button
        type="button"
        onClick={() => handleKeyPress('0')}
        className="h-16 text-2xl font-bold bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-400 active:bg-blue-100 active:border-blue-500 transition-all shadow-sm"
      >
        0
      </button>
      <button
        type="button"
        onClick={() => handleKeyPress('delete')}
        className="h-16 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 active:bg-slate-300 transition-all flex items-center justify-center text-slate-600"
      >
        <Delete size={24} />
      </button>
    </div>
  );

  // Indicador de PIN (puntos)
  const PinDisplay = () => (
    <div className="flex justify-center gap-4 my-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full transition-all duration-200 ${
            i < pin.length 
              ? 'bg-blue-600 scale-125' 
              : 'bg-slate-300'
          }`}
        />
      ))}
    </div>
  );

  // Removed unused CodigoTiendaInput component - code is now inline

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-6 md:p-8 shadow-2xl bg-slate-50">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Store size={40} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              Punto de Venta
            </h1>
            <p className="text-slate-500 text-sm">
              Acceso para empleados
            </p>
          </div>

          {/* Código de Tienda */}
          <div className="mb-6">
            {mostrarInputCodigo ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Building2 size={18} />
                  <span className="text-sm font-medium">Código de Tienda</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={codigoTienda}
                    onChange={(e) => setCodigoTienda(e.target.value.toUpperCase())}
                    placeholder="Ej: 001, GOLM, TIENDA1"
                    className="flex-1 h-12 text-center text-lg font-mono uppercase"
                    maxLength={20}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    onClick={() => verificarCodigoTienda(codigoTienda)}
                    disabled={!codigoTienda || verificandoTienda}
                    className="h-12 px-4"
                  >
                    {verificandoTienda ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 text-center">
                  El código está en la configuración de tu tienda
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building2 size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">{tiendaVerificada?.tienda_nombre}</p>
                      <p className="text-xs text-green-600">{tiendaVerificada?.organizacion_nombre} • {codigoTienda}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cambiarTienda}
                    className="text-xs text-green-600 hover:text-green-800 underline"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Solo mostrar opciones de login si la tienda está verificada */}
          {tiendaVerificada && (
            <>
              {/* Tabs de modo de login */}
              <div className="flex bg-slate-200 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setLoginMode('pin')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    loginMode === 'pin'
                      ? 'bg-white shadow text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Key size={18} />
                  PIN
                </button>
                <button
                  onClick={() => setLoginMode('password')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    loginMode === 'password'
                      ? 'bg-white shadow text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User size={18} />
                  Usuario
                </button>
              </div>

              {/* Login con PIN */}
              {loginMode === 'pin' && (
                <div>
                  <p className="text-center text-slate-600 text-sm mb-2">
                    Ingresa tu PIN de 4 dígitos
                  </p>
                  
                  <PinDisplay />
                  
                  <NumericKeypad />
                  
                  {/* Indicador de carga */}
                  {loadingPin && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-blue-600">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="font-medium">Verificando...</span>
                    </div>
                  )}
                  
                  <p className="text-center text-xs text-slate-400 mt-4">
                    El acceso es automático al completar el PIN
                  </p>
                </div>
              )}

              {/* Login con contraseña */}
              {loginMode === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-sm font-semibold">
                      Usuario
                    </Label>
                    <Input
                      id="username"
                      data-testid="pos-username-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="usuario"
                      className="mt-1 h-11 text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-semibold">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      data-testid="pos-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="mt-1 h-11 text-base"
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="pos-login-button"
                    disabled={loading}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* Mensaje si no hay tienda verificada */}
          {!tiendaVerificada && mostrarInputCodigo && (
            <div className="text-center py-8 text-slate-400">
              <Key size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ingresa el código de tienda para continuar</p>
            </div>
          )}

          {/* Link para volver */}
          <div className="mt-6 text-center border-t pt-4">
            <button
              onClick={() => navigate('/login')}
              className="text-slate-500 hover:text-blue-600 text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al login principal
            </button>
          </div>
        </Card>
      </div>

      {/* Diálogo de Sesión Activa */}
      <Dialog open={showSesionActivaDialog} onOpenChange={setShowSesionActivaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={24} />
              Sesión Activa Detectada
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-slate-700 mb-4">
              Este usuario ya tiene una sesión iniciada en otro dispositivo.
            </p>
            
            {sesionActivaInfo && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dispositivo:</span>
                    <span className="font-medium">{sesionActivaInfo.dispositivo}</span>
                  </div>
                  {sesionActivaInfo.iniciada && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Iniciada:</span>
                      <span className="font-medium">
                        {new Date(sesionActivaInfo.iniciada).toLocaleString('es-EC')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <p className="text-slate-600 text-sm">
              ¿Deseas cerrar la otra sesión e iniciar aquí?
            </p>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSesionActivaDialog(false);
                setPin('');
              }}
              disabled={cerrandoSesion}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handlePinSubmit(true)}
              disabled={cerrandoSesion}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {cerrandoSesion ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cerrando...
                </span>
              ) : (
                'Sí, iniciar aquí'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
