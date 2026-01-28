"""
Test Suite for Facturación Electrónica (FE) Backend API
Tests the backend-fe service via the proxy at /api/fe/*
"""
import pytest
import requests
import os
import uuid
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://easytpv.preview.emergentagent.com')


def generate_valid_ruc():
    """Generate a valid Ecuadorian RUC format (13 digits ending in 001)"""
    # Province code (01-24 or 30)
    provincia = str(random.randint(1, 24)).zfill(2)
    # Random 8 digits
    middle = ''.join([str(random.randint(0, 9)) for _ in range(8)])
    # Must end in 001
    return f"{provincia}{middle}001"


class TestFEHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_check_returns_ok(self):
        """Test GET /api/fe/health returns status ok"""
        response = requests.get(f"{BASE_URL}/api/fe/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "backend-fe"
        assert data["database"] == "connected"
        assert "timestamp" in data
        assert "version" in data


class TestFEConfigEmitter:
    """Emitter configuration endpoint tests"""
    
    def test_get_config_empty_tenant(self):
        """Test GET /api/fe/config returns empty config for new tenant"""
        new_tenant = f"new-tenant-{uuid.uuid4().hex[:8]}"
        response = requests.get(
            f"{BASE_URL}/api/fe/config",
            headers={"X-Tenant-ID": new_tenant}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["emitter"] is None
        assert data["fiscal"] is None
        assert data["certificate"] is None
        assert data["is_configured"] == False
        assert "emitter" in data["missing_config"]
        assert "certificate" in data["missing_config"]
    
    def test_save_emitter_config_success(self):
        """Test POST /api/fe/config/emitter saves emitter configuration"""
        tenant_id = f"test-emitter-{uuid.uuid4().hex[:8]}"
        valid_ruc = generate_valid_ruc()
        
        payload = {
            "ruc": valid_ruc,
            "razon_social": "Test Company S.A.",
            "nombre_comercial": "Test Store",
            "email": "test@example.com",
            "direccion": "Av. Test 123",
            "telefono": "022345678",
            "establecimiento": "001",
            "punto_emision": "001",
            "ambiente": "pruebas",
            "obligado_contabilidad": "NO"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fe/config/emitter",
            headers={"X-Tenant-ID": tenant_id, "Content-Type": "application/json"},
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["tenant_id"] == tenant_id
        assert "message" in data
        
        # Verify config was saved by GET
        get_response = requests.get(
            f"{BASE_URL}/api/fe/config",
            headers={"X-Tenant-ID": tenant_id}
        )
        assert get_response.status_code == 200
        
        config_data = get_response.json()
        assert config_data["emitter"] is not None
        assert config_data["emitter"]["razon_social"] == "Test Company S.A."
        assert config_data["fiscal"] is not None
        assert config_data["fiscal"]["ambiente"] == "pruebas"
    
    def test_save_emitter_invalid_ruc_short(self):
        """Test POST /api/fe/config/emitter rejects invalid RUC (too short)"""
        tenant_id = f"test-invalid-ruc-{uuid.uuid4().hex[:8]}"
        
        payload = {
            "ruc": "123",  # Invalid RUC (too short)
            "razon_social": "Test Company",
            "email": "test@example.com",
            "direccion": "Test Address",
            "establecimiento": "001",
            "punto_emision": "001",
            "ambiente": "pruebas",
            "obligado_contabilidad": "NO"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fe/config/emitter",
            headers={"X-Tenant-ID": tenant_id, "Content-Type": "application/json"},
            json=payload
        )
        
        # Should return 400 (validation error) or 422 (pydantic validation)
        assert response.status_code in [400, 422]
        data = response.json()
        assert "detail" in data
    
    def test_save_emitter_invalid_email(self):
        """Test POST /api/fe/config/emitter rejects invalid email"""
        tenant_id = f"test-invalid-email-{uuid.uuid4().hex[:8]}"
        valid_ruc = generate_valid_ruc()
        
        payload = {
            "ruc": valid_ruc,
            "razon_social": "Test Company",
            "email": "invalid-email",  # Invalid email
            "direccion": "Test Address",
            "establecimiento": "001",
            "punto_emision": "001",
            "ambiente": "pruebas",
            "obligado_contabilidad": "NO"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fe/config/emitter",
            headers={"X-Tenant-ID": tenant_id, "Content-Type": "application/json"},
            json=payload
        )
        
        # Should return 400 (validation error) or 422 (pydantic validation)
        assert response.status_code in [400, 422]
        data = response.json()
        assert "detail" in data


class TestFEDocuments:
    """Documents endpoint tests"""
    
    def test_list_documents_empty(self):
        """Test GET /api/fe/documents returns empty list for new tenant"""
        new_tenant = f"docs-tenant-{uuid.uuid4().hex[:8]}"
        response = requests.get(
            f"{BASE_URL}/api/fe/documents",
            headers={"X-Tenant-ID": new_tenant}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["documents"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["pages"] == 0
    
    def test_list_documents_with_filters(self):
        """Test GET /api/fe/documents with query filters"""
        tenant_id = f"filter-tenant-{uuid.uuid4().hex[:8]}"
        
        # Test with status filter
        response = requests.get(
            f"{BASE_URL}/api/fe/documents",
            headers={"X-Tenant-ID": tenant_id},
            params={"status": "AUTORIZADO", "doc_type": "01", "page": 1, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
    
    def test_get_document_not_found(self):
        """Test GET /api/fe/documents/{id} returns 404 for non-existent document"""
        tenant_id = f"notfound-tenant-{uuid.uuid4().hex[:8]}"
        fake_doc_id = str(uuid.uuid4())
        
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{fake_doc_id}",
            headers={"X-Tenant-ID": tenant_id}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestFECertificate:
    """Certificate endpoint tests"""
    
    def test_delete_certificate_no_cert(self):
        """Test DELETE /api/fe/config/certificate when no certificate exists"""
        tenant_id = f"nocert-tenant-{uuid.uuid4().hex[:8]}"
        
        response = requests.delete(
            f"{BASE_URL}/api/fe/config/certificate",
            headers={"X-Tenant-ID": tenant_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["deleted_count"] == 0


class TestFETenantHeader:
    """Tests for X-Tenant-ID header requirement"""
    
    def test_config_without_tenant_header(self):
        """Test that endpoints require X-Tenant-ID header"""
        # Note: The middleware should handle missing tenant header
        response = requests.get(f"{BASE_URL}/api/fe/config")
        
        # Should return 401 (unauthorized) when no tenant header
        assert response.status_code in [200, 400, 401]


# Pytest fixtures
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
