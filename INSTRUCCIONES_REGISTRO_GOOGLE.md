# Instrucciones: Registro con Google

## 🔐 Flujo de Registro con Google (ACTUALIZADO)

### ✅ Cómo Funciona Ahora:

1. **Usuario hace clic en "Continuar con Google"** en la página de Login o Register
2. **Es redirigido a Google** para autenticarse
3. **Google devuelve a la app** con un session_id
4. **El sistema solicita OBLIGATORIAMENTE el nombre de la tienda**
5. **Usuario ingresa el nombre** (ej: "Mi Tienda", "Boutique Elegante", etc.)
6. **Sistema crea:**
   - Nueva organización con el nombre proporcionado
   - Nuevo usuario como propietario
   - Configuración inicial del negocio
7. **Usuario es redirigido al dashboard** automáticamente

---

## 🎯 Cambios Implementados:

### ❌ ANTES (Problema):
- Google Auth creaba automáticamente la organización como "Tienda de [Nombre Usuario]"
- NO pedía confirmación al usuario
- Usuario no podía personalizar el nombre

### ✅ AHORA (Solución):
- **SIEMPRE pide el nombre de la tienda** cuando es un nuevo usuario
- Pantalla intermedia clara con el campo "Nombre de la Tienda"
- Usuario tiene control total del nombre de su organización

---

## 📝 Ejemplo de Flujo:

```
1. Usuario: Hace clic en "Continuar con Google"
   ↓
2. Google: Autentica al usuario
   ↓
3. Sistema: "¡Bienvenido! Para completar tu registro, ingresa el nombre de tu tienda"
   ↓
4. Usuario: Ingresa "Boutique Elegante"
   ↓
5. Sistema: Crea organización "Boutique Elegante" + usuario propietario
   ↓
6. Usuario: Redirigido al dashboard de "Boutique Elegante"
```

---

## 🔧 Configuración Técnica:

### Backend (`/api/auth/session`):
- Ahora **requiere obligatoriamente** el campo `nombre_tienda` para nuevos usuarios
- Si no se proporciona, devuelve error 400: "Se requiere el nombre de la tienda"
- Usuario existente: NO pide nombre (usa su organización actual)

### Frontend (`AuthCallback.js`):
- Detecta si el usuario es nuevo (error 400)
- Muestra pantalla intermedia para capturar nombre de tienda
- Envía nombre al backend
- Redirige al dashboard con refresh automático

---

## 🧪 Testing:

Para probar el flujo completo:

1. Cierra sesión (si estás logueado)
2. Ve a la página de Login
3. Haz clic en "Continuar con Google"
4. Autentica con Google
5. **VERIFICA:** Debe aparecer pantalla pidiendo "Nombre de la Tienda"
6. Ingresa un nombre personalizado
7. **VERIFICA:** Eres redirigido al dashboard
8. **VERIFICA:** En el panel de organizaciones (admin) aparece con el nombre correcto

---

## ⚠️ Notas Importantes:

1. **Usuarios existentes con Google:** Si ya se registraron antes, NO verán la pantalla de nombre de tienda (usarán su organización actual)
2. **Primer registro:** SIEMPRE pedirá el nombre
3. **Nombre puede ser cualquiera:** "Mi Tienda", "Boutique María", "Ferretería Central", etc.

---

## 🎉 Beneficios:

- ✅ Control total del nombre de la organización
- ✅ Experiencia de usuario clara
- ✅ No más nombres genéricos como "Tienda de Oscar Castro"
- ✅ Consistencia con el registro manual
