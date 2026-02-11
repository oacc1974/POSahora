#!/usr/bin/env python3
"""
Focused Tax System Test for POS System
Tests the complete tax calculation and breakdown functionality
"""

import requests
import json
import sys
from datetime import datetime

class TaxSystemTester:
    def __init__(self, base_url="https://pos-kitchen-print.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_taxes = []
        self.created_product_id = None

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

    def login_admin(self):
        """Login as admin to get token"""
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
            print(f"   Logged in as: {self.admin_user['nombre']}")
            return True
        return False

    def setup_test_product(self):
        """Create a test product for invoice testing"""
        product_data = {
            "nombre": "Producto Prueba Impuestos",
            "precio": 50.00,
            "codigo_barras": "TAX123456789",
            "descripcion": "Producto para probar cálculo de impuestos",
            "stock": 100
        }
        success, response = self.run_test(
            "Create Test Product",
            "POST",
            "api/productos",
            200,
            data=product_data
        )
        if success and 'id' in response:
            self.created_product_id = response['id']
            print(f"   Created product ID: {self.created_product_id}")
        return success

    def test_create_agregado_tax(self):
        """Test creating an 'agregado' type tax (IVA 12%)"""
        tax_data = {
            "nombre": "IVA Test",
            "tasa": 12.0,
            "tipo": "agregado",
            "activo": True
        }
        success, response = self.run_test(
            "Create Agregado Tax (IVA 12%)",
            "POST",
            "api/impuestos",
            200,
            data=tax_data
        )
        if success and 'id' in response:
            self.created_taxes.append({
                'id': response['id'],
                'nombre': response['nombre'],
                'tasa': response['tasa'],
                'tipo': response['tipo']
            })
            print(f"   Created tax: {response['nombre']} - {response['tasa']}% ({response['tipo']})")
        return success

    def test_create_incluido_tax(self):
        """Test creating an 'incluido' type tax (Impuesto Incluido 5%)"""
        tax_data = {
            "nombre": "Impuesto Incluido Test",
            "tasa": 5.0,
            "tipo": "incluido",
            "activo": True
        }
        success, response = self.run_test(
            "Create Incluido Tax (5%)",
            "POST",
            "api/impuestos",
            200,
            data=tax_data
        )
        if success and 'id' in response:
            self.created_taxes.append({
                'id': response['id'],
                'nombre': response['nombre'],
                'tasa': response['tasa'],
                'tipo': response['tipo']
            })
            print(f"   Created tax: {response['nombre']} - {response['tasa']}% ({response['tipo']})")
        return success

    def test_list_taxes(self):
        """Test listing taxes and verify they have activo: true"""
        success, response = self.run_test(
            "List Active Taxes",
            "GET",
            "api/impuestos",
            200
        )
        if success:
            active_taxes = [tax for tax in response if tax.get('activo', False)]
            print(f"   Found {len(active_taxes)} active taxes:")
            for tax in active_taxes:
                print(f"     - {tax['nombre']}: {tax['tasa']}% ({tax['tipo']}) - Active: {tax['activo']}")
            
            # Verify our created taxes are in the list
            created_tax_ids = [tax['id'] for tax in self.created_taxes]
            found_taxes = [tax for tax in response if tax['id'] in created_tax_ids]
            
            if len(found_taxes) == len(self.created_taxes):
                print(f"   ✅ All created taxes found and active")
            else:
                print(f"   ❌ Missing some created taxes")
                return False
                
        return success

    def test_check_products_exist(self):
        """Verify that products exist in the database"""
        success, response = self.run_test(
            "Check Products Exist",
            "GET",
            "api/productos",
            200
        )
        if success:
            print(f"   Found {len(response)} products in database")
            if len(response) == 0:
                print(f"   ❌ No products found - cannot test invoices")
                return False
        return success

    def test_check_cash_register(self):
        """Check if cash register is open, open one if needed"""
        success, response = self.run_test(
            "Check Active Cash Register",
            "GET",
            "api/caja/activa",
            200
        )
        
        if success and response:
            print(f"   Active cash register: {response.get('numero')}")
            return True
        else:
            # Try to open a cash register
            print("   No active cash register, attempting to open one...")
            cash_data = {"monto_inicial": 100.0}
            success2, response2 = self.run_test(
                "Open Cash Register",
                "POST",
                "api/caja/abrir",
                200,
                data=cash_data
            )
            if success2:
                print(f"   Opened cash register: {response2.get('numero')}")
                return True
            else:
                print("   ❌ Could not open cash register")
                return False

    def test_create_invoice_with_tax_calculation(self):
        """Test creating an invoice and verify tax calculations"""
        if not self.created_product_id:
            print("❌ No product available for invoice test")
            return False
            
        # Create invoice with 2 items for comprehensive testing
        invoice_data = {
            "items": [
                {
                    "producto_id": self.created_product_id,
                    "nombre": "Producto Prueba Impuestos",
                    "precio": 50.00,
                    "cantidad": 2,
                    "subtotal": 100.00
                },
                {
                    "producto_id": self.created_product_id,
                    "nombre": "Producto Prueba 2",
                    "precio": 25.00,
                    "cantidad": 2,
                    "subtotal": 50.00
                }
            ],
            "total": 150.00
        }
        
        success, response = self.run_test(
            "Create Invoice with Tax Calculations",
            "POST",
            "api/facturas",
            200,
            data=invoice_data
        )
        
        if success:
            print(f"   Created invoice: {response.get('numero')}")
            
            # Extract tax calculation fields
            subtotal = response.get('subtotal', 0)
            total_impuestos = response.get('total_impuestos', 0)
            desglose_impuestos = response.get('desglose_impuestos', [])
            total = response.get('total', 0)
            
            print(f"\n   📊 TAX CALCULATION RESULTS:")
            print(f"   Subtotal: ${subtotal}")
            print(f"   Total Taxes: ${total_impuestos}")
            print(f"   Final Total: ${total}")
            
            # Validate subtotal
            expected_subtotal = 150.0  # 100 + 50
            if abs(subtotal - expected_subtotal) > 0.01:
                print(f"   ❌ Subtotal error: expected ${expected_subtotal}, got ${subtotal}")
                return False
            
            print(f"\n   📋 TAX BREAKDOWN:")
            calculated_total_taxes = 0
            total_agregado_taxes = 0
            
            for tax in desglose_impuestos:
                print(f"     - {tax['nombre']}: {tax['tasa']}% ({tax['tipo']}) = ${tax['monto']}")
                
                # Validate individual tax calculations
                if tax['tipo'] == 'agregado' or tax['tipo'] == 'no_incluido':
                    # Both 'agregado' and 'no_incluido' are added to subtotal
                    expected_amount = subtotal * (tax['tasa'] / 100)
                    total_agregado_taxes += tax['monto']
                elif tax['tipo'] == 'incluido':
                    expected_amount = subtotal - (subtotal / (1 + tax['tasa'] / 100))
                else:
                    print(f"     ❌ Unknown tax type: {tax['tipo']}")
                    return False
                
                if abs(tax['monto'] - expected_amount) > 0.01:
                    print(f"     ❌ Tax calculation error for {tax['nombre']}")
                    print(f"       Expected: ${expected_amount:.2f}, Got: ${tax['monto']}")
                    return False
                
                calculated_total_taxes += tax['monto']
            
            # Validate total tax amount
            if abs(total_impuestos - calculated_total_taxes) > 0.01:
                print(f"   ❌ Total taxes mismatch: expected ${calculated_total_taxes:.2f}, got ${total_impuestos}")
                return False
            
            # Validate final total calculation
            # For agregado taxes: total = subtotal + agregado_taxes
            # For incluido taxes: they're already included in the subtotal
            expected_total = subtotal + total_agregado_taxes
            if abs(total - expected_total) > 0.01:
                print(f"   ❌ Final total error: expected ${expected_total:.2f}, got ${total}")
                return False
            
            print(f"\n   ✅ ALL TAX CALCULATIONS ARE MATHEMATICALLY CORRECT!")
            
            # Validate required fields are present
            required_fields = ['subtotal', 'total_impuestos', 'desglose_impuestos', 'total']
            for field in required_fields:
                if field not in response:
                    print(f"   ❌ Missing required field: {field}")
                    return False
            
            print(f"   ✅ All required tax fields present in response")
            
        return success

    def test_backward_compatibility(self):
        """Test that old invoices (without taxes) are handled correctly"""
        success, response = self.run_test(
            "Test Backward Compatibility",
            "GET",
            "api/facturas",
            200
        )
        
        if success:
            print(f"   Found {len(response)} total invoices")
            
            old_invoices = []
            new_invoices = []
            
            for invoice in response:
                total_impuestos = invoice.get('total_impuestos', 0)
                desglose_impuestos = invoice.get('desglose_impuestos', [])
                
                if total_impuestos == 0 and len(desglose_impuestos) == 0:
                    old_invoices.append(invoice)
                else:
                    new_invoices.append(invoice)
            
            print(f"   Old invoices (no taxes): {len(old_invoices)}")
            print(f"   New invoices (with taxes): {len(new_invoices)}")
            
            # Validate old invoices have subtotal = total
            for invoice in old_invoices:
                subtotal = invoice.get('subtotal', invoice.get('total'))
                total = invoice.get('total')
                
                if subtotal != total:
                    print(f"   ❌ Old invoice {invoice.get('numero')} backward compatibility issue")
                    print(f"     Subtotal: ${subtotal}, Total: ${total}")
                    return False
            
            print(f"   ✅ Backward compatibility verified for old invoices")
            
            # Validate new invoices have proper tax structure
            for invoice in new_invoices:
                if 'desglose_impuestos' not in invoice:
                    print(f"   ❌ New invoice {invoice.get('numero')} missing tax breakdown")
                    return False
            
            print(f"   ✅ New invoices have proper tax structure")
            
        return success

    def cleanup_created_taxes(self):
        """Clean up created taxes"""
        success = True
        for tax in self.created_taxes:
            success_del, _ = self.run_test(
                f"Delete Tax {tax['nombre']}",
                "DELETE",
                f"api/impuestos/{tax['id']}",
                200
            )
            success = success and success_del
        return success

    def cleanup_created_product(self):
        """Clean up created product"""
        if self.created_product_id:
            success, _ = self.run_test(
                "Delete Test Product",
                "DELETE",
                f"api/productos/{self.created_product_id}",
                200
            )
            return success
        return True

def main():
    print("🧮 TAX SYSTEM COMPREHENSIVE TEST")
    print("=" * 50)
    print("Testing POS tax calculation and breakdown functionality")
    print("=" * 50)
    
    tester = TaxSystemTester()
    
    # Test sequence focusing on tax system
    test_sequence = [
        ("Setup", [
            tester.login_admin,
            tester.setup_test_product,
            tester.test_check_products_exist,
            tester.test_check_cash_register,
        ]),
        ("Tax Management", [
            tester.test_create_agregado_tax,
            tester.test_create_incluido_tax,
            tester.test_list_taxes,
        ]),
        ("Tax Calculations", [
            tester.test_create_invoice_with_tax_calculation,
            tester.test_backward_compatibility,
        ]),
        ("Cleanup", [
            tester.cleanup_created_taxes,
            tester.cleanup_created_product,
        ])
    ]
    
    failed_tests = []
    
    for section_name, tests in test_sequence:
        print(f"\n🔧 {section_name} Tests:")
        print("-" * 30)
        
        for test in tests:
            try:
                if not test():
                    failed_tests.append(test.__name__)
                    if section_name == "Setup":
                        print(f"❌ Setup failed, stopping tests")
                        break
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
                failed_tests.append(test.__name__)
                if section_name == "Setup":
                    break
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 TAX SYSTEM TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        
        # Categorize failures
        critical_failures = [t for t in failed_tests if 'tax' in t.lower() or 'invoice' in t.lower()]
        if critical_failures:
            print(f"🚨 CRITICAL TAX SYSTEM FAILURES: {', '.join(critical_failures)}")
        
        return 1
    else:
        print("\n✅ ALL TAX SYSTEM TESTS PASSED!")
        print("✅ Tax calculation and breakdown working correctly")
        print("✅ Backward compatibility maintained")
        print("✅ Mathematical calculations verified")
        return 0

if __name__ == "__main__":
    sys.exit(main())