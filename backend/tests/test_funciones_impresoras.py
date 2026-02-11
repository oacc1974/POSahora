"""
Test suite for Funciones and Impresoras de Cocina endpoints
Tests:
- GET /api/funciones - Get system functions configuration
- PUT /api/funciones - Update system functions configuration
- GET /api/grupos-impresora - Get kitchen printer groups
- POST /api/grupos-impresora - Create kitchen printer group
- PUT /api/grupos-impresora/{id} - Update kitchen printer group
- DELETE /api/grupos-impresora/{id} - Delete kitchen printer group
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "oscarcastrocantos@gmail.com"
TEST_PASSWORD = "oscar123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("access_token")
    assert token, "No access_token in response"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestFuncionesEndpoints:
    """Tests for /api/funciones endpoints"""
    
    def test_get_funciones_success(self, headers):
        """Test GET /api/funciones returns all function toggles"""
        response = requests.get(f"{BASE_URL}/api/funciones", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all expected function keys are present
        expected_keys = [
            "cierres_caja",
            "tickets_abiertos",
            "tipo_pedido",
            "venta_con_stock",
            "funcion_reloj",
            "impresoras_cocina",
            "pantalla_clientes",
            "mesas_por_mesero",
            "facturacion_electronica",
            "tickets_abiertos_count"
        ]
        
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        
        # Verify boolean types for toggle fields
        boolean_keys = [
            "cierres_caja", "tickets_abiertos", "tipo_pedido", 
            "venta_con_stock", "funcion_reloj", "impresoras_cocina",
            "pantalla_clientes", "mesas_por_mesero", "facturacion_electronica"
        ]
        for key in boolean_keys:
            assert isinstance(data[key], bool), f"{key} should be boolean, got {type(data[key])}"
        
        # Verify tickets_abiertos_count is integer
        assert isinstance(data["tickets_abiertos_count"], int), "tickets_abiertos_count should be int"
        
        print(f"✓ GET /api/funciones returned all {len(expected_keys)} function toggles")
    
    def test_get_funciones_unauthorized(self):
        """Test GET /api/funciones without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/funciones")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/funciones correctly rejects unauthorized requests")
    
    def test_put_funciones_update(self, headers):
        """Test PUT /api/funciones updates function configuration"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/funciones", headers=headers)
        assert get_response.status_code == 200
        original_config = get_response.json()
        
        # Update config - enable impresoras_cocina
        update_data = {
            "cierres_caja": original_config.get("cierres_caja", True),
            "tickets_abiertos": original_config.get("tickets_abiertos", False),
            "tipo_pedido": original_config.get("tipo_pedido", False),
            "venta_con_stock": original_config.get("venta_con_stock", True),
            "funcion_reloj": original_config.get("funcion_reloj", False),
            "impresoras_cocina": True,  # Enable this for testing
            "pantalla_clientes": original_config.get("pantalla_clientes", False),
            "mesas_por_mesero": original_config.get("mesas_por_mesero", False),
            "facturacion_electronica": original_config.get("facturacion_electronica", False)
        }
        
        response = requests.put(f"{BASE_URL}/api/funciones", json=update_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        # Verify the update persisted
        verify_response = requests.get(f"{BASE_URL}/api/funciones", headers=headers)
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["impresoras_cocina"] == True, "impresoras_cocina should be True after update"
        
        print("✓ PUT /api/funciones successfully updated configuration")
    
    def test_put_funciones_unauthorized(self):
        """Test PUT /api/funciones without auth returns 401/403"""
        update_data = {
            "cierres_caja": True,
            "tickets_abiertos": False,
            "tipo_pedido": False,
            "venta_con_stock": True,
            "funcion_reloj": False,
            "impresoras_cocina": False,
            "pantalla_clientes": False,
            "mesas_por_mesero": False,
            "facturacion_electronica": False
        }
        
        response = requests.put(f"{BASE_URL}/api/funciones", json=update_data)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ PUT /api/funciones correctly rejects unauthorized requests")


class TestGruposImpresoraEndpoints:
    """Tests for /api/grupos-impresora endpoints"""
    
    def test_get_grupos_impresora_success(self, headers):
        """Test GET /api/grupos-impresora returns list of printer groups"""
        response = requests.get(f"{BASE_URL}/api/grupos-impresora", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are groups, verify structure
        if len(data) > 0:
            grupo = data[0]
            assert "id" in grupo, "Grupo should have 'id'"
            assert "nombre" in grupo, "Grupo should have 'nombre'"
            assert "categorias" in grupo, "Grupo should have 'categorias'"
            assert "categorias_nombres" in grupo, "Grupo should have 'categorias_nombres'"
            print(f"✓ GET /api/grupos-impresora returned {len(data)} groups with correct structure")
        else:
            print("✓ GET /api/grupos-impresora returned empty list (no groups yet)")
    
    def test_get_grupos_impresora_unauthorized(self):
        """Test GET /api/grupos-impresora without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/grupos-impresora")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/grupos-impresora correctly rejects unauthorized requests")
    
    def test_create_grupo_impresora(self, headers):
        """Test POST /api/grupos-impresora creates a new printer group"""
        test_nombre = f"TEST_Grupo_{uuid.uuid4().hex[:8]}"
        
        create_data = {
            "nombre": test_nombre,
            "categorias": []
        }
        
        response = requests.post(f"{BASE_URL}/api/grupos-impresora", json=create_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "message" in data, "Response should contain 'message'"
        
        grupo_id = data["id"]
        
        # Verify the group was created by fetching all groups
        verify_response = requests.get(f"{BASE_URL}/api/grupos-impresora", headers=headers)
        assert verify_response.status_code == 200
        grupos = verify_response.json()
        
        created_grupo = next((g for g in grupos if g["id"] == grupo_id), None)
        assert created_grupo is not None, "Created group should exist in list"
        assert created_grupo["nombre"] == test_nombre, "Group name should match"
        
        print(f"✓ POST /api/grupos-impresora created group '{test_nombre}' with id {grupo_id}")
        
        # Cleanup - delete the test group
        delete_response = requests.delete(f"{BASE_URL}/api/grupos-impresora/{grupo_id}", headers=headers)
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"✓ Cleanup: deleted test group {grupo_id}")
    
    def test_create_grupo_impresora_with_categorias(self, headers):
        """Test POST /api/grupos-impresora with categories"""
        # First get available categories
        cat_response = requests.get(f"{BASE_URL}/api/categorias", headers=headers)
        assert cat_response.status_code == 200
        categorias = cat_response.json()
        
        test_nombre = f"TEST_GrupoConCat_{uuid.uuid4().hex[:8]}"
        categoria_ids = [c["id"] for c in categorias[:2]] if len(categorias) >= 2 else []
        
        create_data = {
            "nombre": test_nombre,
            "categorias": categoria_ids
        }
        
        response = requests.post(f"{BASE_URL}/api/grupos-impresora", json=create_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        grupo_id = data["id"]
        
        # Verify the group has categories
        verify_response = requests.get(f"{BASE_URL}/api/grupos-impresora", headers=headers)
        grupos = verify_response.json()
        created_grupo = next((g for g in grupos if g["id"] == grupo_id), None)
        
        assert created_grupo is not None, "Created group should exist"
        assert created_grupo["categorias"] == categoria_ids, "Categories should match"
        
        if len(categoria_ids) > 0:
            assert len(created_grupo["categorias_nombres"]) > 0, "Should have category names"
        
        print(f"✓ POST /api/grupos-impresora created group with {len(categoria_ids)} categories")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/grupos-impresora/{grupo_id}", headers=headers)
    
    def test_update_grupo_impresora(self, headers):
        """Test PUT /api/grupos-impresora/{id} updates a printer group"""
        # Create a test group first
        test_nombre = f"TEST_UpdateGrupo_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/grupos-impresora",
            json={"nombre": test_nombre, "categorias": []},
            headers=headers
        )
        assert create_response.status_code == 200
        grupo_id = create_response.json()["id"]
        
        # Update the group
        updated_nombre = f"TEST_Updated_{uuid.uuid4().hex[:8]}"
        update_response = requests.put(
            f"{BASE_URL}/api/grupos-impresora/{grupo_id}",
            json={"nombre": updated_nombre, "categorias": []},
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/grupos-impresora", headers=headers)
        grupos = verify_response.json()
        updated_grupo = next((g for g in grupos if g["id"] == grupo_id), None)
        
        assert updated_grupo is not None, "Updated group should exist"
        assert updated_grupo["nombre"] == updated_nombre, "Name should be updated"
        
        print(f"✓ PUT /api/grupos-impresora/{grupo_id} successfully updated group name")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/grupos-impresora/{grupo_id}", headers=headers)
    
    def test_delete_grupo_impresora(self, headers):
        """Test DELETE /api/grupos-impresora/{id} deletes a printer group"""
        # Create a test group first
        test_nombre = f"TEST_DeleteGrupo_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/grupos-impresora",
            json={"nombre": test_nombre, "categorias": []},
            headers=headers
        )
        assert create_response.status_code == 200
        grupo_id = create_response.json()["id"]
        
        # Delete the group
        delete_response = requests.delete(f"{BASE_URL}/api/grupos-impresora/{grupo_id}", headers=headers)
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/grupos-impresora", headers=headers)
        grupos = verify_response.json()
        deleted_grupo = next((g for g in grupos if g["id"] == grupo_id), None)
        
        assert deleted_grupo is None, "Deleted group should not exist"
        
        print(f"✓ DELETE /api/grupos-impresora/{grupo_id} successfully deleted group")
    
    def test_delete_grupo_impresora_not_found(self, headers):
        """Test DELETE /api/grupos-impresora/{id} with non-existent id returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.delete(f"{BASE_URL}/api/grupos-impresora/{fake_id}", headers=headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE /api/grupos-impresora correctly returns 404 for non-existent group")
    
    def test_create_grupo_impresora_unauthorized(self):
        """Test POST /api/grupos-impresora without auth returns 401/403"""
        create_data = {
            "nombre": "Unauthorized Test",
            "categorias": []
        }
        
        response = requests.post(f"{BASE_URL}/api/grupos-impresora", json=create_data)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/grupos-impresora correctly rejects unauthorized requests")


class TestCategoriasEndpoint:
    """Test /api/categorias endpoint (needed for impresoras de cocina)"""
    
    def test_get_categorias_success(self, headers):
        """Test GET /api/categorias returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categorias", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            categoria = data[0]
            assert "id" in categoria, "Categoria should have 'id'"
            assert "nombre" in categoria, "Categoria should have 'nombre'"
            print(f"✓ GET /api/categorias returned {len(data)} categories")
        else:
            print("✓ GET /api/categorias returned empty list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
