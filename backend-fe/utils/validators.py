"""
Validadores para datos fiscales SRI Ecuador
"""
import re
from typing import Tuple

def validate_ruc(ruc: str) -> Tuple[bool, str]:
    """
    Valida RUC ecuatoriano (13 dígitos)
    """
    if not ruc:
        return False, "RUC es requerido"
    
    if not ruc.isdigit():
        return False, "RUC debe contener solo números"
    
    if len(ruc) != 13:
        return False, "RUC debe tener 13 dígitos"
    
    # Los últimos 3 dígitos deben ser 001
    if not ruc.endswith("001"):
        return False, "RUC debe terminar en 001"
    
    # Validar provincia (primeros 2 dígitos entre 01 y 24 o 30)
    provincia = int(ruc[:2])
    if provincia < 1 or (provincia > 24 and provincia != 30):
        return False, "Código de provincia inválido"
    
    return True, "RUC válido"

def validate_cedula(cedula: str) -> Tuple[bool, str]:
    """
    Valida cédula ecuatoriana (10 dígitos)
    """
    if not cedula:
        return False, "Cédula es requerida"
    
    if not cedula.isdigit():
        return False, "Cédula debe contener solo números"
    
    if len(cedula) != 10:
        return False, "Cédula debe tener 10 dígitos"
    
    # Validar provincia (primeros 2 dígitos)
    provincia = int(cedula[:2])
    if provincia < 1 or provincia > 24:
        return False, "Código de provincia inválido"
    
    # Algoritmo de validación módulo 10
    coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    total = 0
    
    for i, coef in enumerate(coeficientes):
        valor = int(cedula[i]) * coef
        if valor >= 10:
            valor -= 9
        total += valor
    
    verificador = (10 - (total % 10)) % 10
    
    if verificador != int(cedula[9]):
        return False, "Dígito verificador inválido"
    
    return True, "Cédula válida"

def validate_identification(tipo: str, numero: str) -> Tuple[bool, str]:
    """
    Valida identificación según tipo
    
    Args:
        tipo: 04=RUC, 05=Cédula, 06=Pasaporte, 07=Consumidor final
        numero: Número de identificación
    """
    if tipo == "04":  # RUC
        return validate_ruc(numero)
    
    elif tipo == "05":  # Cédula
        return validate_cedula(numero)
    
    elif tipo == "06":  # Pasaporte
        if not numero or len(numero) < 3:
            return False, "Pasaporte inválido"
        return True, "Pasaporte válido"
    
    elif tipo == "07":  # Consumidor final
        if numero != "9999999999999":
            return False, "Consumidor final debe ser 9999999999999"
        return True, "Consumidor final válido"
    
    else:
        return False, f"Tipo de identificación '{tipo}' no soportado"

def validate_email(email: str) -> Tuple[bool, str]:
    """
    Valida formato de email
    """
    if not email:
        return True, "Email vacío (opcional)"
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Formato de email inválido"
    
    return True, "Email válido"

def validate_phone(phone: str) -> Tuple[bool, str]:
    """
    Valida formato de teléfono ecuatoriano
    """
    if not phone:
        return True, "Teléfono vacío (opcional)"
    
    # Remover espacios y guiones
    phone_clean = re.sub(r'[\s\-]', '', phone)
    
    # Debe tener entre 7 y 15 dígitos
    if not phone_clean.isdigit():
        return False, "Teléfono debe contener solo números"
    
    if len(phone_clean) < 7 or len(phone_clean) > 15:
        return False, "Teléfono debe tener entre 7 y 15 dígitos"
    
    return True, "Teléfono válido"

def validate_establishment_code(code: str) -> Tuple[bool, str]:
    """
    Valida código de establecimiento (3 dígitos)
    """
    if not code:
        return False, "Código de establecimiento requerido"
    
    if not code.isdigit() or len(code) != 3:
        return False, "Código debe ser 3 dígitos numéricos"
    
    if int(code) < 1:
        return False, "Código debe ser mayor a 000"
    
    return True, "Código válido"

def validate_emission_point(code: str) -> Tuple[bool, str]:
    """
    Valida punto de emisión (3 dígitos)
    """
    return validate_establishment_code(code)

def format_money(amount: float, decimals: int = 2) -> str:
    """
    Formatea cantidad monetaria
    """
    return f"{amount:,.{decimals}f}"

def clean_special_chars(text: str) -> str:
    """
    Limpia caracteres especiales no permitidos en XML
    """
    if not text:
        return ""
    
    # Caracteres permitidos: alfanuméricos, espacios, puntuación básica
    allowed = re.compile(r'[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.,\-_\(\)\/]')
    return allowed.sub('', text)
