import pytest
from models import Client, LoanProduct, Loan

def test_create_loan_application(client, auth_headers, db_session):
    # Setup: Create a client and product
    test_client = Client(
        first_name="John",
        last_name="Doe",
        phone="0712345678",
        id_number="12345678",
        status="active"
    )
    db_session.add(test_client)
    
    product = LoanProduct(
        name="Business Loan",
        interest_rate=10.0,
        min_amount=1000,
        max_amount=50000,
        min_period_months=1,
        max_period_months=12
    )
    db_session.add(product)
    db_session.commit()
    
    # Test
    from datetime import date
    loan_data = {
        "client_id": test_client.id,
        "product_id": product.id,
        "amount": 5000,
        "duration_months": 6,
        "duration_unit": "months",
        "start_date": date(2024, 3, 1).isoformat(),
        "repayment_frequency": "monthly",
        "is_processing_fee_waived": False,
        "guarantors": [],
        "collateral": [],
        "referees": []
    }
    
    # Note: Using the router prefix from main.py
    response = client.post("/api/loans/", json=loan_data, headers=auth_headers)
    
    # If the endpoint exists and logic is correct
    if response.status_code == 200:
        data = response.json()
        assert data["amount"] == 5000
        assert data["status"] == "pending"
    else:
        # Handle cases where endpoint might be slightly different or auth failed
        print(f"Loan creation failed with {response.status_code}: {response.text}")
        assert response.status_code in [200, 201]

def test_get_loans_list(client, auth_headers):
    response = client.get("/api/loans/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert isinstance(data["items"], list)
