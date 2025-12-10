# Guía: Sistema de Código de Tienda POS

## 🎯 ¿Qué es el Código de Tienda?

El **Código de Tienda** es un identificador único de 9 caracteres (formato: `XXXX-####`) que permite a los empleados acceder al sistema POS sin necesidad de conocer la organización completa.

**Ejemplo:** `ADMI-7005`, `GOLM-2024`, `BOUT-3847`

---

## 📋 ¿Dónde Ver el Código?

### **Opción 1: Dashboard** (Para Propietarios)
1. Inicia sesión como propietario
2. En el **Dashboard**, esquina superior derecha
3. Verás una tarjeta con:
   - "Código de Tienda POS"
   - Tu código (ej: `ADMI-7005`)
   - Botón "Copiar"

### **Opción 2: Configuración** ⭐ **RECOMENDADO**
1. Inicia sesión como propietario
2. Ve a **Configuración** (menú lateral)
3. En la parte superior verás una tarjeta destacada:
   - **"Código de Tienda POS"**
   - Tu código en grande (ej: `ADMI-7005`)
   - Botón "Copiar"
   - Instrucciones claras

---

## 🔑 ¿Cómo Usan el Código los Empleados?

### Paso 1: Obtener Credenciales del Propietario
El propietario debe proporcionar al empleado:
- ✅ **Código de Tienda** (ej: `ADMI-7005`)
- ✅ **Usuario** del empleado (ej: `cajero`)
- ✅ **Contraseña** del empleado

### Paso 2: Acceso desde Login POS
1. Ir a la página principal de login
2. Click en **"Login POS"** (botón en esquina superior derecha)
3. Llenar el formulario:
   ```
   Código de Tienda: ADMI-7005
   Usuario: cajero
   Contraseña: ********
   ```
4. Click en **"Iniciar Sesión POS"**
5. ✅ **Acceso al sistema completo**

---

## 👥 Flujo Completo: Propietario → Empleado

### **Para el Propietario:**

**1. Crear Empleado**
- Ir a **Empleados** → **Crear Usuario**
- Llenar datos:
  - Nombre: Juan Pérez
  - Usuario: juan
  - Contraseña: (elegir una segura)
  - Rol: Cajero o Administrador

**2. Obtener Código de Tienda**
- Ir a **Configuración**
- Ver código en la tarjeta superior
- Click en **"Copiar"**

**3. Compartir con Empleado**
Enviar al empleado:
```
Código de Tienda: ADMI-7005
Usuario: juan
Contraseña: (la que creaste)
```

### **Para el Empleado:**

**1. Acceder a Login POS**
- Ir a: https://tuapp.com
- Click en botón **"Login POS"** (esquina)

**2. Ingresar Credenciales**
- Código: ADMI-7005
- Usuario: juan
- Contraseña: ********

**3. ¡Listo!**
- Acceso completo al POS
- Puede vender, ver inventario, etc.

---

## 🔒 Seguridad

### **Ventajas del Sistema de Código:**
1. ✅ **Aislamiento por tienda:** Cada tienda tiene su código único
2. ✅ **No necesitan email:** Los empleados usan username simple
3. ✅ **Control del propietario:** Solo el propietario ve el código
4. ✅ **Fácil de compartir:** Un código corto y memorable

### **Buenas Prácticas:**
- ⚠️ No compartir el código públicamente
- ⚠️ Cambiar contraseñas de empleados periódicamente
- ⚠️ Revocar acceso eliminando al empleado del sistema
- ✅ Usar contraseñas diferentes para cada empleado

---

## 📊 Códigos Actuales

**Organizaciones existentes con códigos:**
| Organización              | Código      |
|---------------------------|-------------|
| Administración Principal  | ADMI-7005   |
| 1ra tienda                | 1RAT-1017   |
| 1RA TIENDA                | 1RAT-6A02   |

**Nuevas organizaciones:**
- Se genera código automáticamente al registrarse

---

## 🎯 Ejemplos Prácticos

### Ejemplo 1: Tienda de Ropa
```
Propietario: María López
Tienda: "Boutique Elegante"
Código Generado: BOUT-8472

Empleados:
1. Usuario: ana
   Rol: Cajero
   
2. Usuario: carlos
   Rol: Administrador

Para que Ana acceda:
- Código: BOUT-8472
- Usuario: ana
- Password: (su contraseña)
```

### Ejemplo 2: Ferretería
```
Propietario: Juan Pérez
Tienda: "Ferretería Central"
Código Generado: FERR-2891

Empleados:
1. Usuario: pedro
   Rol: Cajero
   
Para que Pedro acceda:
- Código: FERR-2891
- Usuario: pedro
- Password: (su contraseña)
```

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo cambiar mi código de tienda?**
R: No, el código es único y permanente para evitar confusiones.

**P: ¿Qué pasa si olvido mi código?**
R: Ve a Configuración y lo verás en la parte superior.

**P: ¿Los empleados pueden ver el código?**
R: No, solo el propietario puede verlo. Los empleados lo reciben del propietario.

**P: ¿Puedo usar el mismo usuario en el Login POS y Login Principal?**
R: Login Principal es SOLO para propietarios. Login POS es para empleados.

**P: ¿El código es sensible a mayúsculas/minúsculas?**
R: No, puedes escribirlo en mayúsculas o minúsculas.

---

## ✅ Resumen

**Sistema de Código de Tienda:**
- ✅ Formato: `XXXX-####` (ej: `ADMI-7005`)
- ✅ Visible en: Dashboard y Configuración (solo propietarios)
- ✅ Uso: Login POS para empleados
- ✅ Generación: Automática al registrarse
- ✅ Seguridad: Único por tienda

**Flujo Simple:**
1. Propietario crea empleado
2. Propietario comparte código + credenciales
3. Empleado usa Login POS
4. ✅ Empleado accede al sistema

🎉 **Sistema Listo para Usar**
