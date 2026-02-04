import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import LoginPOS from './pages/LoginPOS';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import GoogleCallback from './pages/GoogleCallback';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import POS from './pages/POS';
import Facturas from './pages/Facturas';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';
import Caja from './pages/Caja';
import Clientes from './pages/Clientes';
import Organizaciones from './pages/Organizaciones';
import Reportes from './pages/Reportes';
import Layout from './components/Layout';
import { Toaster } from './components/ui/sonner';
import axios from 'axios';
import './App.css';

// Importar páginas de Facturación Electrónica
import ConfiguracionFE from './pages/fe/ConfiguracionFE';
import DocumentosElectronicos from './pages/fe/DocumentosElectronicos';
import NotasCredito from './pages/fe/NotasCredito';

// Importar páginas de Planes y Super Admin
import LandingPage from './pages/LandingPage';
import SuperAdminPanel from './pages/SuperAdminPanel';
import MiPlan from './pages/MiPlan';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function AuthChecker() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return <AppRouter />;
}

function AppRouter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Usar sessionStorage para sesiones independientes por pestaña
      const token = sessionStorage.getItem('token');
      const userData = sessionStorage.getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/me`, {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        const userData = response.data;
        sessionStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } catch (error) {
        console.log('No hay sesión activa');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (userData, token) => {
    if (token) {
      sessionStorage.setItem('token', token);
    }
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    try {
      const response = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      const fullUserData = response.data;
      sessionStorage.setItem('user', JSON.stringify(fullUserData));
      setUser(fullUserData);
    } catch (error) {
      console.log('Error al obtener datos completos del usuario');
    }
  };

  const handleLogout = async () => {
    const token = sessionStorage.getItem('token');
    try {
      // Cerrar sesión POS primero (si existe)
      if (token) {
        await axios.post(`${API_URL}/api/auth/logout-pos`, {}, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
      }
      // Luego cerrar sesión general
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('pos_session_id');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              ['cajero', 'mesero'].includes(user.rol) ? 
                <Navigate to="/pos" replace /> : 
                <Navigate to="/dashboard" replace />
            ) : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/login-pos"
          element={
            user ? (
              ['cajero', 'mesero'].includes(user.rol) ? 
                <Navigate to="/pos" replace /> : 
                <Navigate to="/dashboard" replace />
            ) : <LoginPOS onLogin={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Register />
          }
        />
        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />
        <Route
          path="/auth/google/callback"
          element={<GoogleCallback />}
        />
        <Route
          path="/"
          element={
            user ? (
              ['cajero', 'mesero'].includes(user.rol) ? 
                <Navigate to="/pos" replace /> : 
                <Navigate to="/dashboard" replace />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              ['cajero', 'mesero'].includes(user.rol) ? (
                <Navigate to="/pos" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <Dashboard />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/productos"
          element={
            user && ['propietario', 'administrador'].includes(user.rol) ? (
              <Layout user={user} onLogout={handleLogout}>
                <Productos />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/pos"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout} hideSidebar={true}>
                <POS />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/facturas"
          element={
            user ? (
              ['cajero', 'mesero'].includes(user.rol) ? (
                <Navigate to="/pos" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <Facturas />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/reportes"
          element={
            user ? (
              ['cajero', 'mesero'].includes(user.rol) ? (
                <Navigate to="/pos" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <Reportes />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/usuarios"
          element={
            user && user.rol === 'propietario' ? (
              <Layout user={user} onLogout={handleLogout}>
                <Usuarios />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/configuracion"
          element={
            user && user.rol === 'propietario' ? (
              <Layout user={user} onLogout={handleLogout}>
                <Configuracion />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/configuracion/:seccion"
          element={
            user && user.rol === 'propietario' ? (
              <Layout user={user} onLogout={handleLogout}>
                <Configuracion />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/caja"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout} hideSidebar={['cajero', 'mesero'].includes(user.rol)}>
                <Caja onLogout={handleLogout} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/clientes"
          element={
            user ? (
              ['cajero', 'mesero'].includes(user.rol) ? (
                <Navigate to="/pos" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <Clientes />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/organizaciones"
          element={
            user && user.id === 'admin' ? (
              <Layout user={user} onLogout={handleLogout}>
                <Organizaciones />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        {/* Rutas de Facturación Electrónica */}
        <Route
          path="/configuracion/facturacion"
          element={
            user && user.rol === 'propietario' ? (
              <Layout user={user} onLogout={handleLogout}>
                <ConfiguracionFE />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/documentos-electronicos"
          element={
            user && ['propietario', 'administrador'].includes(user.rol) ? (
              <Layout user={user} onLogout={handleLogout}>
                <DocumentosElectronicos />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/notas-credito"
          element={
            user && ['propietario', 'administrador'].includes(user.rol) ? (
              <Layout user={user} onLogout={handleLogout}>
                <NotasCredito />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        {/* Rutas de Planes y Super Admin */}
        <Route
          path="/landing"
          element={<LandingPage />}
        />
        <Route
          path="/superadmin"
          element={
            user && user.id === 'admin' ? (
              <Layout user={user} onLogout={handleLogout}>
                <SuperAdminPanel />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/mi-plan"
          element={
            user && user.rol === 'propietario' ? (
              <Layout user={user} onLogout={handleLogout}>
                <MiPlan />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthChecker />
    </BrowserRouter>
  );
}

export default App;
