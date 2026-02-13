#!/bin/bash
# start.sh - Inicia ambos backends para Render

# Iniciar backend-fe en background
echo "🚀 Iniciando Backend FE en puerto 8002..."
cd /app/backend-fe
uvicorn server:app --host 0.0.0.0 --port 8002 &

# Esperar a que inicie
sleep 3

# Iniciar backend principal
echo "🚀 Iniciando Backend POS en puerto ${PORT:-8001}..."
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}
