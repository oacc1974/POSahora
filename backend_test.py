import requests
import sys
import json
from datetime import datetime

class BillingSystemTester:
    def __init__(self, base_url="https://smart-pos-tax.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_user_id = None
        self.created_product_id = None
        self.created_invoice_id = None
        self.created_tax_agregado_id = None
        self.created_tax_incluido_id = None
        self.caja_id = None
        self.created_metodo_pago_id = None
        self.efectivo_metodo_id = None
        self.tarjeta_metodo_id = None

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

    def test_open_cash_register(self):
        """Test opening a cash register"""
        cash_data = {
            "monto_inicial": 100.0
        }
        success, response = self.run_test(
            "Open Cash Register",
            "POST",
            "api/caja/abrir",
            200,
            data=cash_data
        )
        if success and 'id' in response:
            self.caja_id = response['id']
            print(f"   Opened cash register: {response.get('numero')}")
        return success

    def test_get_active_cash_register(self):
        """Test getting active cash register"""
        success, response = self.run_test(
            "Get Active Cash Register",
            "GET",
            "api/caja/activa",
            200
        )
        if success and response:
            print(f"   Active cash register: {response.get('numero')}")
        return success

    def test_create_tax_agregado(self):
        """Test creating an 'agregado' type tax (IVA 12%)"""
        tax_data = {
            "nombre": "IVA",
            "tasa": 12.0,
            "tipo": "agregado",
            "activo": True
        }
        success, response = self.run_test(
            "Create Tax (Agregado - IVA 12%)",
            "POST",
            "api/impuestos",
            200,
            data=tax_data
        )
        if success and 'id' in response:
            self.created_tax_agregado_id = response['id']
            print(f"   Created tax ID: {self.created_tax_agregado_id}")
        return success

    def test_create_tax_incluido(self):
        """Test creating an 'incluido' type tax (Impuesto Incluido 5%)"""
        tax_data = {
            "nombre": "Impuesto Incluido",
            "tasa": 5.0,
            "tipo": "incluido",
            "activo": True
        }
        success, response = self.run_test(
            "Create Tax (Incluido - 5%)",
            "POST",
            "api/impuestos",
            200,
            data=tax_data
        )
        if success and 'id' in response:
            self.created_tax_incluido_id = response['id']
            print(f"   Created tax ID: {self.created_tax_incluido_id}")
        return success

    def test_get_taxes(self):
        """Test getting taxes list"""
        success, response = self.run_test(
            "Get Taxes",
            "GET",
            "api/impuestos",
            200
        )
        if success:
            print(f"   Found {len(response)} taxes")
            for tax in response:
                print(f"     - {tax['nombre']}: {tax['tasa']}% ({tax['tipo']}) - Active: {tax['activo']}")
        return success

    def test_create_invoice_with_taxes(self):
        """Test creating an invoice with tax calculations"""
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
                },
                {
                    "producto_id": self.created_product_id,
                    "nombre": "Producto Test 2",
                    "precio": 40.00,
                    "cantidad": 1,
                    "subtotal": 40.00
                }
            ],
            "total": 100.00
        }
        success, response = self.run_test(
            "Create Invoice with Tax Calculations",
            "POST",
            "api/facturas",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            self.created_invoice_id = response['id']
            print(f"   Created invoice: {response.get('numero')}")
            
            # Validate tax calculations
            subtotal = response.get('subtotal', 0)
            total_impuestos = response.get('total_impuestos', 0)
            desglose_impuestos = response.get('desglose_impuestos', [])
            total = response.get('total', 0)
            
            print(f"   Subtotal: ${subtotal}")
            print(f"   Total Taxes: ${total_impuestos}")
            print(f"   Total: ${total}")
            print(f"   Tax Breakdown:")
            
            expected_subtotal = 100.0  # 60 + 40
            if abs(subtotal - expected_subtotal) > 0.01:
                print(f"   ❌ Subtotal mismatch: expected {expected_subtotal}, got {subtotal}")
                return False
            
            # Validate tax breakdown
            for tax in desglose_impuestos:
                print(f"     - {tax['nombre']}: {tax['tasa']}% ({tax['tipo']}) = ${tax['monto']}")
                
                # Validate tax calculations
                if tax['tipo'] == 'agregado' or tax['tipo'] == 'no_incluido':
                    expected_amount = subtotal * (tax['tasa'] / 100)
                    if abs(tax['monto'] - expected_amount) > 0.01:
                        print(f"     ❌ Tax calculation error for {tax['nombre']}: expected {expected_amount}, got {tax['monto']}")
                        return False
                elif tax['tipo'] == 'incluido':
                    expected_amount = subtotal - (subtotal / (1 + tax['tasa'] / 100))
                    if abs(tax['monto'] - expected_amount) > 0.01:
                        print(f"     ❌ Tax calculation error for {tax['nombre']}: expected {expected_amount}, got {tax['monto']}")
                        return False
            
            # Validate total calculation
            total_agregado = sum(tax['monto'] for tax in desglose_impuestos if tax['tipo'] in ['agregado', 'no_incluido'])
            expected_total = subtotal + total_agregado
            if abs(total - expected_total) > 0.01:
                print(f"   ❌ Total calculation error: expected {expected_total}, got {total}")
                return False
                
            print(f"   ✅ Tax calculations are correct!")
            
        return success

    def test_create_invoice(self):
        """Test creating a simple invoice (legacy test)"""
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
            "Create Simple Invoice",
            "POST",
            "api/facturas",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            print(f"   Created invoice: {response.get('numero')}")
        return success

    def test_get_invoices(self):
        """Test getting invoices list and validate backward compatibility"""
        success, response = self.run_test(
            "Get Invoices (Backward Compatibility)",
            "GET",
            "api/facturas",
            200
        )
        if success:
            print(f"   Found {len(response)} invoices")
            
            # Validate backward compatibility for old invoices
            for invoice in response:
                subtotal = invoice.get('subtotal')
                total_impuestos = invoice.get('total_impuestos', 0)
                desglose_impuestos = invoice.get('desglose_impuestos', [])
                total = invoice.get('total')
                
                print(f"   Invoice {invoice.get('numero')}: Subtotal=${subtotal}, Taxes=${total_impuestos}, Total=${total}")
                
                # For old invoices without tax fields, subtotal should equal total
                if total_impuestos == 0 and len(desglose_impuestos) == 0:
                    if subtotal != total:
                        print(f"   ❌ Backward compatibility issue: old invoice should have subtotal=total")
                        return False
                    print(f"   ✅ Old invoice backward compatibility OK")
                else:
                    print(f"   ✅ New invoice with tax breakdown")
                    
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
            "rol": "cajero"
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

    def test_update_tax(self):
        """Test updating a tax"""
        if not self.created_tax_agregado_id:
            print("❌ No tax ID available for update test")
            return False
            
        updated_tax_data = {
            "nombre": "IVA Actualizado",
            "tasa": 15.0,
            "tipo": "agregado",
            "activo": True
        }
        success, response = self.run_test(
            "Update Tax",
            "PUT",
            f"api/impuestos/{self.created_tax_agregado_id}",
            200,
            data=updated_tax_data
        )
        return success

    def test_delete_taxes(self):
        """Test deleting taxes"""
        success = True
        
        if self.created_tax_agregado_id:
            success1, response = self.run_test(
                "Delete Tax (Agregado)",
                "DELETE",
                f"api/impuestos/{self.created_tax_agregado_id}",
                200
            )
            success = success and success1
            
        if self.created_tax_incluido_id:
            success2, response = self.run_test(
                "Delete Tax (Incluido)",
                "DELETE",
                f"api/impuestos/{self.created_tax_incluido_id}",
                200
            )
            success = success and success2
            
        return success

    def test_get_default_payment_methods(self):
        """Test getting default payment methods (Efectivo and Tarjeta)"""
        success, response = self.run_test(
            "Get Default Payment Methods",
            "GET",
            "api/metodos-pago",
            200
        )
        if success:
            print(f"   Found {len(response)} payment methods")
            
            # Check for default methods
            method_names = [m['nombre'] for m in response]
            efectivo_found = any('Efectivo' in name for name in method_names)
            tarjeta_found = any('Tarjeta' in name for name in method_names)
            
            if efectivo_found and tarjeta_found:
                print("   ✅ Default payment methods 'Efectivo' and 'Tarjeta' found")
                # Store IDs for later use
                for method in response:
                    if 'Efectivo' in method['nombre']:
                        self.efectivo_metodo_id = method['id']
                    elif 'Tarjeta' in method['nombre']:
                        self.tarjeta_metodo_id = method['id']
                return True
            else:
                print(f"   ❌ Missing default payment methods. Found: {method_names}")
                return False
        return success

    def test_create_payment_method(self):
        """Test creating a new payment method (Transferencia)"""
        payment_method_data = {
            "nombre": "Transferencia Bancaria",
            "activo": True
        }
        success, response = self.run_test(
            "Create Payment Method (Transferencia)",
            "POST",
            "api/metodos-pago",
            200,
            data=payment_method_data
        )
        if success and 'id' in response:
            self.created_metodo_pago_id = response['id']
            print(f"   Created payment method ID: {self.created_metodo_pago_id}")
            print(f"   Payment method: {response['nombre']} - Active: {response['activo']}")
        return success

    def test_update_payment_method(self):
        """Test updating a payment method"""
        if not self.created_metodo_pago_id:
            print("❌ No payment method ID available for update test")
            return False
            
        updated_data = {
            "nombre": "Transferencia Bancaria Actualizada",
            "activo": False
        }
        success, response = self.run_test(
            "Update Payment Method",
            "PUT",
            f"api/metodos-pago/{self.created_metodo_pago_id}",
            200,
            data=updated_data
        )
        if success:
            print(f"   Updated payment method: {response['nombre']} - Active: {response['activo']}")
        return success

    def test_create_invoice_with_payment_method(self):
        """Test creating an invoice with payment method integration"""
        if not self.created_product_id:
            print("❌ No product ID available for invoice test")
            return False
            
        if not self.efectivo_metodo_id:
            print("❌ No Efectivo payment method ID available")
            return False
            
        invoice_data = {
            "items": [
                {
                    "producto_id": self.created_product_id,
                    "nombre": "Producto Test con Método de Pago",
                    "precio": 50.00,
                    "cantidad": 2,
                    "subtotal": 100.00
                }
            ],
            "total": 100.00,
            "metodo_pago_id": self.efectivo_metodo_id
        }
        success, response = self.run_test(
            "Create Invoice with Payment Method",
            "POST",
            "api/facturas",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            print(f"   Created invoice: {response.get('numero')}")
            
            # Validate payment method integration
            metodo_pago_id = response.get('metodo_pago_id')
            metodo_pago_nombre = response.get('metodo_pago_nombre')
            
            if metodo_pago_id == self.efectivo_metodo_id:
                print(f"   ✅ Payment method ID correctly stored: {metodo_pago_id}")
            else:
                print(f"   ❌ Payment method ID mismatch: expected {self.efectivo_metodo_id}, got {metodo_pago_id}")
                return False
                
            if metodo_pago_nombre and 'Efectivo' in metodo_pago_nombre:
                print(f"   ✅ Payment method name correctly stored: {metodo_pago_nombre}")
            else:
                print(f"   ❌ Payment method name issue: {metodo_pago_nombre}")
                return False
                
            print(f"   ✅ Payment method integration working correctly!")
            
        return success

    def test_create_invoice_without_payment_method(self):
        """Test creating an invoice without payment method (backward compatibility)"""
        if not self.created_product_id:
            print("❌ No product ID available for invoice test")
            return False
            
        invoice_data = {
            "items": [
                {
                    "producto_id": self.created_product_id,
                    "nombre": "Producto Test sin Método de Pago",
                    "precio": 25.00,
                    "cantidad": 1,
                    "subtotal": 25.00
                }
            ],
            "total": 25.00
            # No metodo_pago_id specified
        }
        success, response = self.run_test(
            "Create Invoice without Payment Method (Backward Compatibility)",
            "POST",
            "api/facturas",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            print(f"   Created invoice: {response.get('numero')}")
            
            # Validate backward compatibility
            metodo_pago_id = response.get('metodo_pago_id')
            metodo_pago_nombre = response.get('metodo_pago_nombre')
            
            if metodo_pago_id is None:
                print(f"   ✅ Backward compatibility: metodo_pago_id is null")
            else:
                print(f"   ❌ Backward compatibility issue: metodo_pago_id should be null, got {metodo_pago_id}")
                return False
                
            if metodo_pago_nombre is None:
                print(f"   ✅ Backward compatibility: metodo_pago_nombre is null")
            else:
                print(f"   ❌ Backward compatibility issue: metodo_pago_nombre should be null, got {metodo_pago_nombre}")
                return False
                
            print(f"   ✅ Backward compatibility working correctly!")
            
        return success

    def test_get_invoices_with_payment_methods(self):
        """Test getting invoices and validate payment method data"""
        success, response = self.run_test(
            "Get Invoices with Payment Methods",
            "GET",
            "api/facturas",
            200
        )
        if success:
            print(f"   Found {len(response)} invoices")
            
            # Validate payment method data in invoices
            invoices_with_payment = 0
            invoices_without_payment = 0
            
            for invoice in response:
                metodo_pago_id = invoice.get('metodo_pago_id')
                metodo_pago_nombre = invoice.get('metodo_pago_nombre')
                
                if metodo_pago_id is not None:
                    invoices_with_payment += 1
                    print(f"   Invoice {invoice.get('numero')}: Payment Method = {metodo_pago_nombre} (ID: {metodo_pago_id})")
                else:
                    invoices_without_payment += 1
                    print(f"   Invoice {invoice.get('numero')}: No payment method (backward compatibility)")
                    
            print(f"   ✅ Invoices with payment method: {invoices_with_payment}")
            print(f"   ✅ Invoices without payment method: {invoices_without_payment}")
                    
        return success

    def test_payment_method_permissions(self):
        """Test that only propietario/admin can manage payment methods"""
        # This test assumes we're logged in as admin, so it should work
        # In a real scenario, we'd test with a cajero user to verify restrictions
        
        test_data = {
            "nombre": "Método de Prueba Permisos",
            "activo": True
        }
        success, response = self.run_test(
            "Payment Method Permissions (Admin)",
            "POST",
            "api/metodos-pago",
            200,
            data=test_data
        )
        if success and 'id' in response:
            # Clean up the test payment method
            cleanup_success, _ = self.run_test(
                "Cleanup Permission Test Method",
                "DELETE",
                f"api/metodos-pago/{response['id']}",
                200
            )
            print(f"   ✅ Admin can create/delete payment methods")
        return success

    def test_delete_payment_method(self):
        """Test deleting a payment method"""
        if not self.created_metodo_pago_id:
            print("❌ No payment method ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Payment Method",
            "DELETE",
            f"api/metodos-pago/{self.created_metodo_pago_id}",
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
    print("🚀 Starting POS Tax System Backend Tests")
    print("=" * 60)
    
    tester = BillingSystemTester()
    
    # Test sequence - focusing on payment methods system testing
    tests = [
        # Basic system tests
        tester.test_root_endpoint,
        tester.test_invalid_login,
        tester.test_admin_login,
        tester.test_get_current_user,
        tester.test_dashboard_stats,
        
        # Product setup for testing
        tester.test_get_products,
        tester.test_create_product,
        tester.test_update_product,
        tester.test_get_product_by_barcode,
        
        # Cash register setup (required for invoices)
        tester.test_open_cash_register,
        tester.test_get_active_cash_register,
        
        # PAYMENT METHODS SYSTEM TESTS - Main focus
        tester.test_get_default_payment_methods,
        tester.test_create_payment_method,
        tester.test_update_payment_method,
        tester.test_payment_method_permissions,
        
        # TAX SYSTEM TESTS (for invoice integration)
        tester.test_create_tax_agregado,
        tester.test_create_tax_incluido,
        tester.test_get_taxes,
        
        # INVOICE INTEGRATION WITH PAYMENT METHODS
        tester.test_create_invoice_with_payment_method,
        tester.test_create_invoice_without_payment_method,
        tester.test_get_invoices_with_payment_methods,
        
        # Additional invoice tests
        tester.test_create_invoice_with_taxes,
        tester.test_create_invoice,  # Simple invoice for comparison
        tester.test_get_invoices,  # Test backward compatibility
        tester.test_update_tax,
        
        # User management tests
        tester.test_get_users,
        tester.test_create_user,
        tester.test_delete_user,
        
        # Cleanup tests
        tester.test_delete_payment_method,
        tester.test_delete_taxes,
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
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        print("\n🔍 Tax System Test Summary:")
        tax_tests = [
            'test_create_tax_agregado',
            'test_create_tax_incluido', 
            'test_get_taxes',
            'test_create_invoice_with_taxes',
            'test_get_invoices',
            'test_update_tax'
        ]
        
        tax_failures = [t for t in failed_tests if t in tax_tests]
        if tax_failures:
            print(f"❌ Tax system failures: {', '.join(tax_failures)}")
        else:
            print("✅ Tax system tests passed!")
            
        return 1
    else:
        print("✅ All tests passed!")
        print("✅ Tax system is working correctly!")
        return 0

if __name__ == "__main__":
    sys.exit(main())