import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Store } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setErrorMessage('No se proporcionó un token de recuperación');
        setVerifying(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/auth/verify-reset-token/${token}`);
        if (response.data.valid) {
          setTokenValid(true);
          setEmail(response.data.email);
        } else {
          setTokenValid(false);
          setErrorMessage(response.data.message || 'Token inválido');
        }
      } catch (error) {
        setTokenValid(false);
        setErrorMessage('Error al verificar el token');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Contraseña actualizada correctamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando enlace...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
            <Store size={32} className="text-white" />
          </div>
        </div>

        {!tokenValid ? (
          // Token inválido
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Enlace inválido</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            <Link to="/forgot-password">
              <Button className="w-full">Solicitar nuevo enlace</Button>
            </Link>
          </div>
        ) : success ? (
          // Éxito
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
            <p className="text-slate-600 mb-6">
              Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Iniciar Sesión
            </Button>
          </div>
        ) : (
          // Formulario
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Nueva Contraseña</h1>
              <p className="text-slate-600 mt-2">
                Ingresa tu nueva contraseña para <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Nueva Contraseña</Label>
                <div className="relative mt-1">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 pr-10"
                    data-testid="reset-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative mt-1">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="pl-10"
                    data-testid="reset-confirm-input"
                  />
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Las contraseñas no coinciden</p>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || password !== confirmPassword || password.length < 6}
                data-testid="reset-submit-btn"
              >
                {loading ? 'Guardando...' : 'Restablecer Contraseña'}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <Link 
            to="/login" 
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </Card>
    </div>
  );
}
