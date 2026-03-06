import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base, get_db
from models import User
from auth_enhanced import get_password_hash

# Use a test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_api.db"

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose() # Ensure all connections are closed
    try:
        if os.path.exists("./test_api.db"):
            os.remove("./test_api.db")
    except PermissionError:
        pass # Database might still be locked on Windows, that's okay for cleanup

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    from tenant import get_tenant_db
    app.dependency_overrides[get_tenant_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db_session):
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        role="admin",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture(scope="function")
def auth_headers(client, test_user):
    login_data = {"username": "test@example.com", "password": "password123"}
    response = client.post("/api/token", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
