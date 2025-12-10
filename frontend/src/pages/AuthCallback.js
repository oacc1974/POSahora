import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const [needsStoreName, setNeedsStoreName] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const sid = params.get('session_id');

    if (!sid) {
      toast.error('No se encontró ID de sesión');
      navigate('/login');
      return;
    }

    setSessionId(sid);
    checkIfNewUser(sid);
  }, [navigate]);

  const checkIfNewUser = async (sid) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/session`,
        {},
        {
          headers: { 'X-Session-ID': sid },
          withCredentials: true
        }
      );

      const user = response.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('just_authenticated', 'true');
      navigate('/dashboard', { replace: true, state: { user } });
      window.location.reload();
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('tienda')) {
        setNeedsStoreName(true);
      } else {
        console.error('Error al procesar sesión:', error);
        toast.error('Error al iniciar sesión con Google');
        navigate('/login');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/session`,
        { 
          nombre_tienda: storeName,
          password: password
        },
        {
          headers: { 'X-Session-ID': sessionId },
          withCredentials: true
        }
      );

      const user = response.data.user;
      
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('just_authenticated', 'true');
      toast.success('¡Cuenta creada exitosamente!');
      
      navigate('/dashboard', { replace: true, state: { user } });
      window.location.reload();
    } catch (error) {
      console.error('Error al procesar sesión:', error);
      toast.error('Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  if (needsStoreName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md p-8">
          <h2 className="text-2xl font-bold text-center mb-2">¡Bienvenido!</h2>
          <p className="text-slate-600 text-center mb-6">
            Para completar tu registro, ingresa el nombre de tu tienda
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="storeName">Nombre de la Tienda</Label>
              <Input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                placeholder="Mi Tienda"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-2"
                minLength={6}
              />
              <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-2"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Continuar'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Procesando autenticación...</p>
      </div>
    </div>
  );
}
