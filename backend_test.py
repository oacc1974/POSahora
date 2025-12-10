import requests
import sys
import json
from datetime import datetime

class BillingSystemTester:
    def __init__(self, base_url="https://salespoint-27.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_user_id = None
        self.created_product_id = None
        self.created_invoice_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/login",
            200,
            data={"username": "admin", "password": "admin*88"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.admin_user = response['user']
            print(f"   Admin user: {self.admin_user}")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/me",
            200
        )
        if success:
            print(f"   User info: {response}")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET",
            "api/dashboard",
            200
        )
        if success:
            print(f"   Stats: Products={response.get('total_productos')}, Sales={response.get('total_ventas')}, Revenue=${response.get('total_ingresos')}")
        return success

    def test_get_products(self):
        """Test getting products list"""
        success, response = self.run_test(
            "Get Products",
            "GET",
            "api/productos",
            200
        )
        if success:
            print(f"   Found {len(response)} products")
        return success

    def test_create_product(self):
        """Test creating a new product"""
        product_data = {
            "nombre": "Producto Test",
            "precio": 25.50,
            "codigo_barras": "1234567890123",
            "descripcion": "Producto de prueba para testing",
            "stock": 100
        }
        success, response = self.run_test(
            "Create Product",
            "POST",
            "api/productos",
            200,
            data=product_data
        )
        if success and 'id' in response:
            self.created_product_id = response['id']
            print(f"   Created product ID: {self.created_product_id}")
        return success

    def test_update_product(self):
        """Test updating a product"""
        if not self.created_product_id:
            print("❌ No product ID available for update test")
            return False
            
        updated_data = {
            "nombre": "Producto Test Actualizado",
            "precio": 30.00,
            "codigo_barras": "1234567890123",
            "descripcion": "Producto actualizado",
            "stock": 80
        }
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"api/productos/{self.created_product_id}",
            200,
            data=updated_data
        )
        return success

    def test_get_product_by_barcode(self):
        """Test getting product by barcode"""
        success, response = self.run_test(
            "Get Product by Barcode",
            "GET",
            "api/productos/barcode/1234567890123",
            200
        )
        return success

    def test_create_invoice(self):
        """Test creating an invoice"""
        if not self.created_product_id:
            print("❌ No product ID available for invoice test")
            return False
            
        invoice_data = {
            "items": [
                {
                    "producto_id": self.created_product_id,
                    "nombre": "Producto Test Actualizado",
                    "precio": 30.00,
                    "cantidad": 2,
                    "subtotal": 60.00
                }
            ],
            "total": 60.00
        }
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "api/facturas",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            self.created_invoice_id = response['id']
            print(f"   Created invoice: {response.get('numero')}")
        return success

    def test_get_invoices(self):
        """Test getting invoices list"""
        success, response = self.run_test(
            "Get Invoices",
            "GET",
            "api/facturas",
            200
        )
        if success:
            print(f"   Found {len(response)} invoices")
        return success

    def test_get_users(self):
        """Test getting users list (admin only)"""
        success, response = self.run_test(
            "Get Users (Admin)",
            "GET",
            "api/usuarios",
            200
        )
        if success:
            print(f"   Found {len(response)} users")
        return success

    def test_create_user(self):
        """Test creating a new user (admin only)"""
        user_data = {
            "nombre": "Usuario Test",
            "username": f"test_user_{datetime.now().strftime('%H%M%S')}",
            "password": "test123",
            "es_admin": False
        }
        success, response = self.run_test(
            "Create User (Admin)",
            "POST",
            "api/usuarios",
            200,
            data=user_data
        )
        if success and 'id' in response:
            self.created_user_id = response['id']
            print(f"   Created user ID: {self.created_user_id}")
        return success

    def test_delete_user(self):
        """Test deleting a user (admin only)"""
        if not self.created_user_id:
            print("❌ No user ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete User (Admin)",
            "DELETE",
            f"api/usuarios/{self.created_user_id}",
            200
        )
        return success

    def test_delete_product(self):
        """Test deleting a product"""
        if not self.created_product_id:
            print("❌ No product ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"api/productos/{self.created_product_id}",
            200
        )
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "api/login",
            401,
            data={"username": "invalid", "password": "invalid"}
        )
        return success

def main():
    print("🚀 Starting Billing System Backend Tests")
    print("=" * 50)
    
    tester = BillingSystemTester()
    
    # Test sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_invalid_login,
        tester.test_admin_login,
        tester.test_get_current_user,
        tester.test_dashboard_stats,
        tester.test_get_products,
        tester.test_create_product,
        tester.test_update_product,
        tester.test_get_product_by_barcode,
        tester.test_create_invoice,
        tester.test_get_invoices,
        tester.test_get_users,
        tester.test_create_user,
        tester.test_delete_user,
        tester.test_delete_product,
    ]
    
    failed_tests = []
    
    for test in tests:
        try:
            if not test():
                failed_tests.append(test.__name__)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {str(e)}")
            failed_tests.append(test.__name__)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())