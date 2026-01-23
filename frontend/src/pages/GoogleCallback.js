import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleCode, setGoogleCode] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Autenticación cancelada');
      navigate('/login');
      return;
    }

    if (!code) {
      toast.error('No se recibió código de autorización');
      navigate('/login');
      return;
    }

    setGoogleCode(code);
    processGoogleCode(code);
  }, [searchParams, navigate]);

  const processGoogleCode = async (code) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/google`,
        { code },
        { withCredentials: true }
      );

      if (response.data.needs_registration) {
        // Usuario nuevo - mostrar formulario de registro
        setNeedsRegistration(true);
        setUserData({
          email: response.data.email,
          nombre: response.data.nombre,
          picture: response.data.picture
        });
      } else {
        // Usuario existente - login exitoso
        const { access_token, user } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('just_authenticated', 'true');
        toast.success(`¡Bienvenido, ${user.nombre}!`);
        navigate('/dashboard', { replace: true });
        window.location.reload();
      }
    } catch (error) {
      console.error('Error al procesar código de Google:', error);
      const errorMsg = error.response?.data?.detail || 'Error al iniciar sesión con Google';
      toast.error(errorMsg);
      navigate('/login');
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
        `${API_URL}/api/auth/google`,
        { 
          code: googleCode,
          nombre_tienda: storeName,
          password: password
        },
        { withCredentials: true }
      );

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('just_authenticated', 'true');
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard', { replace: true });
      window.location.reload();
    } catch (error) {
      console.error('Error al crear cuenta:', error);
      const errorMsg = error.response?.data?.detail || 'Error al crear cuenta';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (needsRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            {userData?.picture && (
              <img 
                src={userData.picture} 
                alt="Foto de perfil" 
                className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-100"
              />
            )}
            <h2 className="text-2xl font-bold">¡Bienvenido!</h2>
            <p className="text-slate-600 mt-1">{userData?.nombre}</p>
            <p className="text-sm text-slate-500">{userData?.email}</p>
          </div>

          <p className="text-slate-600 text-center mb-6">
            Para completar tu registro, ingresa el nombre de tu negocio y una contraseña
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="storeName">Nombre del Negocio</Label>
              <Input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                placeholder="Mi Restaurante"
                className="mt-2"
                data-testid="store-name-input"
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
                data-testid="password-input"
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
                data-testid="confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
              data-testid="complete-registration-btn"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            <button 
              onClick={() => navigate('/login')} 
              className="text-blue-600 hover:underline"
            >
              Cancelar y volver al inicio
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Procesando autenticación con Google...</p>
      </div>
    </div>
  );
}
