#!/usr/bin/env python3
"""
Create Super Admin User for Inphora Lending System
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
        existing = db.query(User).filter(User.email == "admin@inphora.net").first()
        if existing:
            print("Admin user exists. Resetting password...")
            existing.hashed_password = auth.get_password_hash("admin123")
            db.commit()
            print("Password reset to: admin123")
            return
        
        # Hash password dynamically
        hashed_pw = auth.get_password_hash("admin123")
        
        # Create admin user with pre-hashed password
        admin = User(
            email="admin@inphora.net",
            full_name="System Administrator",
            hashed_password=hashed_pw,
            role="admin",
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(admin)
        db.commit()
        
        print("Super Admin created successfully!")
        print("Email: admin@inphora.net")
        print("Password: admin123")
        print("IMPORTANT: Change this password immediately after first login!")
        print("Go to: Settings -> Account -> Change Password")
        
    except Exception as e:
        print(f"Error creating admin: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating Inphora Lending System Super Admin...")
    create_admin()
