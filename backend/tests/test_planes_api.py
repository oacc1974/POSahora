"""
Test suite for Plan/Subscription System APIs
Tests: GET /api/planes, GET /api/mi-plan, GET /api/verificar-limite/{recurso}
       GET /api/superadmin/dashboard, GET /api/superadmin/planes, POST /api/superadmin/planes
       PUT /api/superadmin/planes/{plan_id}, GET /api/superadmin/organizaciones
       PUT /api/superadmin/organizaciones/{org_id}/plan
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://factupos-1.preview.emergentagent.com')

class TestPublicPlanesAPI:
    """Tests for public planes endpoint (no auth required)"""
    
    def test_get_planes_publicos_success(self):
        """GET /api/planes - Should return list of visible plans"""
        response = requests.get(f"{BASE_URL}/api/planes")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least one plan"
        
        # Verify plan structure
        for plan in data:
            assert "id" in plan, "Plan should have id"
            assert "nombre" in plan, "Plan should have nombre"
            assert "precio" in plan, "Plan should have precio"
            assert "limite_facturas" in plan, "Plan should have limite_facturas"
            assert "limite_usuarios" in plan, "Plan should have limite_usuarios"
            assert "limite_productos" in plan, "Plan should have limite_productos"
            assert "limite_tpv" in plan, "Plan should have limite_tpv"
            assert "limite_clientes" in plan, "Plan should have limite_clientes"
            assert "funciones" in plan, "Plan should have funciones"
    
    def test_planes_include_expected_plans(self):
        """Verify expected plans exist: gratis, basico, pro, enterprise"""
        response = requests.get(f"{BASE_URL}/api/planes")
        
        assert response.status_code == 200
        data = response.json()
        
        plan_ids = [p["id"] for p in data]
        expected_plans = ["gratis", "basico", "pro", "enterprise"]
        
        for expected in expected_plans:
            assert expected in plan_ids, f"Plan '{expected}' should be visible"
    
    def test_planes_pro_is_destacado(self):
        """Verify 'pro' plan is marked as destacado (featured)"""
        response = requests.get(f"{BASE_URL}/api/planes")
        
        assert response.status_code == 200
        data = response.json()
        
        pro_plan = next((p for p in data if p["id"] == "pro"), None)
        assert pro_plan is not None, "Pro plan should exist"
        assert pro_plan.get("destacado") == True, "Pro plan should be destacado"


class TestAuthenticatedPlanesAPI:
    """Tests for authenticated plan endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_mi_plan_success(self, admin_headers):
        """GET /api/mi-plan - Should return current plan and usage"""
        response = requests.get(f"{BASE_URL}/api/mi-plan", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plan_id" in data, "Should have plan_id"
        assert "plan_nombre" in data, "Should have plan_nombre"
        assert "plan_precio" in data, "Should have plan_precio"
        assert "limites" in data, "Should have limites"
        assert "uso_actual" in data, "Should have uso_actual"
        assert "funciones" in data, "Should have funciones"
        
        # Verify limites structure
        limites = data["limites"]
        assert "facturas" in limites
        assert "usuarios" in limites
        assert "productos" in limites
        assert "tpv" in limites
        assert "clientes" in limites
        
        # Verify uso_actual structure
        uso = data["uso_actual"]
        assert "facturas_mes" in uso
        assert "usuarios" in uso
        assert "productos" in uso
        assert "tpvs" in uso
        assert "clientes" in uso
    
    def test_get_mi_plan_unauthorized(self):
        """GET /api/mi-plan - Should fail without auth"""
        response = requests.get(f"{BASE_URL}/api/mi-plan")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_verificar_limite_facturas(self, admin_headers):
        """GET /api/verificar-limite/facturas - Should return limit info"""
        response = requests.get(f"{BASE_URL}/api/verificar-limite/facturas", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "puede_crear" in data, "Should have puede_crear"
        assert "uso_actual" in data, "Should have uso_actual"
        assert "limite" in data, "Should have limite"
        assert "ilimitado" in data, "Should have ilimitado"
    
    def test_verificar_limite_usuarios(self, admin_headers):
        """GET /api/verificar-limite/usuarios - Should return limit info"""
        response = requests.get(f"{BASE_URL}/api/verificar-limite/usuarios", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "puede_crear" in data
        assert isinstance(data["puede_crear"], bool)
    
    def test_verificar_limite_productos(self, admin_headers):
        """GET /api/verificar-limite/productos - Should return limit info"""
        response = requests.get(f"{BASE_URL}/api/verificar-limite/productos", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "puede_crear" in data
    
    def test_verificar_limite_tpv(self, admin_headers):
        """GET /api/verificar-limite/tpv - Should return limit info"""
        response = requests.get(f"{BASE_URL}/api/verificar-limite/tpv", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "puede_crear" in data
    
    def test_verificar_limite_clientes(self, admin_headers):
        """GET /api/verificar-limite/clientes - Should return limit info"""
        response = requests.get(f"{BASE_URL}/api/verificar-limite/clientes", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "puede_crear" in data


class TestSuperAdminAPI:
    """Tests for super admin endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_superadmin_dashboard(self, admin_headers):
        """GET /api/superadmin/dashboard - Should return dashboard metrics"""
        response = requests.get(f"{BASE_URL}/api/superadmin/dashboard", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_organizaciones" in data, "Should have total_organizaciones"
        assert "total_usuarios" in data, "Should have total_usuarios"
        assert "total_facturas_mes" in data, "Should have total_facturas_mes"
        assert "organizaciones_por_plan" in data, "Should have organizaciones_por_plan"
        assert "ingresos_mensuales_estimados" in data, "Should have ingresos_mensuales_estimados"
        assert "organizaciones_recientes" in data, "Should have organizaciones_recientes"
        
        # Verify types
        assert isinstance(data["total_organizaciones"], int)
        assert isinstance(data["total_usuarios"], int)
        assert isinstance(data["organizaciones_por_plan"], dict)
    
    def test_superadmin_get_all_planes(self, admin_headers):
        """GET /api/superadmin/planes - Should return all plans including hidden"""
        response = requests.get(f"{BASE_URL}/api/superadmin/planes", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Admin endpoint should include additional fields
        if len(data) > 0:
            plan = data[0]
            assert "visible_en_web" in plan, "Admin view should include visible_en_web"
            assert "activo" in plan, "Admin view should include activo"
            assert "orden" in plan, "Admin view should include orden"
    
    def test_superadmin_get_organizaciones(self, admin_headers):
        """GET /api/superadmin/organizaciones - Should return all organizations"""
        response = requests.get(f"{BASE_URL}/api/superadmin/organizaciones", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify organization structure if any exist
        if len(data) > 0:
            org = data[0]
            assert "id" in org, "Org should have id"
            assert "nombre" in org, "Org should have nombre"
            assert "plan" in org, "Org should have plan"
            assert "uso" in org, "Org should have uso"
    
    def test_superadmin_create_plan(self, admin_headers):
        """POST /api/superadmin/planes - Should create a new plan"""
        test_plan_id = f"test_plan_{uuid.uuid4().hex[:8]}"
        
        plan_data = {
            "id": test_plan_id,
            "nombre": "Test Plan",
            "descripcion": "Plan de prueba",
            "precio": 99.99,
            "moneda": "USD",
            "periodo": "mensual",
            "limite_facturas": 100,
            "limite_usuarios": 5,
            "limite_productos": 100,
            "limite_tpv": 2,
            "limite_clientes": 50,
            "dias_historial": 30,
            "funciones": {
                "facturacion_electronica": False,
                "reportes_avanzados": False,
                "tickets_abiertos": True,
                "multi_tienda": False,
                "logo_ticket": True,
                "exportar_excel": True,
                "soporte_prioritario": False
            },
            "visible_en_web": False,
            "activo": True,
            "destacado": False,
            "orden": 99,
            "color": "#ff0000"
        }
        
        response = requests.post(f"{BASE_URL}/api/superadmin/planes", json=plan_data, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "plan_id" in data
        assert data["plan_id"] == test_plan_id
        
        # Cleanup - delete the test plan
        requests.delete(f"{BASE_URL}/api/superadmin/planes/{test_plan_id}", headers=admin_headers)
    
    def test_superadmin_update_plan(self, admin_headers):
        """PUT /api/superadmin/planes/{plan_id} - Should update existing plan"""
        # First create a test plan
        test_plan_id = f"test_update_{uuid.uuid4().hex[:8]}"
        
        plan_data = {
            "id": test_plan_id,
            "nombre": "Test Update Plan",
            "descripcion": "Plan para actualizar",
            "precio": 50,
            "moneda": "USD",
            "periodo": "mensual",
            "limite_facturas": 100,
            "limite_usuarios": 5,
            "limite_productos": 100,
            "limite_tpv": 2,
            "limite_clientes": 50,
            "dias_historial": 30,
            "funciones": {
                "facturacion_electronica": False,
                "reportes_avanzados": False,
                "tickets_abiertos": False,
                "multi_tienda": False,
                "logo_ticket": False,
                "exportar_excel": False,
                "soporte_prioritario": False
            },
            "visible_en_web": False,
            "activo": True,
            "destacado": False,
            "orden": 99,
            "color": "#ff0000"
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/superadmin/planes", json=plan_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        # Update
        plan_data["nombre"] = "Updated Test Plan"
        plan_data["precio"] = 75
        
        update_response = requests.put(f"{BASE_URL}/api/superadmin/planes/{test_plan_id}", json=plan_data, headers=admin_headers)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/superadmin/planes", headers=admin_headers)
        planes = get_response.json()
        updated_plan = next((p for p in planes if p["id"] == test_plan_id), None)
        
        assert updated_plan is not None, "Updated plan should exist"
        assert updated_plan["nombre"] == "Updated Test Plan"
        assert updated_plan["precio"] == 75
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/superadmin/planes/{test_plan_id}", headers=admin_headers)
    
    def test_superadmin_delete_plan(self, admin_headers):
        """DELETE /api/superadmin/planes/{plan_id} - Should delete plan"""
        # Create a test plan first
        test_plan_id = f"test_delete_{uuid.uuid4().hex[:8]}"
        
        plan_data = {
            "id": test_plan_id,
            "nombre": "Test Delete Plan",
            "descripcion": "Plan para eliminar",
            "precio": 10,
            "moneda": "USD",
            "periodo": "mensual",
            "limite_facturas": 10,
            "limite_usuarios": 1,
            "limite_productos": 10,
            "limite_tpv": 1,
            "limite_clientes": 10,
            "dias_historial": 7,
            "funciones": {
                "facturacion_electronica": False,
                "reportes_avanzados": False,
                "tickets_abiertos": False,
                "multi_tienda": False,
                "logo_ticket": False,
                "exportar_excel": False,
                "soporte_prioritario": False
            },
            "visible_en_web": False,
            "activo": True,
            "destacado": False,
            "orden": 99,
            "color": "#ff0000"
        }
        
        # Create
        requests.post(f"{BASE_URL}/api/superadmin/planes", json=plan_data, headers=admin_headers)
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/superadmin/planes/{test_plan_id}", headers=admin_headers)
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/superadmin/planes", headers=admin_headers)
        planes = get_response.json()
        deleted_plan = next((p for p in planes if p["id"] == test_plan_id), None)
        
        assert deleted_plan is None, "Deleted plan should not exist"
    
    def test_superadmin_unauthorized_access(self):
        """Super admin endpoints should fail without proper auth"""
        # Test without auth
        response = requests.get(f"{BASE_URL}/api/superadmin/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # Test with invalid token
        headers = {"Authorization": "Bearer invalid_token"}
        response = requests.get(f"{BASE_URL}/api/superadmin/planes", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestNonAdminAccess:
    """Tests to verify non-admin users cannot access super admin endpoints"""
    
    @pytest.fixture
    def regular_user_token(self):
        """Create and login as a regular user"""
        # First register a new user
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        register_data = {
            "nombre": "Test User",
            "nombre_tienda": "Test Store",
            "email": test_email,
            "password": "testpass123"
        }
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        
        if register_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/login", json={
            "username": test_email,
            "password": "testpass123"
        })
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        pytest.skip("Regular user login failed")
    
    def test_regular_user_cannot_access_superadmin_dashboard(self, regular_user_token):
        """Regular users should not access super admin dashboard"""
        headers = {"Authorization": f"Bearer {regular_user_token}"}
        response = requests.get(f"{BASE_URL}/api/superadmin/dashboard", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_regular_user_cannot_access_superadmin_planes(self, regular_user_token):
        """Regular users should not access super admin planes"""
        headers = {"Authorization": f"Bearer {regular_user_token}"}
        response = requests.get(f"{BASE_URL}/api/superadmin/planes", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_regular_user_can_access_mi_plan(self, regular_user_token):
        """Regular users should be able to access their own plan"""
        headers = {"Authorization": f"Bearer {regular_user_token}"}
        response = requests.get(f"{BASE_URL}/api/mi-plan", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
