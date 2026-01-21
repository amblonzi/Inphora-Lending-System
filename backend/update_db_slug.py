import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from backend.database import DATABASE_URL

def add_slug_column():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found.")
        return
        
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        try:
            print("Attempting to add 'slug' column to 'organization_config'...")
            connection.execute(text("ALTER TABLE organization_config ADD COLUMN slug VARCHAR(100)"))
            print("Column 'slug' added successfully.")
        except Exception as e:
            print(f"Column might already exist or error occurred: {e}")

if __name__ == "__main__":
    add_slug_column()
