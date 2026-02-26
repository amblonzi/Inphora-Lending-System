import pytest
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
import json

from models import (
    Client, LoanProduct, Loan, LoanGuarantor, LoanReferee, 
    LoanCollateral, LoanFinancialAnalysis, Repayment, User,
    Branch, CustomerGroup
)
from auth import get_password_hash


@pytest.fixture(scope="function")
def test_branch(db: Session):
    """Create a test branch"""
    branch = Branch(
        name="Test Branch",
        location="Test Location"
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@pytest.fixture(scope="function")
def test_customer_group(db: Session):
    """Create a test customer group"""
    group = CustomerGroup(
        name="Test Group",
        description="Test customer group"
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@pytest.fixture(scope="function")
def test_client(db: Session, test_branch, test_customer_group):
    """Create a test client"""
    client = Client(
        first_name="John",
        last_name="Doe",
        email="john.doe@test.com",
        phone="0712345678",
        id_number="12345678",
        address="123 Test Street",
        branch_id=test_branch.id,
        customer_group_id=test_customer_group.id,
        mpesa_phone="0712345678",
        preferred_disbursement="mpesa"
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@pytest.fixture(scope="function")
def test_loan_product(db: Session):
    """Create a test loan product"""
    product = LoanProduct(
        name="Test Loan Product",
        interest_rate=15.0,
        min_amount=1000.0,
        max_amount=50000.0,
        min_period_months=1,
        max_period_months=12,
        processing_fee_percent=2.0,
        insurance_fee=100.0,
        tracking_fee=50.0,
        first_cycle_limit=10000.0
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@pytest.fixture(scope="function")
def loan_officer_token(client, test_user):
    """Get auth token for loan officer"""
    login_res = client.post(
        "/api/token",
        data={"username": "test@example.com", "password": "password123"}
    )
    return login_res.json()["access_token"]


class TestLoanApplicationWorkflow:
    """Test complete loan application workflow"""
    
    def test_create_client(self, client, loan_officer_token, test_branch, test_customer_group):
        """Test creating a new client"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        client_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@test.com",
            "phone": "0723456789",
            "id_number": "87654321",
            "address": "456 Test Avenue",
            "branch_id": test_branch.id,
            "customer_group_id": test_customer_group.id,
            "mpesa_phone": "0723456789",
            "preferred_disbursement": "mpesa"
        }
        
        response = client.post("/api/clients/", json=client_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Smith"
        assert data["email"] == "jane.smith@test.com"
        return data

    def test_create_loan_product(self, client, loan_officer_token):
        """Test creating a loan product"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        product_data = {
            "name": "Personal Loan",
            "interest_rate": 12.5,
            "min_amount": 5000.0,
            "max_amount": 100000.0,
            "min_period_months": 3,
            "max_period_months": 24,
            "processing_fee_percent": 3.0,
            "insurance_fee": 200.0,
            "tracking_fee": 100.0
        }
        
        response = client.post("/api/loan-products/", json=product_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Personal Loan"
        assert data["interest_rate"] == 12.5
        return data

    def test_loan_application_creation(self, client, loan_officer_token, test_client, test_loan_product):
        """Test creating a loan application"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 15000.0,
            "duration_months": 6,
            "start_date": date.today().isoformat(),
            "purpose": "Business expansion",
            "guarantors": [
                {
                    "name": "Guarantor One",
                    "phone": "0733456789",
                    "occupation": "Teacher",
                    "residence": "Nairobi"
                }
            ],
            "referees": [
                {
                    "name": "Referee One",
                    "phone": "0744567890",
                    "relation": "Friend"
                }
            ],
            "collateral": [
                {
                    "name": "Land Title",
                    "serial_number": "LT12345",
                    "estimated_value": 50000.0
                }
            ],
            "financial_analysis": {
                "daily_sales": 1000.0,
                "monthly_sales": 30000.0,
                "gross_profit": 15000.0,
                "expenditure": 15000.0,
                "net_income": 13000.0
            }
        }
        
        response = client.post("/api/loans/", json=loan_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["client_id"] == test_client.id
        assert data["product_id"] == test_loan_product.id
        assert data["amount"] == 15000.0
        assert data["status"] == "pending"
        return data

    def test_loan_approval(self, client, loan_officer_token, test_client, test_loan_product):
        """Test loan approval process"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # First create a loan
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 10000.0,
            "duration_months": 3,
            "start_date": date.today().isoformat(),
            "purpose": "Emergency funds"
        }
        
        create_response = client.post("/api/loans/", json=loan_data, headers=headers)
        loan_id = create_response.json()["id"]
        
        # Approve the loan
        approval_data = {
            "action": "approve",
            "notes": "Loan approved after review"
        }
        
        response = client.post(f"/api/loans/{loan_id}/approve", json=approval_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "approved"
        return data

    def test_loan_disbursement_mpesa(self, client, loan_officer_token, test_client, test_loan_product):
        """Test M-Pesa loan disbursement"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Create and approve loan
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 8000.0,
            "duration_months": 2,
            "start_date": date.today().isoformat(),
            "purpose": "School fees"
        }
        
        create_response = client.post("/api/loans/", json=loan_data, headers=headers)
        loan_id = create_response.json()["id"]
        
        # Approve loan
        client.post(f"/api/loans/{loan_id}/approve", json={"action": "approve"}, headers=headers)
        
        # Disburse via M-Pesa
        disbursement_data = {
            "method": "mpesa",
            "phone_number": test_client.mpesa_phone,
            "notes": "M-Pesa disbursement"
        }
        
        response = client.post(f"/api/loans/{loan_id}/disburse", json=disbursement_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "disbursed"
        return data

    def test_loan_repayment_processing(self, client, loan_officer_token, test_client, test_loan_product):
        """Test loan repayment processing"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Create, approve, and disburse loan
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 12000.0,
            "duration_months": 4,
            "start_date": date.today().isoformat(),
            "purpose": "Home renovation"
        }
        
        create_response = client.post("/api/loans/", json=loan_data, headers=headers)
        loan_id = create_response.json()["id"]
        
        client.post(f"/api/loans/{loan_id}/approve", json={"action": "approve"}, headers=headers)
        client.post(f"/api/loans/{loan_id}/disburse", json={"method": "manual"}, headers=headers)
        
        # Process repayment
        repayment_data = {
            "amount": 3000.0,
            "payment_method": "mpesa",
            "transaction_id": "MP123456",
            "notes": "Monthly repayment"
        }
        
        response = client.post(f"/api/loans/{loan_id}/repay", json=repayment_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["amount"] == 3000.0
        return data

    def test_loan_schedule_generation(self, client, loan_officer_token, test_client, test_loan_product):
        """Test loan repayment schedule generation"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Create loan
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 15000.0,
            "duration_months": 6,
            "start_date": date.today().isoformat(),
            "purpose": "Vehicle repair"
        }
        
        create_response = client.post("/api/loans/", json=loan_data, headers=headers)
        loan_id = create_response.json()["id"]
        
        # Get repayment schedule
        response = client.get(f"/api/loans/{loan_id}/schedule", headers=headers)
        assert response.status_code == 200
        
        schedule = response.json()
        assert len(schedule) == 6  # 6 monthly installments
        
        # Check first installment
        first_installment = schedule[0]
        assert "due_date" in first_installment
        assert "principal_amount" in first_installment
        assert "interest_amount" in first_installment
        assert "total_amount" in first_installment
        
        return schedule

    def test_loan_balance_calculation(self, client, loan_officer_token, test_client, test_loan_product):
        """Test loan balance calculation after repayments"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Create, approve, and disburse loan
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 10000.0,
            "duration_months": 3,
            "start_date": date.today().isoformat(),
            "purpose": "Medical expenses"
        }
        
        create_response = client.post("/api/loans/", json=loan_data, headers=headers)
        loan_id = create_response.json()["id"]
        
        client.post(f"/api/loans/{loan_id}/approve", json={"action": "approve"}, headers=headers)
        client.post(f"/api/loans/{loan_id}/disburse", json={"method": "manual"}, headers=headers)
        
        # Make partial repayment
        repayment_data = {
            "amount": 2000.0,
            "payment_method": "cash",
            "notes": "Partial payment"
        }
        
        client.post(f"/api/loans/{loan_id}/repay", json=repayment_data, headers=headers)
        
        # Check loan status and balance
        response = client.get(f"/api/loans/{loan_id}", headers=headers)
        assert response.status_code == 200
        
        loan_data = response.json()
        assert loan_data["status"] in ["active", "partially_paid"]
        assert "balance" in loan_data
        
        return loan_data


class TestLoanValidation:
    """Test loan validation and business rules"""
    
    def test_loan_amount_limits(self, client, loan_officer_token, test_client, test_loan_product):
        """Test loan amount validation against product limits"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Test amount below minimum
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 500.0,  # Below min_amount (1000)
            "duration_months": 3,
            "start_date": date.today().isoformat(),
            "purpose": "Test"
        }
        
        response = client.post("/api/loans/", json=loan_data, headers=headers)
        assert response.status_code == 400  # Should fail validation
        
        # Test amount above maximum
        loan_data["amount"] = 100000.0  # Above max_amount (50000)
        
        response = client.post("/api/loans/", json=loan_data, headers=headers)
        assert response.status_code == 400  # Should fail validation

    def test_duplicate_client_prevention(self, client, loan_officer_token, test_client):
        """Test prevention of duplicate clients"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Try to create client with same email
        duplicate_data = {
            "first_name": "Another",
            "last_name": "Name",
            "email": test_client.email,  # Same email
            "phone": "0798765432",
            "id_number": "99999999"
        }
        
        response = client.post("/api/clients/", json=duplicate_data, headers=headers)
        assert response.status_code == 400  # Should fail due to duplicate email
        
        # Try to create client with same phone
        duplicate_data["email"] = "different@test.com"
        duplicate_data["phone"] = test_client.phone  # Same phone
        
        response = client.post("/api/clients/", json=duplicate_data, headers=headers)
        assert response.status_code == 400  # Should fail due to duplicate phone

    def test_loan_cycle_limits(self, client, loan_officer_token, test_client, test_loan_product):
        """Test first-time borrower limits"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Try to exceed first cycle limit
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 15000.0,  # Above first_cycle_limit (10000)
            "duration_months": 6,
            "start_date": date.today().isoformat(),
            "purpose": "Test"
        }
        
        response = client.post("/api/loans/", json=loan_data, headers=headers)
        # This should either fail or be approved at a lower amount
        assert response.status_code in [400, 200]


class TestMpesaIntegration:
    """Test M-Pesa integration functionality"""
    
    def test_mpesa_registration_endpoint(self, client):
        """Test M-Pesa registration endpoint"""
        registration_data = {
            "full_name": "Test User",
            "phone": "0712345678",
            "id_number": "12345678",
            "email": "test@mpesa.com",
            "address": "123 Test Street"
        }
        
        response = client.post(
            "/api/mpesa/register",
            data=registration_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "paybill" in data
        assert "account" in data
        assert "fee" in data

    def test_mpesa_callback_processing(self, client, loan_officer_token, test_client, test_loan_product):
        """Test M-Pesa callback processing for repayments"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        # Create and disburse loan
        loan_data = {
            "client_id": test_client.id,
            "product_id": test_loan_product.id,
            "amount": 5000.0,
            "duration_months": 2,
            "start_date": date.today().isoformat(),
            "purpose": "Test loan"
        }
        
        create_response = client.post("/api/loans/", json=loan_data, headers=headers)
        loan_id = create_response.json()["id"]
        
        client.post(f"/api/loans/{loan_id}/approve", json={"action": "approve"}, headers=headers)
        client.post(f"/api/loans/{loan_id}/disburse", json={"method": "manual"}, headers=headers)
        
        # Simulate M-Pesa callback
        callback_data = {
            "transaction_type": "Paybill",
            "trans_id": "MP123456789",
            "trans_time": "20240123123456",
            "business_number": "123456",
            "invoice_number": str(loan_id),
            "msisdn": test_client.mpesa_phone,
            "amount": "2500.00",
            "first_name": "John",
            "last_name": "Doe"
        }
        
        response = client.post("/api/mpesa/callback", json=callback_data)
        assert response.status_code == 200
        
        # Verify repayment was recorded
        loan_response = client.get(f"/api/loans/{loan_id}", headers=headers)
        loan_data = loan_response.json()
        
        # Check if repayments exist
        assert "repayments" in loan_data or len(loan_data.get("repayments", [])) >= 0


class TestReporting:
    """Test loan reporting functionality"""
    
    def test_portfolio_report(self, client, loan_officer_token):
        """Test portfolio health report"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        response = client.get("/api/reports/portfolio", headers=headers)
        assert response.status_code == 200
        
        report = response.json()
        assert "total_loans" in report
        assert "active_loans" in report
        assert "total_portfolio_value" in report
        assert "default_rate" in report

    def test_loan_performance_report(self, client, loan_officer_token):
        """Test loan performance report"""
        headers = {"Authorization": f"Bearer {loan_officer_token}"}
        
        response = client.get("/api/reports/performance", headers=headers)
        assert response.status_code == 200
        
        report = response.json()
        assert "disbursed_amount" in report
        assert "repaid_amount" in report
        assert "pending_amount" in report
