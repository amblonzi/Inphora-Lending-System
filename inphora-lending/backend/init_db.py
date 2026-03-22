#!/usr/bin/env python3
"""
Initialize Database Tables for Inphora Lending
Creates all required tables in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, engine
import models  # Import all models

def init_db():
    """Create all database tables"""
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        print("\nTables created:")
        for table_name in Base.metadata.tables.keys():
            print(f"- {table_name}")
        print("\n✅ Database initialization complete!")
        print("Next step: Run create_admin.py to create the admin user")
    except Exception as e:
        print(f"❌ Error creating tables: {str(e)}")
        raise

if __name__ == "__main__":
    init_db()
