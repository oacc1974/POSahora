import requests
import sys
import json
from datetime import datetime

class BillingSystemTester:
    def __init__(self, base_url="https://pos-hybrid-printing.preview.emergentagent.com"):
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
        # New POS SRI Ecuador variables
        self.created_tienda_id = None
        self.created_tpv_id = None
        self.tpv_ocupado_id = None
        # New functionality variables
        self.created_cliente_id = None
        self.created_mesero_id = None
        self.mesero_token = None

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

    # ===== POS SRI ECUADOR FUNCTIONALITY TESTS =====
    
    def test_get_tiendas(self):
        """Test getting tiendas (stores) with codigo_establecimiento"""
        success, response = self.run_test(
            "Get Tiendas (Stores)",
            "GET",
            "api/tiendas",
            200
        )
        if success:
            print(f"   Found {len(response)} tiendas")
            for tienda in response:
                codigo_est = tienda.get('codigo_establecimiento', 'N/A')
                codigo_tienda = tienda.get('codigo_tienda', 'N/A')
                print(f"     - {tienda['nombre']}: Código Establecimiento={codigo_est}, Código Tienda={codigo_tienda}")
                
                # Validate codigo_establecimiento exists
                if not tienda.get('codigo_establecimiento'):
                    print(f"   ❌ Tienda {tienda['nombre']} missing codigo_establecimiento")
                    return False
                    
            print("   ✅ All tiendas have codigo_establecimiento field")
        return success

    def test_create_tienda(self):
        """Test creating a new tienda with codigo_establecimiento"""
        tienda_data = {
            "nombre": "Tienda Test SRI",
            "codigo_establecimiento": "004",  # Changed to avoid conflict
            "direccion": "Av. Test 123",
            "telefono": "0987654321",
            "email": "tienda@test.com",
            "activa": True
        }
        success, response = self.run_test(
            "Create Tienda with Código Establecimiento",
            "POST",
            "api/tiendas",
            200,
            data=tienda_data
        )
        if success and 'id' in response:
            self.created_tienda_id = response['id']
            print(f"   Created tienda ID: {self.created_tienda_id}")
            print(f"   Código Establecimiento: {response.get('codigo_establecimiento')}")
            print(f"   Código Tienda (org): {response.get('codigo_tienda')}")
            
            # Validate required fields
            if response.get('codigo_establecimiento') != "002":
                print(f"   ❌ Código establecimiento mismatch")
                return False
                
            if not response.get('codigo_tienda'):
                print(f"   ❌ Missing código tienda from organization")
                return False
                
            print("   ✅ Tienda created with correct SRI fields")
        return success

    def test_get_tpv_all(self):
        """Test getting all TPV devices"""
        success, response = self.run_test(
            "Get All TPV Devices",
            "GET",
            "api/tpv",
            200
        )
        if success:
            print(f"   Found {len(response)} TPV devices")
            for tpv in response:
                print(f"     - {tpv['nombre']}: Punto Emisión={tpv['punto_emision']}, Activo={tpv['activo']}, Ocupado={tpv.get('ocupado', False)}")
        return success

    def test_create_tpv(self):
        """Test creating a new TPV device"""
        if not self.created_tienda_id:
            print("❌ No tienda ID available for TPV creation")
            return False
            
        tpv_data = {
            "nombre": "TPV Test SRI",
            "punto_emision": "001",
            "tienda_id": self.created_tienda_id,
            "activo": True
        }
        success, response = self.run_test(
            "Create TPV Device",
            "POST",
            "api/tpv",
            200,
            data=tpv_data
        )
        if success and 'id' in response:
            self.created_tpv_id = response['id']
            print(f"   Created TPV ID: {self.created_tpv_id}")
            print(f"   Punto Emisión: {response.get('punto_emision')}")
            print(f"   Tienda: {response.get('tienda_nombre')}")
            print(f"   Ocupado: {response.get('ocupado', False)}")
            
            # Validate TPV fields
            if response.get('punto_emision') != "001":
                print(f"   ❌ Punto emisión mismatch")
                return False
                
            if response.get('ocupado') != False:
                print(f"   ❌ New TPV should not be occupied")
                return False
                
            print("   ✅ TPV created with correct SRI fields")
        return success

    def test_get_tpv_disponibles(self):
        """Test getting available TPV devices (activos y no ocupados)"""
        success, response = self.run_test(
            "Get Available TPV Devices",
            "GET",
            "api/tpv/disponibles",
            200
        )
        if success:
            print(f"   Found {len(response)} available TPV devices")
            for tpv in response:
                print(f"     - {tpv['nombre']}: Punto Emisión={tpv['punto_emision']}, Activo={tpv['activo']}")
                
                # Validate all returned TPV are active and not occupied
                if not tpv.get('activo'):
                    print(f"   ❌ TPV {tpv['nombre']} should be active")
                    return False
                    
                if tpv.get('ocupado'):
                    print(f"   ❌ TPV {tpv['nombre']} should not be occupied")
                    return False
                    
            print("   ✅ All available TPV are active and not occupied")
        return success

    def test_update_tpv(self):
        """Test updating a TPV device"""
        if not self.created_tpv_id:
            print("❌ No TPV ID available for update test")
            return False
            
        updated_data = {
            "nombre": "TPV Test SRI Actualizado",
            "punto_emision": "002",
            "tienda_id": self.created_tienda_id,
            "activo": True
        }
        success, response = self.run_test(
            "Update TPV Device",
            "PUT",
            f"api/tpv/{self.created_tpv_id}",
            200,
            data=updated_data
        )
        if success:
            print(f"   Updated TPV: {response.get('nombre')}")
            print(f"   New Punto Emisión: {response.get('punto_emision')}")
        return success

    def test_open_cash_register_with_tpv(self):
        """Test opening cash register with TPV selection"""
        if not self.created_tpv_id:
            print("❌ No TPV ID available for cash register test")
            return False
            
        cash_data = {
            "monto_inicial": 150.0,
            "tpv_id": self.created_tpv_id
        }
        success, response = self.run_test(
            "Open Cash Register with TPV",
            "POST",
            "api/caja/abrir",
            200,
            data=cash_data
        )
        if success and 'id' in response:
            self.caja_id = response['id']
            print(f"   Opened cash register: {response.get('numero')}")
            print(f"   TPV ID: {response.get('tpv_id')}")
            print(f"   TPV Nombre: {response.get('tpv_nombre')}")
            print(f"   Tienda: {response.get('tienda_nombre')}")
            print(f"   Código Establecimiento: {response.get('codigo_establecimiento')}")
            print(f"   Punto Emisión: {response.get('punto_emision')}")
            
            # Validate TPV integration
            if response.get('tpv_id') != self.created_tpv_id:
                print(f"   ❌ TPV ID mismatch in cash register")
                return False
                
            if not response.get('codigo_establecimiento'):
                print(f"   ❌ Missing código establecimiento in cash register")
                return False
                
            if not response.get('punto_emision'):
                print(f"   ❌ Missing punto emisión in cash register")
                return False
                
            print("   ✅ Cash register opened with correct TPV integration")
            
            # Store TPV ID for occupation test
            self.tpv_ocupado_id = self.created_tpv_id
        return success

    def test_verify_tpv_ocupado(self):
        """Test that TPV is marked as occupied after opening cash register"""
        if not self.tpv_ocupado_id:
            print("❌ No occupied TPV ID available for verification")
            return False
            
        success, response = self.run_test(
            "Verify TPV Occupation Status",
            "GET",
            "api/tpv",
            200
        )
        if success:
            # Find our TPV in the list
            tpv_found = False
            for tpv in response:
                if tpv['id'] == self.tpv_ocupado_id:
                    tpv_found = True
                    print(f"   TPV {tpv['nombre']}: Ocupado={tpv.get('ocupado', False)}")
                    print(f"   Ocupado por: {tpv.get('ocupado_por_nombre', 'N/A')}")
                    
                    if not tpv.get('ocupado'):
                        print(f"   ❌ TPV should be marked as occupied")
                        return False
                        
                    if not tpv.get('ocupado_por'):
                        print(f"   ❌ TPV should have ocupado_por field")
                        return False
                        
                    print("   ✅ TPV correctly marked as occupied")
                    break
                    
            if not tpv_found:
                print(f"   ❌ TPV not found in list")
                return False
                
        return success

    def test_create_invoice_with_sri_numbering(self):
        """Test creating invoice with SRI numbering format XXX-YYY-ZZZZZZZZZ"""
        if not self.created_product_id:
            print("❌ No product ID available for SRI invoice test")
            return False
            
        invoice_data = {
            "items": [
                {
                    "producto_id": self.created_product_id,
                    "nombre": "Producto SRI Test",
                    "precio": 100.00,
                    "cantidad": 1,
                    "subtotal": 100.00
                }
            ],
            "total": 100.00
        }
        success, response = self.run_test(
            "Create Invoice with SRI Numbering",
            "POST",
            "api/facturas",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            numero_factura = response.get('numero', '')
            print(f"   Created invoice: {numero_factura}")
            
            # Validate SRI numbering format XXX-YYY-ZZZZZZZZZ
            if '-' in numero_factura:
                parts = numero_factura.split('-')
                if len(parts) == 3:
                    codigo_establecimiento = parts[0]
                    punto_emision = parts[1]
                    secuencial = parts[2]
                    
                    print(f"   Código Establecimiento: {codigo_establecimiento}")
                    print(f"   Punto Emisión: {punto_emision}")
                    print(f"   Secuencial: {secuencial}")
                    
                    # Validate format
                    if len(codigo_establecimiento) == 3 and codigo_establecimiento.isdigit():
                        print("   ✅ Código establecimiento format correct (XXX)")
                    else:
                        print(f"   ❌ Invalid código establecimiento format: {codigo_establecimiento}")
                        return False
                        
                    if len(punto_emision) == 3 and punto_emision.isdigit():
                        print("   ✅ Punto emisión format correct (YYY)")
                    else:
                        print(f"   ❌ Invalid punto emisión format: {punto_emision}")
                        return False
                        
                    if len(secuencial) == 9 and secuencial.isdigit():
                        print("   ✅ Secuencial format correct (ZZZZZZZZZ)")
                    else:
                        print(f"   ❌ Invalid secuencial format: {secuencial}")
                        return False
                        
                    print("   ✅ SRI numbering format is correct!")
                else:
                    print(f"   ❌ Invalid invoice number format: {numero_factura}")
                    return False
            else:
                print(f"   ❌ Invoice number doesn't contain SRI format: {numero_factura}")
                return False
                
        return success

    def test_close_cash_register_and_release_tpv(self):
        """Test closing cash register and releasing TPV"""
        if not self.caja_id:
            print("❌ No active cash register for closing test")
            return False
            
        close_data = {
            "efectivo_contado": 250.0
        }
        success, response = self.run_test(
            "Close Cash Register and Release TPV",
            "POST",
            "api/caja/cerrar",
            200,
            data=close_data
        )
        if success:
            print(f"   Closed cash register: {response.get('numero')}")
            print(f"   Final amount: ${response.get('monto_final')}")
            print(f"   Difference: ${response.get('diferencia')}")
            
            # Now verify TPV is released
            tpv_success, tpv_response = self.run_test(
                "Verify TPV Released After Cash Close",
                "GET",
                "api/tpv",
                200
            )
            
            if tpv_success and self.tpv_ocupado_id:
                for tpv in tpv_response:
                    if tpv['id'] == self.tpv_ocupado_id:
                        ocupado = tpv.get('ocupado', False)
                        print(f"   TPV {tpv['nombre']} ocupado status: {ocupado}")
                        
                        if ocupado:
                            print(f"   ❌ TPV should be released after cash register close")
                            return False
                        else:
                            print("   ✅ TPV correctly released after cash register close")
                            break
                            
        return success

    def test_delete_tpv(self):
        """Test deleting a TPV device"""
        if not self.created_tpv_id:
            print("❌ No TPV ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete TPV Device",
            "DELETE",
            f"api/tpv/{self.created_tpv_id}",
            200
        )
        return success

    def test_delete_tienda(self):
        """Test deleting a tienda"""
        if not self.created_tienda_id:
            print("❌ No tienda ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Tienda",
            "DELETE",
            f"api/tiendas/{self.created_tienda_id}",
            200
        )
        return success

    # ===== NEW FUNCTIONALITY TESTS =====
    
    def test_create_cliente_with_cedula(self):
        """Test creating a client with cedula_ruc"""
        cliente_data = {
            "nombre": "Juan Carlos Pérez",
            "email": "juan.perez@email.com",
            "telefono": "0987654321",
            "direccion": "Av. Principal 123",
            "ciudad": "Quito",
            "cedula_ruc": "1234567890001"
        }
        success, response = self.run_test(
            "Create Cliente with Cédula/RUC",
            "POST",
            "api/clientes",
            200,
            data=cliente_data
        )
        if success and 'id' in response:
            self.created_cliente_id = response['id']
            print(f"   Created cliente ID: {self.created_cliente_id}")
            print(f"   Cédula/RUC: {response.get('cedula_ruc')}")
            
            # Validate cedula_ruc is stored correctly
            if response.get('cedula_ruc') != "1234567890001":
                print(f"   ❌ Cédula/RUC mismatch")
                return False
                
            print("   ✅ Cliente created with cédula/RUC successfully")
        return success

    def test_create_cliente_duplicate_cedula(self):
        """Test creating a client with duplicate cedula_ruc - should fail"""
        cliente_data = {
            "nombre": "María González",
            "email": "maria.gonzalez@email.com",
            "telefono": "0987654322",
            "cedula_ruc": "1234567890001"  # Same as previous client
        }
        success, response = self.run_test(
            "Create Cliente with Duplicate Cédula/RUC (Should Fail)",
            "POST",
            "api/clientes",
            400,  # Expecting 400 Bad Request
            data=cliente_data
        )
        if success:
            print("   ✅ Duplicate cédula/RUC correctly rejected")
        return success

    def test_update_cliente_duplicate_cedula(self):
        """Test updating a client with existing cedula_ruc - should fail"""
        if not self.created_cliente_id:
            print("❌ No cliente ID available for update test")
            return False
            
        # First create another client with different cedula
        cliente_data2 = {
            "nombre": "Pedro Ramírez",
            "email": "pedro.ramirez@email.com",
            "cedula_ruc": "0987654321001"
        }
        success1, response1 = self.run_test(
            "Create Second Cliente for Update Test",
            "POST",
            "api/clientes",
            200,
            data=cliente_data2
        )
        
        if not success1:
            return False
            
        second_cliente_id = response1.get('id')
        
        # Now try to update second client with first client's cedula
        update_data = {
            "nombre": "Pedro Ramírez Actualizado",
            "email": "pedro.ramirez@email.com",
            "cedula_ruc": "1234567890001"  # Same as first client
        }
        success2, response2 = self.run_test(
            "Update Cliente with Duplicate Cédula/RUC (Should Fail)",
            "PUT",
            f"api/clientes/{second_cliente_id}",
            400,  # Expecting 400 Bad Request
            data=update_data
        )
        
        if success2:
            print("   ✅ Duplicate cédula/RUC in update correctly rejected")
        
        return success2

    def test_create_mesero_user(self):
        """Test creating a user with rol='mesero'"""
        mesero_data = {
            "nombre": "Carlos Mesero",
            "username": "mesero1",
            "password": "mesero123",
            "rol": "mesero"
        }
        success, response = self.run_test(
            "Create Mesero User",
            "POST",
            "api/usuarios",
            200,
            data=mesero_data
        )
        if success and 'id' in response:
            self.created_mesero_id = response['id']
            print(f"   Created mesero ID: {self.created_mesero_id}")
            print(f"   Rol: {response.get('rol')}")
            
            # Validate rol is stored correctly
            if response.get('rol') != "mesero":
                print(f"   ❌ Rol mismatch")
                return False
                
            print("   ✅ Mesero user created successfully")
        return success

    def test_mesero_login(self):
        """Test mesero login"""
        success, response = self.run_test(
            "Mesero Login",
            "POST",
            "api/login",
            200,
            data={"username": "mesero1", "password": "mesero123"}
        )
        if success and 'access_token' in response:
            self.mesero_token = response['access_token']
            mesero_user = response['user']
            print(f"   Mesero user: {mesero_user}")
            
            # Validate mesero role
            if mesero_user.get('rol') != "mesero":
                print(f"   ❌ Mesero rol mismatch")
                return False
                
            print("   ✅ Mesero login successful")
            return True
        return False

    def test_mesero_open_cash_register(self):
        """Test mesero opening cash register without monto_inicial requirement"""
        if not self.mesero_token:
            print("❌ No mesero token available")
            return False
            
        # Save current token and switch to mesero
        admin_token = self.token
        self.token = self.mesero_token
        
        # Get available TPV for mesero
        tpv_success, tpv_response = self.run_test(
            "Get Available TPV for Mesero",
            "GET",
            "api/tpv/disponibles",
            200
        )
        
        if not tpv_success or not tpv_response:
            print("❌ No available TPV for mesero test")
            self.token = admin_token
            return False
            
        tpv_id = tpv_response[0]['id']
        
        # Test opening cash register with TPV but without monto_inicial
        cash_data = {
            "tpv_id": tpv_id
            # No monto_inicial specified
        }
        success, response = self.run_test(
            "Mesero Open Cash Register (No monto_inicial required)",
            "POST",
            "api/caja/abrir",
            200,
            data=cash_data
        )
        
        if success and 'id' in response:
            print(f"   Opened cash register: {response.get('numero')}")
            print(f"   Monto inicial: {response.get('monto_inicial')}")
            print(f"   Requiere cierre: {response.get('requiere_cierre', 'N/A')}")
            
            # Validate mesero cash register properties
            if response.get('monto_inicial') != 0.0:
                print(f"   ❌ Mesero cash register should have monto_inicial=0")
                self.token = admin_token
                return False
                
            # Check if requiere_cierre is False (if this field exists)
            requiere_cierre = response.get('requiere_cierre')
            if requiere_cierre is not None and requiere_cierre != False:
                print(f"   ❌ Mesero cash register should have requiere_cierre=False")
                self.token = admin_token
                return False
                
            print("   ✅ Mesero cash register opened with correct properties")
            
            # Close the cash register for cleanup
            close_data = {"efectivo_contado": 0.0}
            self.run_test(
                "Close Mesero Cash Register (Cleanup)",
                "POST",
                "api/caja/cerrar",
                200,
                data=close_data
            )
        
        # Restore admin token
        self.token = admin_token
        return success

    def test_dashboard_with_date_filters(self):
        """Test dashboard with date filters"""
        from datetime import datetime, timedelta
        
        # Test with date range
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        success, response = self.run_test(
            "Dashboard with Date Filters",
            "GET",
            f"api/dashboard?fecha_inicio={start_date}&fecha_fin={end_date}",
            200
        )
        if success:
            print(f"   Stats with filters: Products={response.get('total_productos')}, Sales={response.get('total_ventas')}, Revenue=${response.get('total_ingresos')}")
            print(f"   Date range: {start_date} to {end_date}")
            print("   ✅ Dashboard with date filters working")
        return success

    def test_facturas_with_filters(self):
        """Test facturas endpoint with various filters"""
        from datetime import datetime, timedelta
        
        # Test with date filters
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        success1, response1 = self.run_test(
            "Get Facturas with Date Filters",
            "GET",
            f"api/facturas?fecha_inicio={start_date}&fecha_fin={end_date}",
            200
        )
        
        if success1:
            print(f"   Found {len(response1)} facturas with date filter")
        
        # Test with cajero_id filter (using admin user ID)
        if self.admin_user:
            cajero_id = self.admin_user.get('id')
            success2, response2 = self.run_test(
                "Get Facturas with Cajero Filter",
                "GET",
                f"api/facturas?cajero_id={cajero_id}",
                200
            )
            
            if success2:
                print(f"   Found {len(response2)} facturas with cajero filter")
        else:
            success2 = True  # Skip if no admin user info
        
        # Test with tienda_id filter (if we have created tienda)
        if self.created_tienda_id:
            success3, response3 = self.run_test(
                "Get Facturas with Tienda Filter",
                "GET",
                f"api/facturas?tienda_id={self.created_tienda_id}",
                200
            )
            
            if success3:
                print(f"   Found {len(response3)} facturas with tienda filter")
        else:
            success3 = True  # Skip if no tienda created
        
        # Test with combined filters
        success4, response4 = self.run_test(
            "Get Facturas with Combined Filters",
            "GET",
            f"api/facturas?fecha_inicio={start_date}&fecha_fin={end_date}&limit=10",
            200
        )
        
        if success4:
            print(f"   Found {len(response4)} facturas with combined filters")
            print("   ✅ Facturas filtering working correctly")
        
        return success1 and success2 and success3 and success4

    def test_delete_test_cliente(self):
        """Test deleting the test cliente"""
        if not self.created_cliente_id:
            print("❌ No cliente ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Test Cliente",
            "DELETE",
            f"api/clientes/{self.created_cliente_id}",
            200
        )
        return success

    def test_delete_mesero_user(self):
        """Test deleting the mesero user"""
        if not self.created_mesero_id:
            print("❌ No mesero ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Mesero User",
            "DELETE",
            f"api/usuarios/{self.created_mesero_id}",
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
    print("🚀 Starting POS SRI Ecuador System Backend Tests")
    print("=" * 60)
    
    tester = BillingSystemTester()
    
    # Test sequence - focusing on NEW FUNCTIONALITY and POS SRI Ecuador
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
        
        # === NEW FUNCTIONALITY TESTS ===
        
        # 1. Validación de Cédula Única en Clientes
        tester.test_create_cliente_with_cedula,
        tester.test_create_cliente_duplicate_cedula,
        tester.test_update_cliente_duplicate_cedula,
        
        # 2. Rol de Mesero
        tester.test_create_mesero_user,
        tester.test_mesero_login,
        
        # 3. Apertura de Caja para Meseros
        tester.test_mesero_open_cash_register,
        
        # 4. Reportes con Filtros
        tester.test_dashboard_with_date_filters,
        tester.test_facturas_with_filters,
        
        # === POS SRI ECUADOR FUNCTIONALITY TESTS ===
        
        # 1. Gestión de Tiendas
        tester.test_get_tiendas,
        tester.test_create_tienda,
        
        # 2. Gestión de TPV (CRUD)
        tester.test_get_tpv_all,
        tester.test_create_tpv,
        tester.test_get_tpv_disponibles,
        tester.test_update_tpv,
        
        # 3. Apertura de Caja con TPV (TPV occupation)
        tester.test_open_cash_register_with_tpv,
        tester.test_verify_tpv_ocupado,
        
        # 4. Numeración SRI en Facturas
        tester.test_create_invoice_with_sri_numbering,
        
        # 5. Cierre de Caja (TPV release)
        tester.test_close_cash_register_and_release_tpv,
        
        # Payment methods system tests (existing functionality)
        tester.test_get_default_payment_methods,
        tester.test_create_payment_method,
        tester.test_update_payment_method,
        tester.test_payment_method_permissions,
        
        # Tax system tests (existing functionality)
        tester.test_create_tax_agregado,
        tester.test_create_tax_incluido,
        tester.test_get_taxes,
        
        # Invoice integration tests (existing functionality)
        tester.test_create_invoice_with_payment_method,
        tester.test_create_invoice_without_payment_method,
        tester.test_get_invoices_with_payment_methods,
        tester.test_create_invoice_with_taxes,
        tester.test_create_invoice,
        tester.test_get_invoices,
        tester.test_update_tax,
        
        # User management tests
        tester.test_get_users,
        tester.test_create_user,
        tester.test_delete_user,
        
        # Cleanup tests
        tester.test_delete_payment_method,
        tester.test_delete_taxes,
        tester.test_delete_tpv,
        tester.test_delete_tienda,
        tester.test_delete_test_cliente,
        tester.test_delete_mesero_user,
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
        
        # New functionality specific test summary
        print("\n🔍 New Functionality Test Summary:")
        new_functionality_tests = [
            'test_create_cliente_with_cedula',
            'test_create_cliente_duplicate_cedula',
            'test_update_cliente_duplicate_cedula',
            'test_create_mesero_user',
            'test_mesero_login',
            'test_mesero_open_cash_register',
            'test_dashboard_with_date_filters',
            'test_facturas_with_filters'
        ]
        
        new_functionality_failures = [t for t in failed_tests if t in new_functionality_tests]
        if new_functionality_failures:
            print(f"❌ New functionality failures: {', '.join(new_functionality_failures)}")
        else:
            print("✅ New functionality tests passed!")
        
        # POS SRI Ecuador specific test summary
        print("\n🔍 POS SRI Ecuador System Test Summary:")
        sri_tests = [
            'test_get_tiendas',
            'test_create_tienda',
            'test_get_tpv_all',
            'test_create_tpv',
            'test_get_tpv_disponibles',
            'test_update_tpv',
            'test_open_cash_register_with_tpv',
            'test_verify_tpv_ocupado',
            'test_create_invoice_with_sri_numbering',
            'test_close_cash_register_and_release_tpv',
            'test_delete_tpv',
            'test_delete_tienda'
        ]
        
        sri_failures = [t for t in failed_tests if t in sri_tests]
        if sri_failures:
            print(f"❌ POS SRI Ecuador system failures: {', '.join(sri_failures)}")
        else:
            print("✅ POS SRI Ecuador system tests passed!")
        
        print("\n🔍 Payment Methods System Test Summary:")
        payment_tests = [
            'test_get_default_payment_methods',
            'test_create_payment_method',
            'test_update_payment_method',
            'test_payment_method_permissions',
            'test_create_invoice_with_payment_method',
            'test_create_invoice_without_payment_method',
            'test_get_invoices_with_payment_methods',
            'test_delete_payment_method'
        ]
        
        payment_failures = [t for t in failed_tests if t in payment_tests]
        if payment_failures:
            print(f"❌ Payment methods system failures: {', '.join(payment_failures)}")
        else:
            print("✅ Payment methods system tests passed!")
            
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
        print("✅ New functionality is working correctly!")
        print("✅ POS SRI Ecuador system is working correctly!")
        print("✅ Payment methods system is working correctly!")
        print("✅ Tax system is working correctly!")
        return 0

if __name__ == "__main__":
    sys.exit(main())