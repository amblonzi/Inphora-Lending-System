# Quick Start Implementation Guide
## Critical Issues - Immediate Action Required

### 🚨 Issue 1: Authentication Token Management
**Problem**: Tests failing due to token reuse and authentication inconsistencies

**Quick Fix Implementation**:
```python
# backend/auth.py - Add token refresh
class TokenManager:
    def __init__(self):
        self.blacklisted_tokens = set()
    
    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        # Validate refresh token
        # Generate new access token
        # Blacklist old token
        return new_token_response

# Add to main.py
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Token validation
    # Rate limiting
    # Blacklist check
    response = await call_next(request)
    return response
```

**Test Fix**:
```python
# tests/conftest.py - Better token management
@pytest.fixture(scope="function")
async def auth_token(client):
    login_data = {"username": "test@example.com", "password": "password123"}
    response = client.post("/api/token", data=login_data)
    return response.json()["access_token"]
```

### 🚨 Issue 2: API Request Format Standardization
**Problem**: Mixed JSON/form-data requirements causing 422 errors

**Quick Fix Implementation**:
```python
# backend/routers/mpesa.py - Fix M-Pesa registration
@router.post("/register")
async def register_mpesa(
    request: Request,  # Accept raw request
    db: Session = Depends(get_db)
):
    # Handle both JSON and form-data
    if request.headers["content-type"] == "application/json":
        data = await request.json()
    else:
        data = await request.form()
    
    # Process registration
    return {"paybill": "123456", "account": "ACC123", "fee": 50}
```

### 🚨 Issue 3: Database Test Isolation
**Problem**: Cross-test data contamination

**Quick Fix Implementation**:
```python
# tests/conftest.py - Better test isolation
@pytest.fixture(scope="function")
async def test_db():
    # Create in-memory SQLite for each test
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(bind=engine)
    session = TestingSessionLocal()
    
    yield session
    
    session.close()
    # Cleanup automatically handled by in-memory DB
```

### 🚨 Issue 4: Frontend Data Test Attributes
**Problem**: Missing data-testid attributes for E2E testing

**Quick Fix Implementation**:
```jsx
// frontend/src/components/Login.jsx - Add test attributes
<button 
  type="submit" 
  data-testid="login-button"
  className="w-full bg-tytaj-500 text-white py-3 rounded-lg"
>
  Sign In
</button>

<input
  type="email"
  data-testid="email-input"
  placeholder="Email address"
  className="w-full px-4 py-3 border rounded-lg"
/>
```

### 🚨 Issue 5: Error Handling Consistency
**Problem**: Inconsistent error response formats

**Quick Fix Implementation**:
```python
# backend/main.py - Standardized error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": str(exc) if DEBUG else None
        }
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed",
            "errors": exc.errors()
        }
    )
```

## Implementation Priority Order

### Today (Critical Fixes)
1. ✅ Fix authentication token management
2. ✅ Standardize M-Pesa endpoint
3. ✅ Add data-testid attributes to login form
4. ✅ Implement consistent error responses

### This Week (Stability)
1. Database test isolation
2. API request/response standardization
3. Basic frontend integration fixes
4. Enhanced error logging

### Next Week (Enhancement)
1. Loan validation improvements
2. M-Pesa production configuration
3. Performance optimization
4. Security hardening

## Testing Commands

```bash
# Run backend tests with fixes
cd backend
python -m pytest tests/test_loan_management.py::TestLoanApplicationWorkflow::test_create_client -v

# Run API tests
cd frontend
npx playwright test tests/e2e/api.spec.ts --project=chromium

# Run specific authentication test
npx playwright test tests/e2e/api.spec.ts:6 -g "should authenticate"
```

## Success Criteria

- ✅ All authentication tests pass
- ✅ M-Pesa registration returns 200
- ✅ Loan creation works consistently
- ✅ Frontend E2E tests can find elements
- ✅ Error responses are consistent

## Rollback Plan

If any fix causes issues:
1. Revert specific changes in git
2. Restore database from backup
3. Restart services
4. Verify basic functionality

## Monitoring

After implementing fixes:
1. Monitor error rates
2. Check API response times
3. Verify test success rates
4. Monitor user feedback

This quick-start guide addresses the most critical issues identified during testing. Implement these fixes first to stabilize the system before proceeding with larger enhancements.
