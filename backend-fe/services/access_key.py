"""
Generador de Clave de Acceso (49 dígitos) según especificación SRI Ecuador
Formato: DDMMAAAATTTRRRRRRRRRRRRRAAAMEEEPPPSSSSSSSSSC

DD: Día emisión (2 dígitos)
MM: Mes emisión (2 dígitos)  
AAAA: Año emisión (4 dígitos)
TTT: Tipo comprobante (2 dígitos)
RRRRRRRRRRRRRR: RUC emisor (13 dígitos)
AAA: Ambiente (1=Pruebas, 2=Producción) + serie (001) - usar como "A" (1 dígito)
M: Modalidad de emisión (1=Normal)
EEE: Establecimiento (3 dígitos)
PPP: Punto de emisión (3 dígitos)  
SSSSSSSSS: Secuencial (9 dígitos)
C: Dígito verificador módulo 11
"""
from datetime import datetime

def calculate_mod11(access_key_without_check: str) -> int:
    """
    Calcula el dígito verificador usando módulo 11
    Pesos: 2,3,4,5,6,7 de derecha a izquierda, cíclico
    """
    weights = [2, 3, 4, 5, 6, 7]
    total = 0
    
    # Recorrer de derecha a izquierda
    reversed_key = access_key_without_check[::-1]
    
    for i, digit in enumerate(reversed_key):
        weight = weights[i % 6]
        total += int(digit) * weight
    
    remainder = total % 11
    check_digit = 11 - remainder
    
    # Si el resultado es 11, el dígito es 0
    # Si el resultado es 10, el dígito es 1
    if check_digit == 11:
        return 0
    elif check_digit == 10:
        return 1
    else:
        return check_digit

def generate_access_key(
    issue_date: datetime,
    doc_type: str,  # "01" factura, "04" NC, etc.
    ruc: str,
    ambiente: str,  # "pruebas" o "produccion"
    establecimiento: str,  # "001"
    punto_emision: str,  # "001"
    secuencial: int,
    tipo_emision: str = "1"  # 1=Normal
) -> str:
    """
    Genera la clave de acceso de 49 dígitos para documentos electrónicos SRI
    """
    # Formatear fecha
    day = str(issue_date.day).zfill(2)
    month = str(issue_date.month).zfill(2)
    year = str(issue_date.year)
    
    # Tipo de comprobante (2 dígitos)
    tipo_comprobante = doc_type.zfill(2)
    
    # RUC (13 dígitos)
    ruc_formatted = ruc.zfill(13)
    
    # Ambiente (1=Pruebas, 2=Producción)
    ambiente_code = "1" if ambiente == "pruebas" else "2"
    
    # Establecimiento y punto emisión (3 dígitos cada uno)
    estab = establecimiento.zfill(3)
    pto_emi = punto_emision.zfill(3)
    
    # Secuencial (9 dígitos)
    seq = str(secuencial).zfill(9)
    
    # Código numérico (8 dígitos) - usamos timestamp para unicidad
    codigo_numerico = str(int(issue_date.timestamp()) % 100000000).zfill(8)
    
    # Tipo emisión
    tipo_emi = tipo_emision
    
    # Construir clave sin dígito verificador (48 dígitos)
    # Formato oficial SRI:
    # DDMMAAAA + TT + RRRRRRRRRRRRRR + A + EEE + PPP + SSSSSSSSS + CCCCCCCC + T
    access_key_48 = (
        f"{day}{month}{year}"      # 8 dígitos: fecha
        f"{tipo_comprobante}"       # 2 dígitos: tipo doc
        f"{ruc_formatted}"          # 13 dígitos: RUC
        f"{ambiente_code}"          # 1 dígito: ambiente
        f"{estab}"                  # 3 dígitos: establecimiento
        f"{pto_emi}"                # 3 dígitos: punto emisión
        f"{seq}"                    # 9 dígitos: secuencial
        f"{codigo_numerico}"        # 8 dígitos: código numérico
        f"{tipo_emi}"               # 1 dígito: tipo emisión
    )
    
    # Verificar longitud
    if len(access_key_48) != 48:
        raise ValueError(f"Clave de acceso debe tener 48 dígitos antes del verificador, tiene {len(access_key_48)}")
    
    # Calcular dígito verificador
    check_digit = calculate_mod11(access_key_48)
    
    # Clave completa (49 dígitos)
    access_key = f"{access_key_48}{check_digit}"
    
    return access_key

def validate_access_key(access_key: str) -> bool:
    """
    Valida que una clave de acceso tenga el formato correcto y dígito verificador válido
    """
    if len(access_key) != 49:
        return False
    
    if not access_key.isdigit():
        return False
    
    # Verificar dígito verificador
    key_48 = access_key[:48]
    check_digit = int(access_key[48])
    calculated = calculate_mod11(key_48)
    
    return check_digit == calculated

def parse_access_key(access_key: str) -> dict:
    """
    Parsea una clave de acceso y extrae sus componentes
    """
    if len(access_key) != 49:
        raise ValueError("Clave de acceso debe tener 49 dígitos")
    
    return {
        "fecha": f"{access_key[0:2]}/{access_key[2:4]}/{access_key[4:8]}",
        "tipo_comprobante": access_key[8:10],
        "ruc": access_key[10:23],
        "ambiente": "pruebas" if access_key[23] == "1" else "produccion",
        "establecimiento": access_key[24:27],
        "punto_emision": access_key[27:30],
        "secuencial": access_key[30:39],
        "codigo_numerico": access_key[39:47],
        "tipo_emision": access_key[47],
        "digito_verificador": access_key[48]
    }
