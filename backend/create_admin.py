#!/usr/bin/env python3
"""
Create Super Admin User for TytajExpress
Simple version using pre-hashed password to avoid bcrypt issues
"""

from database import SessionLocal
from models import User
from datetime import datetime

import auth

def create_admin():
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == "admin@system.com").first()
        if existing:
            print("Admin user exists. Resetting password...")
            existing.hashed_password = auth.get_password_hash("admin123")
            db.commit()
            print("Password reset to: admin123")
            return
        
        # Hash password dynamically (Change this to use an environment variable in production)
        hashed_pw = auth.get_password_hash("INITIAL_ADMIN_PASSWORD")
        
        # Create admin user with pre-hashed password
        admin = User(
            email="admin@system.com",
            full_name="System Administrator",
            hashed_password=hashed_pw,
            role="admin",
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(admin)
        db.commit()
        
        print("Super Admin created successfully!")
        print("Email: admin@system.com")
        print("Password: INITIAL_ADMIN_PASSWORD")
        print("IMPORTANT: Change this password immediately after first login!")
        print("Go to: Settings -> Account -> Change Password")
        
    except Exception as e:
        print(f"Error creating admin: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating TytajExpress Super Admin...")
    create_admin()
