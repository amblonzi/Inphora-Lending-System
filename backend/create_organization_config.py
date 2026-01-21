"""
Database migration script to create organization_config table
and insert default Inphora Lending System configuration.
"""
from backend.database import SessionLocal, engine, Base
from backend.models import OrganizationConfig
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    """Create organization_config table and insert default configuration"""
    print("Checking organization_config table...")
    
    # Create the table if it's missing
    Base.metadata.create_all(bind=engine)
    
    # Insert default configuration
    db = SessionLocal()
    try:
        # Check if config already exists
        existing_config = db.query(OrganizationConfig).first()
        
        if not existing_config:
            print("Inserting default Inphora Lending System configuration...")
            default_config = OrganizationConfig(
                organization_name="Inphora Lending System",
                slug="inphora-lending-demo",
                primary_color="#f97316",
                secondary_color="#0ea5e9",
                contact_email="admin@inphora.com",
                currency="KES",
                locale="en-KE",
                timezone="Africa/Nairobi"
            )
            db.add(default_config)
            db.commit()
            print("✓ Default configuration created successfully!")
        else:
            print("✓ Organization configuration already exists.")
            
    except Exception as e:
        print(f"✗ Error during migration: {e}")
        db.rollback()
    finally:
        db.close()
    
    print("Migration completed!")

if __name__ == "__main__":
    migrate()
