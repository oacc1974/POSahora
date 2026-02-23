# Admin FE - Facturación Electrónica

Panel de administración para gestión de empresas, usuarios e integraciones.

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación

```bash
cd admin-fe
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

## Build

```bash
npm run build
```

## Configuración

Crear archivo `.env`:

```env
VITE_API_URL=http://localhost:8003
```

## Estructura

```
src/
├── components/
│   ├── layout/      # Layout, Sidebar, Header
│   └── ui/          # Componentes shadcn/ui
├── pages/
│   ├── auth/        # Login
│   ├── dashboard/   # Dashboard
│   ├── empresas/    # Gestión empresas
│   ├── usuarios/    # Gestión usuarios
│   └── integraciones/ # Integraciones
├── stores/          # Zustand stores
├── lib/             # Utilidades, API client
└── App.tsx          # Rutas principales
```

## Credenciales por defecto

- Email: `admin@admin.com`
- Password: `admin123`

(Crear con `python scripts/create_admin.py` en backend-admin)
