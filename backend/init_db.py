#!/usr/bin/env python3
"""
Initialize Database Tables for Inphora Lending
Creates all required tables in the database
"""

from backend.database import Base, engine
from backend import models  # Import all models

def init_db():
    """Create all database tables"""
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        print("\nTables created:")
        print("- users")
        print("- clients")
        print("- loan_products")
        print("- loans")
        print("- repayments")
        print("- expenses")
        print("- system_settings")
        print("- registration_applications")
        print("- disbursement_transactions")
        print("\n✅ Database initialization complete!")
        print("Next step: Run create_admin.py to create the admin user")
    except Exception as e:
        print(f"❌ Error creating tables: {str(e)}")
        raise

if __name__ == "__main__":
    init_db()
