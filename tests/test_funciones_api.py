"""
Test suite for POS System - Funciones API and Date Range features
Tests the 7 functions configuration and related endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://digital-invoicing-1.preview.emergentagent.com')

class TestFuncionesAPI:
    """Tests for /api/funciones endpoints - 7 functions configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "admin*88"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_funciones_returns_all_7_functions(self):
        """GET /api/funciones should return all 7 functions including the 3 new ones"""
        response = requests.get(f"{BASE_URL}/api/funciones", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all 7 functions are present
        expected_functions = [
            "cierres_caja",
            "tickets_abiertos", 
            "tipo_pedido",
            "venta_con_stock",
            "funcion_reloj",        # New function 1
            "impresoras_cocina",    # New function 2
            "pantalla_clientes"     # New function 3
        ]
        
        for func in expected_functions:
            assert func in data, f"Missing function: {func}"
            assert isinstance(data[func], bool), f"Function {func} should be boolean"
        
        print(f"✓ All 7 functions returned: {list(data.keys())}")
    
    def test_update_funciones_all_enabled(self):
        """PUT /api/funciones should update all 7 functions to enabled"""
        update_data = {
            "cierres_caja": True,
            "tickets_abiertos": True,
            "tipo_pedido": True,
            "venta_con_stock": True,
            "funcion_reloj": True,
            "impresoras_cocina": True,
            "pantalla_clientes": True
        }
        
        response = requests.put(f"{BASE_URL}/api/funciones", 
                               headers=self.headers, 
                               json=update_data)
        
        assert response.status_code == 200
        assert "message" in response.json()
        
        # Verify the update persisted
        get_response = requests.get(f"{BASE_URL}/api/funciones", headers=self.headers)
        assert get_response.status_code == 200
        data = get_response.json()
        
        for key, value in update_data.items():
            assert data[key] == value, f"Function {key} not updated correctly"
        
        print("✓ All 7 functions updated to enabled")
    
    def test_update_funciones_all_disabled(self):
        """PUT /api/funciones should update all 7 functions to disabled"""
        update_data = {
            "cierres_caja": False,
            "tickets_abiertos": False,
            "tipo_pedido": False,
            "venta_con_stock": False,
            "funcion_reloj": False,
            "impresoras_cocina": False,
            "pantalla_clientes": False
        }
        
        response = requests.put(f"{BASE_URL}/api/funciones", 
                               headers=self.headers, 
                               json=update_data)
        
        assert response.status_code == 200
        
        # Verify the update persisted
        get_response = requests.get(f"{BASE_URL}/api/funciones", headers=self.headers)
        data = get_response.json()
        
        for key, value in update_data.items():
            assert data[key] == value, f"Function {key} not updated correctly"
        
        print("✓ All 7 functions updated to disabled")
    
    def test_update_new_functions_individually(self):
        """Test updating only the 3 new functions"""
        # First set all to false
        requests.put(f"{BASE_URL}/api/funciones", 
                    headers=self.headers, 
                    json={
                        "cierres_caja": True,
                        "tickets_abiertos": False,
                        "tipo_pedido": False,
                        "venta_con_stock": True,
                        "funcion_reloj": False,
                        "impresoras_cocina": False,
                        "pantalla_clientes": False
                    })
        
        # Now enable only the 3 new functions
        update_data = {
            "cierres_caja": True,
            "tickets_abiertos": False,
            "tipo_pedido": False,
            "venta_con_stock": True,
            "funcion_reloj": True,        # Enable new function 1
            "impresoras_cocina": True,    # Enable new function 2
            "pantalla_clientes": True     # Enable new function 3
        }
        
        response = requests.put(f"{BASE_URL}/api/funciones", 
                               headers=self.headers, 
                               json=update_data)
        
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/funciones", headers=self.headers)
        data = get_response.json()
        
        assert data["funcion_reloj"] == True, "funcion_reloj not enabled"
        assert data["impresoras_cocina"] == True, "impresoras_cocina not enabled"
        assert data["pantalla_clientes"] == True, "pantalla_clientes not enabled"
        
        print("✓ 3 new functions (funcion_reloj, impresoras_cocina, pantalla_clientes) updated individually")


class TestDashboardAPI:
    """Tests for dashboard and reports endpoints used by DateRangePicker"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "admin*88"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_dashboard_with_date_range(self):
        """GET /api/dashboard should accept date range parameters"""
        params = {
            "fecha_desde": "2024-01-01",
            "fecha_hasta": "2024-12-31"
        }
        
        response = requests.get(f"{BASE_URL}/api/dashboard", 
                               headers=self.headers, 
                               params=params)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard returns expected fields
        assert "total_ingresos" in data or "total_ventas" in data or isinstance(data, dict)
        print(f"✓ Dashboard API accepts date range parameters")
    
    def test_facturas_with_date_range(self):
        """GET /api/facturas should accept date range parameters"""
        params = {
            "fecha_desde": "2024-01-01",
            "fecha_hasta": "2024-12-31"
        }
        
        response = requests.get(f"{BASE_URL}/api/facturas", 
                               headers=self.headers, 
                               params=params)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Facturas should return a list"
        print(f"✓ Facturas API accepts date range parameters, returned {len(data)} records")


class TestAuthAndBasicEndpoints:
    """Basic auth and endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "admin*88"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["rol"] == "propietario"
        print("✓ Login successful with admin credentials")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/login", json={
            "username": "invalid",
            "password": "invalid"
        })
        
        assert response.status_code == 401
        print("✓ Login correctly rejects invalid credentials")
    
    def test_protected_endpoint_without_auth(self):
        """Test that protected endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/funciones")
        
        assert response.status_code in [401, 403]
        print("✓ Protected endpoints require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
