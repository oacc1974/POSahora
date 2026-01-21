import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowLeft, Key, User, Delete, CornerDownLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LoginPOS({ onLogin }) {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('pin'); // 'pin' o 'password'
  
  // Estados para login con PIN
  const [pin, setPin] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);
  
  // Estados para login con contraseña
  const [codigoTienda, setCodigoTienda] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Manejar entrada del teclado físico para PIN
  useEffect(() => {
    if (loginMode !== 'pin') return;
    
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9' && pin.length < 6) {
        setPin(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handlePinSubmit();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, pin]);

  // Manejar clic en tecla del teclado numérico
  const handleKeyPress = (key) => {
    if (key === 'delete') {
      setPin(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setPin('');
    } else if (key === 'enter') {
      handlePinSubmit();
    } else if (pin.length < 6) {
      setPin(prev => prev + key);
    }
  };

  // Login con PIN
  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      toast.error('El PIN debe tener al menos 4 dígitos');
      return;
    }
    
    setLoadingPin(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login-pin`,
        { pin },
        { withCredentials: true }
      );

      const { access_token, usuario } = response.data;
      onLogin(usuario, access_token);
      toast.success(`¡Bienvenido, ${usuario.nombre}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'PIN inválido');
      setPin('');
    } finally {
      setLoadingPin(false);
    }
  };

  // Login con contraseña (tradicional)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login-pos`,
        {
          codigo_tienda: codigoTienda.toUpperCase(),
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
    <div className="flex justify-center gap-3 my-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full transition-all duration-200 ${
            i < pin.length 
              ? 'bg-blue-600 scale-110' 
              : i < 4 
                ? 'bg-slate-300' 
                : 'bg-slate-200 opacity-50'
          }`}
        />
      ))}
    </div>
  );

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
                Ingresa tu PIN de acceso
              </p>
              
              <PinDisplay />
              
              <NumericKeypad />
              
              <Button
                onClick={handlePinSubmit}
                disabled={pin.length < 4 || loadingPin}
                className="w-full h-14 text-lg font-semibold mt-4 bg-blue-600 hover:bg-blue-700"
              >
                {loadingPin ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CornerDownLeft size={20} />
                    Ingresar
                  </span>
                )}
              </Button>
              
              <p className="text-center text-xs text-slate-400 mt-4">
                También puedes usar el teclado numérico físico
              </p>
            </div>
          )}

          {/* Login con contraseña */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="codigo_tienda" className="text-sm font-semibold">
                  Código de Tienda
                </Label>
                <Input
                  id="codigo_tienda"
                  data-testid="pos-codigo-input"
                  type="text"
                  value={codigoTienda}
                  onChange={(e) => setCodigoTienda(e.target.value.toUpperCase())}
                  required
                  placeholder="XXXX-####"
                  className="mt-1 h-11 text-base font-mono"
                  maxLength={9}
                />
              </div>

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
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <p className="text-xs text-blue-700">
                  <strong>Código de tienda:</strong> Lo proporciona el propietario o administrador
                </p>
              </div>
            </form>
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
    </div>
  );
}
