"""
Utilidades de criptografía para el backend FE
- Encriptación/desencriptación de contraseñas de certificados
- Hashing
"""
import os
import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

# Obtener clave de encriptación del entorno
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "fe-encryption-key-32-bytes-here!")

def get_fernet_key(key: str) -> bytes:
    """
    Deriva una clave Fernet válida desde una clave string
    """
    # Usar PBKDF2 para derivar clave de 32 bytes
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'fe_salt_constant_2026',  # Salt fijo para consistencia
        iterations=100000,
        backend=default_backend()
    )
    key_bytes = kdf.derive(key.encode())
    return base64.urlsafe_b64encode(key_bytes)

def encrypt_password(password: str, key: str = None) -> str:
    """
    Encripta una contraseña usando Fernet
    
    Args:
        password: Contraseña a encriptar
        key: Clave de encriptación (usa ENCRYPTION_KEY por defecto)
    
    Returns:
        str: Contraseña encriptada en Base64
    """
    if key is None:
        key = ENCRYPTION_KEY
    
    fernet_key = get_fernet_key(key)
    f = Fernet(fernet_key)
    encrypted = f.encrypt(password.encode())
    return encrypted.decode()

def decrypt_password(encrypted_password: str, key: str = None) -> str:
    """
    Desencripta una contraseña
    
    Args:
        encrypted_password: Contraseña encriptada
        key: Clave de encriptación
    
    Returns:
        str: Contraseña original
    """
    if key is None:
        key = ENCRYPTION_KEY
    
    fernet_key = get_fernet_key(key)
    f = Fernet(fernet_key)
    decrypted = f.decrypt(encrypted_password.encode())
    return decrypted.decode()

def hash_data(data: str) -> str:
    """
    Genera hash SHA256 de datos
    """
    return hashlib.sha256(data.encode()).hexdigest()

def generate_random_key(length: int = 32) -> str:
    """
    Genera una clave aleatoria segura
    """
    return base64.urlsafe_b64encode(os.urandom(length)).decode()[:length]
