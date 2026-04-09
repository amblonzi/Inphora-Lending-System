import os
import sys
from datetime import datetime

# Add backend to path
sys.path.append(os.path.abspath('backend'))

import models
import schemas

def test_schema_validation():
    print("Testing Userimpl schema validation with None created_at...")
    
    # Mock user object with attributes
    class MockUser:
        def __init__(self):
            self.id = 1
            self.email = "test@example.com"
            self.full_name = "Test User"
            self.role = "admin"
            self.is_active = True
            self.phone = "0712345678"
            self.two_factor_enabled = False
            self.permissions = None
            self.created_at = None # This is what was causing the error
            self.last_login = None
            
    user = MockUser()
    
    try:
        # Pydantic 2.x
        if hasattr(schemas.Userimpl, "model_validate"):
            validated = schemas.Userimpl.model_validate(user)
        else:
            # Pydantic 1.x
            validated = schemas.Userimpl.from_orm(user)
        print("SUCCESS: Userimpl validated with None created_at")
        print(f"Validated data: {validated.model_dump() if hasattr(validated, 'model_dump') else validated.dict()}")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_schema_validation()
