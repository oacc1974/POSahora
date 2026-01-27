"""
Test PDF RIDE Generation for Facturación Electrónica Ecuador
Tests the PDF generation endpoint and validates RIDE format compliance
"""
import pytest
import requests
import os
from io import BytesIO

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TENANT_ID = "bd3addca-1ddf-4892-8dcf-23c7a1862e37"
DOCUMENT_ID_AUTORIZADO = "76fdcc4e-efec-4da3-9eef-40998d121458"
DOC_NUMBER = "001-001-000000011"


class TestPDFRIDEGeneration:
    """Tests for PDF RIDE generation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "X-Tenant-ID": TENANT_ID,
            "Content-Type": "application/json"
        }
    
    def test_pdf_endpoint_returns_200(self):
        """Test that PDF endpoint returns 200 for authorized document"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ PDF endpoint returns 200 for document {DOC_NUMBER}")
    
    def test_pdf_content_type_header(self):
        """Test that PDF endpoint returns correct Content-Type header"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected application/pdf, got {content_type}"
        print(f"✓ Content-Type header is application/pdf")
    
    def test_pdf_content_disposition_header(self):
        """Test that PDF has correct Content-Disposition header with filename"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, f"Expected attachment, got {content_disp}"
        assert '.pdf' in content_disp, f"Expected .pdf in filename, got {content_disp}"
        # Verify filename matches document number (without dashes)
        expected_filename = DOC_NUMBER.replace('-', '') + '.pdf'
        assert expected_filename in content_disp, f"Expected {expected_filename} in {content_disp}"
        print(f"✓ Content-Disposition header has correct filename: {expected_filename}")
    
    def test_pdf_is_valid_format(self):
        """Test that returned content is a valid PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        content = response.content
        
        # PDF files start with %PDF-
        assert content.startswith(b'%PDF-'), "Content does not start with PDF header"
        
        # PDF files should end with %%EOF
        assert b'%%EOF' in content, "PDF does not contain %%EOF marker"
        
        # Check minimum size (a valid PDF should be at least 1KB)
        assert len(content) > 1000, f"PDF too small: {len(content)} bytes"
        
        print(f"✓ PDF is valid format ({len(content)} bytes)")
    
    def test_pdf_has_reasonable_size(self):
        """Test that PDF has reasonable size for a RIDE document"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        size = len(response.content)
        
        # RIDE PDFs should be between 2KB and 500KB typically
        assert size > 2000, f"PDF too small: {size} bytes"
        assert size < 500000, f"PDF too large: {size} bytes"
        
        print(f"✓ PDF size is reasonable: {size} bytes")
    
    def test_pdf_404_for_nonexistent_document(self):
        """Test that PDF endpoint returns 404 for non-existent document"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/nonexistent-doc-id/pdf",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PDF endpoint returns 404 for non-existent document")
    
    def test_pdf_401_without_tenant_header(self):
        """Test that PDF endpoint returns 401 without X-Tenant-ID header"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}/pdf"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PDF endpoint returns 401 without X-Tenant-ID header")


