import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Toaster } from '@/components/ui/toaster'

import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import EmpresasPage from '@/pages/empresas/EmpresasPage'
import EmpresaDetailPage from '@/pages/empresas/EmpresaDetailPage'
import UsuariosPage from '@/pages/usuarios/UsuariosPage'
import IntegracionesPage from '@/pages/integraciones/IntegracionesPage'
import Layout from '@/components/layout/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="empresas" element={<EmpresasPage />} />
          <Route path="empresas/:tenantId" element={<EmpresaDetailPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="integraciones" element={<IntegracionesPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
