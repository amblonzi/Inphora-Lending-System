import pytest

def test_login_success(client, test_user):
    login_data = {"username": "test@example.com", "password": "password123"}
    response = client.post("/api/token", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client, test_user):
    login_data = {"username": "test@example.com", "password": "wrongpassword"}
    response = client.post("/api/token", data=login_data)
    assert response.status_code == 401
    # The standardized error handler in main.py wraps the detail dict
    assert "Incorrect email or password" in response.json()["message"]["message"]

def test_get_current_user(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "test@example.com"
    assert data["role"] == "admin"

def test_health_check(client):
    response = client.get("/api/health")
    # Might be degraded if Redis isn't running in test env, which is fine for health check
    assert response.status_code == 200
    assert "status" in response.json()
