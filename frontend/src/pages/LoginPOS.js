import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LoginPOS({ onLogin }) {
  const navigate = useNavigate();
  const [codigoTienda, setCodigoTienda] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Store size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Login POS
            </h1>
            <p className="text-slate-600">
              Acceso para empleados
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="codigo_tienda" className="text-base font-semibold">
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
                className="mt-2 h-12 text-lg font-mono"
                maxLength={9}
              />
              <p className="text-xs text-slate-500 mt-1">
                Formato: GOLM-2024
              </p>
            </div>

            <div>
              <Label htmlFor="username" className="text-base font-semibold">
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
                className="mt-2 h-12 text-lg"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-base font-semibold">
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
                className="mt-2 h-12 text-lg"
              />
            </div>

            <Button
              type="submit"
              data-testid="pos-login-button"
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión POS'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Volver al login principal
            </button>
          </div>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">
            ℹ️ ¿Dónde encuentro mi código de tienda?
          </p>
          <p className="text-sm text-blue-700">
            El propietario de la tienda puede ver el código en el dashboard o en configuración.
          </p>
        </div>
      </div>
    </div>
  );
}
