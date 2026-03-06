import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from auth import get_password_hash

def verify_admin():
    db = SessionLocal()
    try:
        admin_email = "admin@inphora.net"
        admin_password = "admin123"
        
        user = db.query(models.User).filter(models.User.email == admin_email).first()
        if not user:
            print(f"Admin user {admin_email} not found. Creating...")
            user = models.User(
                email=admin_email,
                full_name="Administrator",
                phone="0700000000",
                hashed_password=get_password_hash(admin_password),
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            print("Admin user created successfully.")
        else:
            print(f"Admin user {admin_email} exists. Updating password and ensuring active status...")
            user.hashed_password = get_password_hash(admin_password)
            user.is_active = True
            db.commit()
            print("Admin user updated successfully.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    verify_admin()
