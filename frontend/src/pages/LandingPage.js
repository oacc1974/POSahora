import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Check, X, Zap, Shield, BarChart3, Store, Users, Receipt, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LandingPage() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/planes`);
        setPlanes(response.data);
      } catch (error) {
        console.error('Error al cargar planes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanes();
  }, []);

  const formatLimite = (limite) => {
    if (limite === -1) return 'Ilimitado';
    return limite.toLocaleString();
  };

  const features = [
    { icon: Store, title: 'Multi-Tienda', desc: 'Gestiona múltiples sucursales desde un solo lugar' },
    { icon: Users, title: 'Control de Empleados', desc: 'Roles y permisos personalizados para tu equipo' },
    { icon: Receipt, title: 'Facturación Electrónica', desc: 'Cumple con las normativas del SRI Ecuador' },
    { icon: BarChart3, title: 'Reportes Avanzados', desc: 'Analiza las ventas y toma mejores decisiones' },
    { icon: Shield, title: 'Seguro y Confiable', desc: 'Tus datos están protegidos en la nube' },
    { icon: Zap, title: 'Rápido y Fácil', desc: 'Interfaz intuitiva, sin curva de aprendizaje' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">POS Ahora</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-slate-300 hover:text-white"
              onClick={() => navigate('/login')}
            >
              Iniciar Sesión
            </Button>
            <Button 
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => navigate('/register')}
            >
              Comenzar Gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
            Sistema POS para Ecuador
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            El Punto de Venta que tu negocio necesita
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Gestiona ventas, inventario, empleados y facturación electrónica SRI desde cualquier dispositivo. 
            Empieza gratis, crece sin límites.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-blue-500 hover:bg-blue-600 text-lg px-8"
              onClick={() => navigate('/register')}
            >
              Comenzar Gratis <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg border-slate-600 text-slate-300 hover:bg-slate-800"
              onClick={() => document.getElementById('precios').scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Precios
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Todo lo que necesitas para vender más
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
                <CardContent className="p-6">
                  <feature.icon className="w-10 h-10 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Planes para cada tipo de negocio
            </h2>
            <p className="text-slate-400">
              Elige el plan que mejor se adapte a tus necesidades. Sin contratos, cancela cuando quieras.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {planes.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative bg-slate-800/50 border-slate-700 flex flex-col ${
                    plan.destacado ? 'border-blue-500 ring-2 ring-blue-500/20' : ''
                  }`}
                >
                  {plan.destacado && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white">Más Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-white">{plan.nombre}</CardTitle>
                    <CardDescription className="text-slate-400">{plan.descripcion}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pt-4">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold text-white">${plan.precio}</span>
                      <span className="text-slate-400">/{plan.periodo}</span>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>{formatLimite(plan.limite_facturas)} facturas/mes</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>{formatLimite(plan.limite_usuarios)} usuarios</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>{formatLimite(plan.limite_productos)} productos</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>{formatLimite(plan.limite_tpv)} puntos de venta</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>{formatLimite(plan.limite_clientes)} clientes</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>{plan.dias_historial === -1 ? 'Historial ilimitado' : `${plan.dias_historial} días de historial`}</span>
                      </li>
                      
                      {/* Funciones */}
                      <li className="border-t border-slate-700 pt-3 mt-3"></li>
                      {Object.entries(plan.funciones).map(([key, value]) => (
                        <li key={key} className={`flex items-center gap-2 ${value ? 'text-slate-300' : 'text-slate-500'}`}>
                          {value ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-slate-600" />
                          )}
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button 
                      className={`w-full ${
                        plan.destacado 
                          ? 'bg-blue-500 hover:bg-blue-600' 
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                      onClick={() => navigate('/register')}
                    >
                      {plan.precio === 0 ? 'Comenzar Gratis' : 'Seleccionar Plan'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para hacer crecer tu negocio?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Únete a cientos de negocios en Ecuador que ya confían en POS Ahora
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            onClick={() => navigate('/register')}
          >
            Crear Cuenta Gratis <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">POS Ahora</span>
            </div>
            <div className="flex gap-6 text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Contacto</a>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 POS Ahora. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
