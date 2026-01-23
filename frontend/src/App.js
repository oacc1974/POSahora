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
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
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
        localStorage.setItem('user', JSON.stringify(userData));
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
      localStorage.setItem('token', token);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    try {
      const response = await axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      const fullUserData = response.data;
      localStorage.setItem('user', JSON.stringify(fullUserData));
      setUser(fullUserData);
    } catch (error) {
      console.log('Error al obtener datos completos del usuario');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
