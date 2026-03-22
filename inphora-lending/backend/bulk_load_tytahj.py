import csv
import os
from database import SessionLocal
from models import Client

CSV_FILE = "import_data.csv"

def load_to_db():
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found in current directory.")
        return

    db = SessionLocal()
    count = 0
    skipped = 0
    
    try:
        with open(CSV_FILE, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Map CSV columns to Model fields
                # CSV: id_number,first_name,last_name,email,phone
                
                # Clean phone number (remove spaces)
                phone = row.get('phone', '').strip()
                id_number = row.get('id_number', '').strip()
                
                if not phone or not id_number:
                    print(f"Skipping row with missing ID or Phone: {row}")
                    skipped += 1
                    continue

                # Check existence
                existing = db.query(Client).filter(
                    (Client.phone == phone) | 
                    (Client.id_number == id_number)
                ).first()
                
                if existing:
                    print(f"Skipping existing client: {row.get('first_name')} {row.get('last_name')}")
                    skipped += 1
                    continue
                
                # Create Client
                client = Client(
                    first_name=row.get('first_name', '').strip(),
                    last_name=row.get('last_name', '').strip(),
                    email=row.get('email', '').strip() or None, # Handle empty string as None
                    phone=phone,
                    id_number=id_number,
                    address="Bulk Imported",
                    status="active"
                )
                
                db.add(client)
                count += 1
        
        db.commit()
        print(f"Import Complete!")
        print(f"Added: {count}")
        print(f"Skipped: {skipped}")
        
    except Exception as e:
        print(f"Error during import: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    load_to_db()
