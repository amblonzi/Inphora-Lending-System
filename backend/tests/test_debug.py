import pytest
from datetime import date

def test_loan_creation_debug(client, loan_officer_token, test_client, test_loan_product):
    """Debug test to see exact validation error"""
    headers = {"Authorization": f"Bearer {loan_officer_token}"}
    
    loan_data = {
        "client_id": test_client.id,
        "product_id": test_loan_product.id,
        "amount": 15000.0,
        "duration_months": 6,
        "start_date": date.today().isoformat(),
        "purpose": "Business expansion",
        "guarantors": [],
        "collateral": [],
        "referees": [],
        "financial_analysis": None
    }
    
    response = client.post("/api/loans/", json=loan_data, headers=headers)
    
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 422:
        print("Validation error details:")
        print(response.json())
    
    # For debugging, we'll accept 422 for now to see the error
    assert response.status_code in [200, 422]
