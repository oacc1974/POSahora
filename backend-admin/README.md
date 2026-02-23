# Backend Admin - Facturación Electrónica

Microservicio de administración para gestión de usuarios, empresas e integraciones.

## Requisitos

- Python 3.10+
- MongoDB

## Instalación

```bash
cd backend-admin
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Variables de Entorno

Crear archivo `.env`:

```env
MONGO_URL=mongodb://localhost:27017
ADMIN_DB_NAME=admin_db
FE_DB_NAME=fe_db
JWT_SECRET_KEY=tu-clave-secreta-aqui
ENCRYPTION_KEY=fe-encryption-key-32-bytes-here!
```

## Ejecución

```bash
python server.py
# o
uvicorn server:app --host 0.0.0.0 --port 8003 --reload
```

## API Docs

- Swagger: http://localhost:8003/admin/docs
- ReDoc: http://localhost:8003/admin/redoc

## Crear Usuario Admin Inicial

```bash
python scripts/create_admin.py
```

## Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/auth/login` | POST | Login |
| `/auth/me` | GET | Usuario actual |
| `/users` | GET/POST | Gestión usuarios |
| `/empresas` | GET/POST | Gestión empresas |
| `/integrations/loyverse/{tenant_id}` | POST | Configurar Loyverse |
| `/dashboard` | GET | Métricas |
