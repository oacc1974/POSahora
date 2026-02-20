import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, ArrowLeft, CheckCircle, Store } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setSent(true);
      toast.success('Revisa tu correo electrónico');
    } catch (error) {
      // Siempre mostrar éxito por seguridad
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
            <Store size={32} className="text-white" />
          </div>
        </div>

        {!sent ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900">¿Olvidaste tu contraseña?</h1>
              <p className="text-slate-600 mt-2">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative mt-1">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="pl-10"
                    data-testid="forgot-email-input"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                data-testid="forgot-submit-btn"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Revisa tu correo!</h2>
            <p className="text-slate-600 mb-6">
              Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              El enlace expirará en 1 hora. Revisa también tu carpeta de spam.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSent(false)}
              className="w-full"
            >
              Enviar otro enlace
            </Button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft size={16} />
            Volver al inicio de sesión
          </Link>
        </div>
      </Card>
    </div>
  );
}
