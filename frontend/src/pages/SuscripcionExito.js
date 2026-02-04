import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Crown } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuscripcionExito() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking');
  const [result, setResult] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  
  const sessionId = searchParams.get('session_id');
  const token = sessionStorage.getItem('token');
  const maxPolls = 5;
  
  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setResult({ message: 'No se encontró la sesión de pago' });
      return;
    }
    
    checkPaymentStatus();
  }, [sessionId]);
  
  useEffect(() => {
    // Polling cada 2 segundos si aún está en proceso
    if (status === 'checking' && pollCount < maxPolls && pollCount > 0) {
      const timer = setTimeout(() => {
        checkPaymentStatus();
      }, 2000);
      return () => clearTimeout(timer);
    }
    
    // Si llegamos al máximo de intentos y sigue pendiente
    if (status === 'checking' && pollCount >= maxPolls) {
      setStatus('pending');
      setResult({ message: 'El pago está siendo procesado. Te notificaremos cuando se complete.' });
    }
  }, [pollCount, status]);
  
  const checkPaymentStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/suscripcion/estado/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      
      if (data.payment_status === 'paid') {
        setStatus('success');
        setResult(data);
      } else if (data.status === 'expired') {
        setStatus('expired');
        setResult(data);
      } else {
        // Continuar polling
        setPollCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error verificando pago:', error);
      setStatus('error');
      setResult({ message: 'Error al verificar el estado del pago' });
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verificando tu pago...</h2>
            <p className="text-muted-foreground">Por favor espera un momento</p>
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">¡Pago Exitoso!</h2>
            <p className="text-muted-foreground mb-6">{result?.message}</p>
            
            {result?.plan_id && (
              <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-6">
                <Crown className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Plan actualizado</span>
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate('/mi-plan')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ver Mi Plan
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Ir al Dashboard
              </Button>
            </div>
          </div>
        );
        
      case 'expired':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-amber-600 mb-2">Sesión Expirada</h2>
            <p className="text-muted-foreground mb-6">{result?.message}</p>
            
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate('/mi-plan')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Mi Plan
              </Button>
              <Button onClick={() => navigate('/mi-plan')}>
                Intentar de Nuevo
              </Button>
            </div>
          </div>
        );
        
      case 'pending':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-blue-600 mb-2">Pago en Proceso</h2>
            <p className="text-muted-foreground mb-6">{result?.message}</p>
            
            <Button variant="outline" onClick={() => navigate('/mi-plan')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Mi Plan
            </Button>
          </div>
        );
        
      case 'error':
      default:
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">{result?.message}</p>
            
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate('/mi-plan')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Mi Plan
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
