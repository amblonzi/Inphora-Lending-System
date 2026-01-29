import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Use env variable, default to local if not set (though in container it will be set)
DATABASE_URL = os.getenv("DATABASE_URL")

def update_schema():
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL not found in environment.")
        return

    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # 1. Add 2FA columns to Users table
        columns = [
            ("phone", "VARCHAR(20) DEFAULT NULL"),
            ("two_factor_enabled", "BOOLEAN DEFAULT FALSE"),
            ("otp_code", "VARCHAR(10) DEFAULT NULL"),
            ("otp_expires_at", "DATETIME DEFAULT NULL")
        ]
        
        print("🔄 Checking 'users' table schema...")
        for col_name, col_def in columns:
            try:
                # Attempt to add column
                print(f"   Adding column '{col_name}'...")
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                print(f"   ✅ Added '{col_name}'")
            except Exception as e:
                # Simple check for duplicate column error
                if "Duplicate column name" in str(e) or "1060" in str(e):
                    print(f"   ℹ️  Column '{col_name}' already exists. Skipping.")
                else:
                    print(f"   ❌ Error adding '{col_name}': {e}")
        
        connection.commit()
        print("✨ Schema update complete!")

if __name__ == "__main__":
    update_schema()
