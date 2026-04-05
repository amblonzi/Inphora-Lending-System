import auth
from database import SessionLocal
from models import User
import os

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "admin@inphora.net").first()
    if not user:
        print("User admin@inphora.net not found in DB!")
    else:
        print(f"User found: {user.email}")
        print(f"Hashed password in DB: {user.hashed_password}")
        
        test_pass = "Admin@Inphora2025!"
        is_valid = auth.verify_password(test_pass, user.hashed_password)
        print(f"Verification test with '{test_pass}': {is_valid}")
        
        # Also try with the raw hash if it's not working
        new_hash = auth.get_password_hash(test_pass)
        print(f"Newly generated hash for same pass: {new_hash}")
        print(f"Verification of NEW hash: {auth.verify_password(test_pass, new_hash)}")

finally:
    db.close()