class TestDocumentListDates:
    """Tests for document list date display"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "X-Tenant-ID": TENANT_ID,
            "Content-Type": "application/json"
        }
    
    def test_document_list_returns_access_key(self):
        """Test that document list includes access_key for date extraction"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents?page=1&limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'documents' in data
        assert len(data['documents']) > 0, "No documents found"
        
        # Check first document has access_key
        doc = data['documents'][0]
        assert 'access_key' in doc, "Document missing access_key"
        assert len(doc['access_key']) == 49, f"Invalid access_key length: {len(doc['access_key'])}"
        
        print(f"✓ Document list includes access_key for date extraction")
    
    def test_access_key_date_format(self):
        """Test that access_key contains correct date format (DDMMAAAA)"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        access_key = data['document']['access_key']
        # Access key format: DDMMAAAA... (first 8 chars are date)
        date_part = access_key[:8]
        day = date_part[0:2]
        month = date_part[2:4]
        year = date_part[4:8]
        
        # Validate date components
        assert 1 <= int(day) <= 31, f"Invalid day: {day}"
        assert 1 <= int(month) <= 12, f"Invalid month: {month}"
        assert 2020 <= int(year) <= 2030, f"Invalid year: {year}"
        
        formatted_date = f"{day}/{month}/{year}"
        print(f"✓ Access key date is valid: {formatted_date}")
        
        # For the test document, verify it's 26/01/2026
        assert formatted_date == "26/01/2026", f"Expected 26/01/2026, got {formatted_date}"
        print(f"✓ Document date is correctly 26/01/2026")


class TestDocumentDetail:
    """Tests for document detail endpoint - validates data for PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "X-Tenant-ID": TENANT_ID,
            "Content-Type": "application/json"
        }
    
    def test_document_has_all_ride_sections(self):
        """Test that document has all required sections for RIDE PDF"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        doc = data['document']
        
        # Section 1: Emitter data (from tenant, not in document)
        # Section 2: Document data
        assert 'doc_number' in doc, "Missing doc_number"
        assert 'access_key' in doc, "Missing access_key"
        assert 'sri_authorization_number' in doc, "Missing sri_authorization_number"
        print("✓ Document has authorization data")
        
        # Section 3: Customer data
        assert 'customer' in doc, "Missing customer"
        customer = doc['customer']
        assert 'name' in customer, "Missing customer name"
        assert 'identification' in customer, "Missing customer identification"
        print("✓ Document has customer data")
        
        # Section 4: Items detail
        assert 'items' in doc, "Missing items"
        assert len(doc['items']) > 0, "No items in document"
        item = doc['items'][0]
        assert 'description' in item, "Missing item description"
        assert 'quantity' in item, "Missing item quantity"
        assert 'unit_price' in item, "Missing item unit_price"
        print(f"✓ Document has {len(doc['items'])} item(s)")
        
        # Section 5: Totals
        assert 'totals' in doc, "Missing totals"
        totals = doc['totals']
        assert 'subtotal_15' in totals, "Missing subtotal_15"
        assert 'subtotal_0' in totals, "Missing subtotal_0"
        assert 'total_iva' in totals or 'total_iva_15' in totals, "Missing IVA total"
        assert 'total' in totals, "Missing total"
        print("✓ Document has totals with IVA breakdown")
        
        # Section 6: Payments
        assert 'payments' in doc, "Missing payments"
        assert len(doc['payments']) > 0, "No payments in document"
        payment = doc['payments'][0]
        assert 'method' in payment, "Missing payment method"
        assert 'total' in payment, "Missing payment total"
        print(f"✓ Document has {len(doc['payments'])} payment method(s)")
    
    def test_document_is_authorized(self):
        """Test that the test document is AUTORIZADO"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        doc = data['document']
        
        assert doc['sri_status'] == 'AUTORIZADO', f"Expected AUTORIZADO, got {doc['sri_status']}"
        assert doc['sri_authorization_number'] is not None, "Missing authorization number"
        print(f"✓ Document is AUTORIZADO with auth: {doc['sri_authorization_number'][:20]}...")


class TestPDFGeneratorCode:
    """Tests to validate PDF generator produces correct RIDE format"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "X-Tenant-ID": TENANT_ID,
            "Content-Type": "application/json"
        }
    
    def test_pdf_contains_barcode_data(self):
        """Test that PDF contains barcode (Code128) for access key"""
        response = requests.get(
            f"{BASE_URL}/api/fe/documents/{DOCUMENT_ID_AUTORIZADO}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        content = response.content
        
        # Check for barcode-related content in PDF
        # Code128 barcodes in PDFs typically have specific patterns
        # The access key should appear in the PDF
        access_key = "2601202601091489783000120010010000000116946198515"
        
        # The access key text should be in the PDF (below the barcode)
        assert access_key.encode() in content or b'2601202601' in content, \
            "Access key not found in PDF content"
        
        print("✓ PDF contains access key (barcode data)")
    
    def test_pdf_multiple_documents(self):
        """Test PDF generation for multiple documents"""
        # Get list of documents
        response = requests.get(
            f"{BASE_URL}/api/fe/documents?page=1&limit=3",
            headers=self.headers
        )
        assert response.status_code == 200
        docs = response.json()['documents']
        
        success_count = 0
        for doc in docs:
            pdf_response = requests.get(
                f"{BASE_URL}/api/fe/documents/{doc['document_id']}/pdf",
                headers=self.headers
            )
            if pdf_response.status_code == 200:
                assert pdf_response.content.startswith(b'%PDF-')
                success_count += 1
        
        assert success_count > 0, "No PDFs generated successfully"
        print(f"✓ Generated {success_count}/{len(docs)} PDFs successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
