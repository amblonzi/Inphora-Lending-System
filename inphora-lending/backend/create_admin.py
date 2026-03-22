#!/usr/bin/env python3
"""
Create Super Admin User for Inphora Lending System
Simple version using pre-hashed password to avoid bcrypt issues
"""

from database import SessionLocal
from models import User
from datetime import datetime, timezone
import os

import auth

def create_admin():
    db = SessionLocal()
    admin_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123")
    
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == "admin@inphora.net").first()
        if existing:
            print("Admin user exists. Resetting password...")
            existing.hashed_password = auth.get_password_hash(admin_password)
            db.commit()
            print(f"Password reset successfully.")
            return
        
        # Hash password dynamically
        hashed_pw = auth.get_password_hash(admin_password)
        
        # Create admin user with pre-hashed password
        admin = User(
            email="admin@inphora.net",
            full_name="System Administrator",
            hashed_password=hashed_pw,
            role="admin",
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(admin)
        db.commit()
        
        print("=" * 50)
        print("  Super Admin created successfully!")
        print("=" * 50)
        print(f"  Email: admin@inphora.net")
        print(f"  Password: {admin_password}")
        print()
        print("  ⚠️  SECURITY WARNING ⚠️")
        print("  Change this password IMMEDIATELY after first login!")
        print("  Go to: Settings -> Account -> Change Password")
        print("=" * 50)
        
    except Exception as e:
        print(f"Error creating admin: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating Inphora Lending System Super Admin...")
    create_admin()

