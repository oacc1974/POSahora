"""
Servicio de Secuenciales Atómicos para documentos electrónicos
Usa MongoDB $inc para garantizar unicidad incluso con alta concurrencia
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

async def get_next_sequential(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    store_code: str,
    emission_point: str,
    doc_type: str
) -> int:
    """
    Obtiene el siguiente número secuencial de forma atómica.
    Usa findOneAndUpdate con $inc para garantizar unicidad.
    
    Args:
        db: Base de datos MongoDB
        tenant_id: ID del tenant
        store_code: Código de establecimiento (ej: "001")
        emission_point: Punto de emisión (ej: "001")
        doc_type: Tipo de documento (ej: "01" para factura)
    
    Returns:
        int: Siguiente número secuencial
    """
    result = await db.counters.find_one_and_update(
        {
            "tenant_id": tenant_id,
            "store_code": store_code,
            "emission_point": emission_point,
            "doc_type": doc_type
        },
        {
            "$inc": {"sequence": 1},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        },
        upsert=True,
        return_document=True  # Devuelve el documento actualizado
    )
    
    return result["sequence"]

def format_doc_number(store_code: str, emission_point: str, sequential: int) -> str:
    """
    Formatea el número de documento según estándar SRI
    Formato: EEE-PPP-SSSSSSSSS
    
    Args:
        store_code: Código establecimiento (3 dígitos)
        emission_point: Punto emisión (3 dígitos)
        sequential: Número secuencial
    
    Returns:
        str: Número formateado (ej: "001-001-000000001")
    """
    return f"{store_code.zfill(3)}-{emission_point.zfill(3)}-{str(sequential).zfill(9)}"

async def get_current_sequential(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    store_code: str,
    emission_point: str,
    doc_type: str
) -> int:
    """
    Obtiene el secuencial actual sin incrementarlo (para consulta)
    """
    counter = await db.counters.find_one({
        "tenant_id": tenant_id,
        "store_code": store_code,
        "emission_point": emission_point,
        "doc_type": doc_type
    })
    
    return counter["sequence"] if counter else 0

async def set_sequential(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    store_code: str,
    emission_point: str,
    doc_type: str,
    value: int
) -> bool:
    """
    Establece manualmente un valor de secuencial (solo para migración/corrección)
    ADVERTENCIA: Usar con cuidado, puede causar duplicados si se usa incorrectamente
    """
    result = await db.counters.update_one(
        {
            "tenant_id": tenant_id,
            "store_code": store_code,
            "emission_point": emission_point,
            "doc_type": doc_type
        },
        {
            "$set": {
                "sequence": value,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return result.modified_count > 0 or result.upserted_id is not None
