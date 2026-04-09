import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.abspath('backend'))

import models
import schemas
from database import Base, engine, SessionLocal
from pagination import paginate

def debug_users():
    db = SessionLocal()
    try:
        print("Checking users table...")
        users = db.query(models.User).all()
        print(f"Found {len(users)} users.")
        
        for u in users:
            print(f"User ID: {u.id}, Email: {u.email}, Role: {u.role}, Created At: {u.created_at}")
            try:
                # Try to validate manually
                u_pydantic = schemas.Userimpl.model_validate(u)
                print(f"  Pydantic validation: SUCCESS")
            except Exception as e:
                print(f"  Pydantic validation: FAILED - {e}")
                
        print("\nTesting paginate function...")
        query = db.query(models.User)
        try:
            result = paginate(query, 1, 50, schemas.Userimpl)
            print("Paginate function: SUCCESS")
            print(f"Result items count: {len(result.items)}")
        except Exception as e:
            print(f"Paginate function: FAILED - {e}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"Database error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_users()
