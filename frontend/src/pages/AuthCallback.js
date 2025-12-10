import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const processSession = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error('No se encontró ID de sesión');
        navigate('/login');
        return;
      }

      try {
        const response = await axios.post(
          `${API_URL}/api/auth/session`,
          {},
          {
            headers: { 'X-Session-ID': sessionId },
            withCredentials: true
          }
        );

        const user = response.data.user;
        localStorage.setItem('user', JSON.stringify(user));
        
        sessionStorage.setItem('just_authenticated', 'true');
        
        navigate('/dashboard', { replace: true, state: { user } });
      } catch (error) {
        console.error('Error al procesar sesión:', error);
        toast.error('Error al iniciar sesión con Google');
        navigate('/login');
      }
    };

    processSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Procesando autenticación...</p>
      </div>
    </div>
  );
}
