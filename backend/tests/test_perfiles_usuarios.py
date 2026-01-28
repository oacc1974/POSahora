"""
Test suite for Perfiles (Profiles) and Usuarios (Employees) endpoints
Tests the security module for POS system employee management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecinvoice.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin*88"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["rol"] == "propietario", "Admin should be propietario"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401, "Should return 401 for invalid credentials"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestPerfiles:
    """Tests for Perfiles (Profiles) endpoints"""
    
    def test_get_perfiles_creates_defaults(self, auth_headers):
        """GET /api/perfiles - Should return list with default system profiles"""
        response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get perfiles: {response.text}"
        
        perfiles = response.json()
        assert isinstance(perfiles, list), "Response should be a list"
        assert len(perfiles) >= 6, "Should have at least 6 default profiles"
        
        # Verify default profiles exist
        nombres = [p["nombre"] for p in perfiles]
        expected_profiles = ["Propietario", "Administrador", "Cajero", "Mesero", "Supervisor", "Cocinero"]
        for expected in expected_profiles:
            assert expected in nombres, f"Default profile '{expected}' should exist"
        
        # Verify system profiles are marked correctly
        for perfil in perfiles:
            if perfil["nombre"] in expected_profiles:
                assert perfil["es_sistema"] == True, f"Profile '{perfil['nombre']}' should be marked as system"
                assert perfil["es_predeterminado"] == True, f"Profile '{perfil['nombre']}' should be marked as default"
    
    def test_get_perfil_by_id(self, auth_headers):
        """GET /api/perfiles/{id} - Should return specific profile"""
        # First get all profiles
        response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        perfiles = response.json()
        
        if perfiles:
            perfil_id = perfiles[0]["id"]
            response = requests.get(f"{BASE_URL}/api/perfiles/{perfil_id}", headers=auth_headers)
            assert response.status_code == 200, f"Failed to get perfil: {response.text}"
            
            perfil = response.json()
            assert perfil["id"] == perfil_id
            assert "nombre" in perfil
            assert "permisos_pos" in perfil
            assert "permisos_backoffice" in perfil
    
    def test_get_perfil_not_found(self, auth_headers):
        """GET /api/perfiles/{id} - Should return 404 for non-existent profile"""
        response = requests.get(f"{BASE_URL}/api/perfiles/non-existent-id", headers=auth_headers)
        assert response.status_code == 404, "Should return 404 for non-existent profile"
    
    def test_create_custom_perfil(self, auth_headers):
        """POST /api/perfiles - Should create custom profile"""
        perfil_data = {
            "nombre": f"TEST_Perfil_Custom_{uuid.uuid4().hex[:8]}",
            "descripcion": "Perfil de prueba creado por tests",
            "permisos_pos": {
                "ver_productos": True,
                "agregar_ticket": True,
                "guardar_ticket": True,
                "cobrar": True,
                "aplicar_descuentos": False
            },
            "permisos_backoffice": {
                "ver_dashboard": True,
                "ver_reportes": False,
                "gestionar_productos": False
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/perfiles", headers=auth_headers, json=perfil_data)
        assert response.status_code == 200, f"Failed to create perfil: {response.text}"
        
        perfil = response.json()
        assert perfil["nombre"] == perfil_data["nombre"]
        assert perfil["descripcion"] == perfil_data["descripcion"]
        assert perfil["es_sistema"] == False, "Custom profile should not be system"
        assert perfil["es_predeterminado"] == False, "Custom profile should not be default"
        assert perfil["permisos_pos"]["ver_productos"] == True
        assert perfil["permisos_pos"]["cobrar"] == True
        
        # Store for cleanup
        return perfil["id"]
    
    def test_update_custom_perfil(self, auth_headers):
        """PUT /api/perfiles/{id} - Should update custom profile"""
        # First create a profile
        perfil_data = {
            "nombre": f"TEST_Perfil_Update_{uuid.uuid4().hex[:8]}",
            "descripcion": "Perfil para actualizar"
        }
        create_response = requests.post(f"{BASE_URL}/api/perfiles", headers=auth_headers, json=perfil_data)
        assert create_response.status_code == 200
        perfil_id = create_response.json()["id"]
        
        # Update the profile
        update_data = {
            "nombre": f"TEST_Perfil_Updated_{uuid.uuid4().hex[:8]}",
            "descripcion": "Perfil actualizado",
            "permisos_pos": {
                "ver_productos": True,
                "cobrar": True,
                "facturar_electronico": True
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/perfiles/{perfil_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200, f"Failed to update perfil: {response.text}"
        
        updated = response.json()
        assert updated["nombre"] == update_data["nombre"]
        assert updated["descripcion"] == update_data["descripcion"]
        assert updated["permisos_pos"]["cobrar"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/perfiles/{perfil_id}", headers=auth_headers)
    
    def test_cannot_update_system_perfil(self, auth_headers):
        """PUT /api/perfiles/{id} - Should not allow updating system profiles"""
        # Get system profile
        response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        perfiles = response.json()
        
        system_perfil = next((p for p in perfiles if p["es_sistema"]), None)
        if system_perfil:
            update_data = {"nombre": "Modified Name"}
            response = requests.put(f"{BASE_URL}/api/perfiles/{system_perfil['id']}", headers=auth_headers, json=update_data)
            assert response.status_code == 403, "Should return 403 when trying to update system profile"
    
    def test_delete_custom_perfil(self, auth_headers):
        """DELETE /api/perfiles/{id} - Should delete custom profile"""
        # First create a profile
        perfil_data = {
            "nombre": f"TEST_Perfil_Delete_{uuid.uuid4().hex[:8]}",
            "descripcion": "Perfil para eliminar"
        }
        create_response = requests.post(f"{BASE_URL}/api/perfiles", headers=auth_headers, json=perfil_data)
        assert create_response.status_code == 200
        perfil_id = create_response.json()["id"]
        
        # Delete the profile
        response = requests.delete(f"{BASE_URL}/api/perfiles/{perfil_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to delete perfil: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/perfiles/{perfil_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Profile should not exist after deletion"
    
    def test_cannot_delete_system_perfil(self, auth_headers):
        """DELETE /api/perfiles/{id} - Should not allow deleting system profiles"""
        response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        perfiles = response.json()
        
        system_perfil = next((p for p in perfiles if p["es_sistema"]), None)
        if system_perfil:
            response = requests.delete(f"{BASE_URL}/api/perfiles/{system_perfil['id']}", headers=auth_headers)
            assert response.status_code == 403, "Should return 403 when trying to delete system profile"


class TestUsuarios:
    """Tests for Usuarios (Employees) endpoints"""
    
    def test_get_usuarios(self, auth_headers):
        """GET /api/usuarios - Should return list of employees with perfil_nombre"""
        response = requests.get(f"{BASE_URL}/api/usuarios", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get usuarios: {response.text}"
        
        usuarios = response.json()
        assert isinstance(usuarios, list), "Response should be a list"
        
        # Verify admin user exists
        admin = next((u for u in usuarios if u["username"] == "admin"), None)
        assert admin is not None, "Admin user should exist"
        assert admin["rol"] == "propietario"
        
        # Verify perfil_nombre is included
        for usuario in usuarios:
            assert "perfil_nombre" in usuario, "Each user should have perfil_nombre"
    
    def test_create_usuario_with_perfil(self, auth_headers):
        """POST /api/usuarios - Should create employee with perfil_id"""
        # First get a profile to assign
        perfiles_response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        perfiles = perfiles_response.json()
        cajero_perfil = next((p for p in perfiles if p["nombre"] == "Cajero"), None)
        
        usuario_data = {
            "nombre": f"TEST_Empleado_{uuid.uuid4().hex[:8]}",
            "username": f"test_user_{uuid.uuid4().hex[:8]}",
            "password": "test123456",
            "rol": "cajero",
            "perfil_id": cajero_perfil["id"] if cajero_perfil else None
        }
        
        response = requests.post(f"{BASE_URL}/api/usuarios", headers=auth_headers, json=usuario_data)
        assert response.status_code == 200, f"Failed to create usuario: {response.text}"
        
        usuario = response.json()
        assert usuario["nombre"] == usuario_data["nombre"]
        assert usuario["username"] == usuario_data["username"]
        assert usuario["rol"] == "cajero"
        assert "perfil_nombre" in usuario
        assert "id" in usuario
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/usuarios/{usuario['id']}", headers=auth_headers)
    
    def test_create_usuario_auto_assigns_perfil(self, auth_headers):
        """POST /api/usuarios - Should auto-assign system profile based on rol if no perfil_id"""
        usuario_data = {
            "nombre": f"TEST_Mesero_{uuid.uuid4().hex[:8]}",
            "username": f"test_mesero_{uuid.uuid4().hex[:8]}",
            "password": "test123456",
            "rol": "mesero"
            # No perfil_id - should auto-assign
        }
        
        response = requests.post(f"{BASE_URL}/api/usuarios", headers=auth_headers, json=usuario_data)
        assert response.status_code == 200, f"Failed to create usuario: {response.text}"
        
        usuario = response.json()
        assert usuario["rol"] == "mesero"
        assert usuario["perfil_id"] is not None, "Should auto-assign perfil_id"
        assert "perfil_nombre" in usuario
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/usuarios/{usuario['id']}", headers=auth_headers)
    
    def test_create_usuario_generates_pin_for_cajero(self, auth_headers):
        """POST /api/usuarios - Should auto-generate PIN for cajero/mesero"""
        usuario_data = {
            "nombre": f"TEST_Cajero_PIN_{uuid.uuid4().hex[:8]}",
            "username": f"test_cajero_pin_{uuid.uuid4().hex[:8]}",
            "password": "test123456",
            "rol": "cajero"
        }
        
        response = requests.post(f"{BASE_URL}/api/usuarios", headers=auth_headers, json=usuario_data)
        assert response.status_code == 200, f"Failed to create usuario: {response.text}"
        
        usuario = response.json()
        assert usuario["pin"] is not None, "Cajero should have auto-generated PIN"
        assert usuario["pin_activo"] == True, "PIN should be active for cajero"
        assert len(usuario["pin"]) == 4, "PIN should be 4 digits"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/usuarios/{usuario['id']}", headers=auth_headers)
    
    def test_update_usuario_with_perfil(self, auth_headers):
        """PUT /api/usuarios/{id} - Should update employee including perfil_id"""
        # Create a user first
        usuario_data = {
            "nombre": f"TEST_Update_User_{uuid.uuid4().hex[:8]}",
            "username": f"test_update_{uuid.uuid4().hex[:8]}",
            "password": "test123456",
            "rol": "cajero"
        }
        create_response = requests.post(f"{BASE_URL}/api/usuarios", headers=auth_headers, json=usuario_data)
        assert create_response.status_code == 200
        usuario_id = create_response.json()["id"]
        
        # Get administrador profile
        perfiles_response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        perfiles = perfiles_response.json()
        admin_perfil = next((p for p in perfiles if p["nombre"] == "Administrador"), None)
        
        # Update user
        update_data = {
            "nombre": "TEST_Updated_Name",
            "rol": "administrador",
            "perfil_id": admin_perfil["id"] if admin_perfil else None
        }
        
        response = requests.put(f"{BASE_URL}/api/usuarios/{usuario_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200, f"Failed to update usuario: {response.text}"
        
        updated = response.json()
        assert updated["nombre"] == "TEST_Updated_Name"
        assert updated["rol"] == "administrador"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/usuarios/{usuario_id}", headers=auth_headers)
    
    def test_cannot_create_propietario(self, auth_headers):
        """POST /api/usuarios - Should not allow creating propietario role"""
        usuario_data = {
            "nombre": "TEST_Propietario",
            "username": f"test_prop_{uuid.uuid4().hex[:8]}",
            "password": "test123456",
            "rol": "propietario"
        }
        
        response = requests.post(f"{BASE_URL}/api/usuarios", headers=auth_headers, json=usuario_data)
        assert response.status_code == 400, "Should not allow creating propietario"
    
    def test_delete_usuario(self, auth_headers):
        """DELETE /api/usuarios/{id} - Should delete employee"""
        # Create a user first
        usuario_data = {
            "nombre": f"TEST_Delete_User_{uuid.uuid4().hex[:8]}",
            "username": f"test_delete_{uuid.uuid4().hex[:8]}",
            "password": "test123456",
            "rol": "cajero"
        }
        create_response = requests.post(f"{BASE_URL}/api/usuarios", headers=auth_headers, json=usuario_data)
        assert create_response.status_code == 200
        usuario_id = create_response.json()["id"]
        
        # Delete user
        response = requests.delete(f"{BASE_URL}/api/usuarios/{usuario_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to delete usuario: {response.text}"
    
    def test_cannot_delete_perfil_with_users(self, auth_headers):
        """DELETE /api/perfiles/{id} - Should not delete profile with assigned users"""
        # Create a custom profile
        perfil_data = {
            "nombre": f"TEST_Perfil_With_Users_{uuid.uuid4().hex[:8]}",
            "descripcion": "Perfil con usuarios asignados"
        }
        perfil_response = requests.post(f"{BASE_URL}/api/perfiles", headers=auth_headers, json=perfil_data)
        assert perfil_response.status_code == 200
        perfil_id = perfil_response.json()["id"]
        
        # Create a user with this profile
        usuario_data = {
            "nombre": f"TEST_User_With_Perfil_{uuid.uuid4().hex[:8]}",
            "username": f"test_perfil_user_{uuid.uuid4().hex[:8]}",
            "password": "test123456",
            "rol": "cajero",
            "perfil_id": perfil_id
        }
        user_response = requests.post(f"{BASE_URL}/api/usuarios", headers=auth_headers, json=usuario_data)
        assert user_response.status_code == 200
        usuario_id = user_response.json()["id"]
        
        # Try to delete the profile - should fail
        delete_response = requests.delete(f"{BASE_URL}/api/perfiles/{perfil_id}", headers=auth_headers)
        assert delete_response.status_code == 400, "Should not allow deleting profile with assigned users"
        
        # Cleanup - delete user first, then profile
        requests.delete(f"{BASE_URL}/api/usuarios/{usuario_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/perfiles/{perfil_id}", headers=auth_headers)


class TestPerfilPermissions:
    """Tests for profile permissions structure"""
    
    def test_perfil_has_pos_permissions(self, auth_headers):
        """Verify profiles have POS permissions structure"""
        response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        perfiles = response.json()
        
        expected_pos_keys = [
            "ver_productos", "agregar_ticket", "guardar_ticket",
            "recuperar_tickets_propios", "recuperar_tickets_otros",
            "cobrar", "facturar_electronico", "aplicar_descuentos",
            "eliminar_items", "anular_ventas", "abrir_caja",
            "cerrar_caja_propia", "cerrar_caja_otros", "dividir_ticket", "cambiar_precio"
        ]
        
        for perfil in perfiles:
            assert "permisos_pos" in perfil, f"Profile {perfil['nombre']} should have permisos_pos"
            for key in expected_pos_keys:
                assert key in perfil["permisos_pos"], f"Profile {perfil['nombre']} should have POS permission: {key}"
    
    def test_perfil_has_backoffice_permissions(self, auth_headers):
        """Verify profiles have Backoffice permissions structure"""
        response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        perfiles = response.json()
        
        expected_backoffice_keys = [
            "ver_reportes", "ver_reportes_propios", "ver_dashboard",
            "ver_productos", "gestionar_productos", "gestionar_categorias",
            "ver_clientes", "gestionar_clientes", "gestionar_empleados",
            "ver_configuracion", "gestionar_configuracion",
            "gestionar_tpv", "gestionar_tiendas",
            "gestionar_metodos_pago", "gestionar_impuestos",
            "ver_facturacion_electronica", "gestionar_facturacion_electronica",
            "gestionar_perfiles"
        ]
        
        for perfil in perfiles:
            assert "permisos_backoffice" in perfil, f"Profile {perfil['nombre']} should have permisos_backoffice"
            for key in expected_backoffice_keys:
                assert key in perfil["permisos_backoffice"], f"Profile {perfil['nombre']} should have Backoffice permission: {key}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, auth_headers):
        """Clean up any TEST_ prefixed data"""
        # Clean up test users
        usuarios_response = requests.get(f"{BASE_URL}/api/usuarios", headers=auth_headers)
        if usuarios_response.status_code == 200:
            for usuario in usuarios_response.json():
                if usuario["nombre"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/usuarios/{usuario['id']}", headers=auth_headers)
        
        # Clean up test profiles
        perfiles_response = requests.get(f"{BASE_URL}/api/perfiles", headers=auth_headers)
        if perfiles_response.status_code == 200:
            for perfil in perfiles_response.json():
                if perfil["nombre"].startswith("TEST_") and not perfil["es_sistema"]:
                    requests.delete(f"{BASE_URL}/api/perfiles/{perfil['id']}", headers=auth_headers)
        
        assert True, "Cleanup completed"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
