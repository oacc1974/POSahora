"""
Rutas de Health Check y Monitoreo
"""
from fastapi import APIRouter, Request
from datetime import datetime, timezone

router = APIRouter(tags=["Health"])

@router.get("/fe/health")
async def health_check(request: Request):
    """
    Verifica el estado del servicio
    """
    db_status = "disconnected"
    
    try:
        db = request.app.state.db
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": "backend-fe",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }
