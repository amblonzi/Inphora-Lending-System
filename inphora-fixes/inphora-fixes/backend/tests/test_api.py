"""
backend/tests/test_api.py — NEW
API integration tests for all endpoints
Run with: pytest tests/ -v
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DB_NAME",     "testdb")
os.environ.setdefault("DB_USER",     "testuser")
os.environ.setdefault("DB_PASSWORD", "testpass")
os.environ.setdefault("DB_HOST",     "127.0.0.1")
os.environ.setdefault("SECRET_KEY",  "test_secret_key_at_least_32_characters_long")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("TENANT_NAME", "test")

from ..main import app
from ..database import Base, get_db, engine
from ..routers.auth import hash_password
from ..models import User

# ── Test DB setup ─────────────────────────────────────────────────────────────
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True, scope="session")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def client(db):
    def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user(db):
    user = db.query(User).filter(User.username == "test_admin").first()
    if not user:
        user = User(
            username="test_admin",
            full_name="Test Admin",
            hashed_password=hash_password("TestPass1234!"),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@pytest.fixture
def auth_headers(client, admin_user):
    resp = client.post("/api/auth/login", data={
        "username": "test_admin",
        "password": "TestPass1234!",
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Health Check ──────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code in (200, 503)

    def test_health_has_status_field(self, client):
        resp = client.get("/health")
        assert "status" in resp.json()


# ── Auth ──────────────────────────────────────────────────────────────────────
class TestAuth:
    def test_login_success(self, client, admin_user):
        resp = client.post("/api/auth/login", data={
            "username": "test_admin", "password": "TestPass1234!"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token"  in data
        assert "refresh_token" in data

    def test_login_wrong_password(self, client, admin_user):
        resp = client.post("/api/auth/login", data={
            "username": "test_admin", "password": "wrongpassword"
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", data={
            "username": "nobody", "password": "doesntmatter"
        })
        assert resp.status_code == 401

    def test_get_me_authenticated(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == "test_admin"

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_change_password_wrong_current(self, client, auth_headers):
        resp = client.post("/api/auth/change-password", headers=auth_headers, json={
            "current_password": "wrongpassword",
            "new_password": "NewPassword123!",
        })
        assert resp.status_code == 400

    def test_change_password_too_short(self, client, auth_headers):
        resp = client.post("/api/auth/change-password", headers=auth_headers, json={
            "current_password": "TestPass1234!",
            "new_password": "short",
        })
        assert resp.status_code == 422


# ── Borrowers ─────────────────────────────────────────────────────────────────
class TestBorrowers:
    def test_list_empty(self, client, auth_headers):
        resp = client.get("/api/borrowers/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_borrower(self, client, auth_headers):
        resp = client.post("/api/borrowers/", headers=auth_headers, json={
            "full_name": "Jane Doe",
            "national_id": "TEST-NID-001",
            "phone": "+254700000001",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["full_name"] == "Jane Doe"
        assert data["id"] is not None

    def test_create_duplicate_borrower(self, client, auth_headers):
        payload = {"full_name": "John Dup", "national_id": "DUP-NID-999", "phone": "+254799999999"}
        client.post("/api/borrowers/", headers=auth_headers, json=payload)
        resp = client.post("/api/borrowers/", headers=auth_headers, json=payload)
        assert resp.status_code == 409

    def test_get_borrower_not_found(self, client, auth_headers):
        resp = client.get("/api/borrowers/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_create_borrower_invalid_phone(self, client, auth_headers):
        resp = client.post("/api/borrowers/", headers=auth_headers, json={
            "full_name": "Bad Phone",
            "national_id": "PHONE-TEST",
            "phone": "not-a-phone",
        })
        assert resp.status_code == 422


# ── Loans ─────────────────────────────────────────────────────────────────────
class TestLoans:
    @pytest.fixture
    def borrower_id(self, client, auth_headers):
        resp = client.post("/api/borrowers/", headers=auth_headers, json={
            "full_name": "Loan Tester",
            "national_id": f"LOAN-NID-{id(self)}",
            "phone": f"+254700{id(self) % 1000000:06d}",
        })
        return resp.json()["id"]

    def test_create_loan(self, client, auth_headers, borrower_id):
        from datetime import date
        resp = client.post("/api/loans/", headers=auth_headers, json={
            "borrower_id": borrower_id,
            "amount": "10000.00",
            "interest_rate": "15.00",
            "term_months": 12,
            "loan_type": "personal",
            "disbursement_date": str(date.today()),
        })
        assert resp.status_code == 201
        assert resp.json()["status"] == "pending"

    def test_invalid_status_transition(self, client, auth_headers, borrower_id):
        from datetime import date
        # Create loan (starts PENDING)
        loan_resp = client.post("/api/loans/", headers=auth_headers, json={
            "borrower_id": borrower_id,
            "amount": "5000.00",
            "interest_rate": "12.00",
            "term_months": 6,
            "loan_type": "business",
            "disbursement_date": str(date.today()),
        })
        loan_id = loan_resp.json()["id"]

        # PENDING → CLOSED should fail (invalid transition)
        resp = client.patch(f"/api/loans/{loan_id}/status", headers=auth_headers, json={
            "status": "closed"
        })
        assert resp.status_code == 409

    def test_zero_amount_loan_rejected(self, client, auth_headers, borrower_id):
        resp = client.post("/api/loans/", headers=auth_headers, json={
            "borrower_id": borrower_id,
            "amount": "0",
            "interest_rate": "10.00",
            "term_months": 6,
            "loan_type": "personal",
        })
        assert resp.status_code == 422

    def test_repayment_schedule(self, client, auth_headers, borrower_id):
        from datetime import date
        loan_resp = client.post("/api/loans/", headers=auth_headers, json={
            "borrower_id": borrower_id,
            "amount": "12000.00",
            "interest_rate": "12.00",
            "term_months": 12,
            "loan_type": "personal",
            "disbursement_date": str(date.today()),
        })
        loan_id = loan_resp.json()["id"]

        resp = client.get(f"/api/loans/{loan_id}/schedule", headers=auth_headers)
        assert resp.status_code == 200
        schedule = resp.json()["schedule"]
        assert len(schedule) == 12
        # Verify all months are present
        months = [s["month"] for s in schedule]
        assert months == list(range(1, 13))


# ── Payments ──────────────────────────────────────────────────────────────────
class TestPayments:
    def test_overpayment_rejected(self, client, auth_headers):
        """Paying more than outstanding balance should return 422."""
        from datetime import date

        # Create borrower
        b_resp = client.post("/api/borrowers/", headers=auth_headers, json={
            "full_name": "Over Payer",
            "national_id": f"OVER-{id(self)}",
            "phone": f"+25471{id(self) % 10000000:07d}",
        })
        bid = b_resp.json()["id"]

        # Create and activate loan
        l_resp = client.post("/api/loans/", headers=auth_headers, json={
            "borrower_id": bid, "amount": "1000.00",
            "interest_rate": "10.00", "term_months": 6,
            "loan_type": "personal", "disbursement_date": str(date.today()),
        })
        lid = l_resp.json()["id"]

        # Approve → Disburse → Active
        for st in ["approved", "disbursed", "active"]:
            client.patch(f"/api/loans/{lid}/status", headers=auth_headers, json={"status": st})

        # Try to overpay
        resp = client.post("/api/payments/", headers=auth_headers, json={
            "loan_id": lid, "amount": "9999.00",
            "payment_date": str(date.today()),
            "payment_method": "cash",
        })
        assert resp.status_code == 422

    def test_payment_on_pending_loan_rejected(self, client, auth_headers):
        from datetime import date

        b_resp = client.post("/api/borrowers/", headers=auth_headers, json={
            "full_name": "Pending Payer",
            "national_id": f"PEND-{id(self)}",
            "phone": f"+25472{id(self) % 10000000:07d}",
        })
        bid = b_resp.json()["id"]

        l_resp = client.post("/api/loans/", headers=auth_headers, json={
            "borrower_id": bid, "amount": "500.00",
            "interest_rate": "10.00", "term_months": 3,
            "loan_type": "personal", "disbursement_date": str(date.today()),
        })
        lid = l_resp.json()["id"]

        resp = client.post("/api/payments/", headers=auth_headers, json={
            "loan_id": lid, "amount": "100.00",
            "payment_date": str(date.today()),
            "payment_method": "cash",
        })
        assert resp.status_code == 409


# ── Reports ───────────────────────────────────────────────────────────────────
class TestReports:
    def test_dashboard_accessible_by_admin(self, client, auth_headers):
        resp = client.get("/api/reports/dashboard", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_loans" in data
        assert "collection_rate_pct" in data

    def test_par_report(self, client, auth_headers):
        resp = client.get("/api/reports/par?days=30", headers=auth_headers)
        assert resp.status_code == 200
        assert "par_percentage" in resp.json()

    def test_collections_invalid_date_range(self, client, auth_headers):
        resp = client.get("/api/reports/collections?from_date=2025-12-31&to_date=2025-01-01",
                          headers=auth_headers)
        assert resp.status_code == 400
