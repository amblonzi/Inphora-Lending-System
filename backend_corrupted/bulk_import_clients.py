import csv
import sys
import os
from datetime import datetime

# Setup path to import backend modules
# We need to ensure the project root is in sys.path so we can do 'from backend import ...'
current_file_path = os.path.abspath(__file__)
backend_dir = os.path.dirname(current_file_path)
project_root = os.path.dirname(backend_dir)

if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from database import SessionLocal
    import models
except ImportError:
    # Fallback for local dev if run from root
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from backend.database import SessionLocal
    from backend import models

def import_clients():
    db = SessionLocal()
    
    try:
        csv_path = os.path.join(backend_dir, 'import_data.csv')
        print(f"Reading from: {csv_path}")
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                # Check if client exists
                existing = db.query(models.Client).filter(models.Client.phone == row['phone']).first()
                if existing:
                    print(f"Skipping {row['first_name']} {row['last_name']} (Phone: {row['phone']}) - Already exists")
                    continue
                
                # Create Client
                client = models.Client(
                    first_name=row['first_name'],
                    last_name=row['last_name'],
                    email=row['email'] if row['email'] else None,
                    phone=row['phone'],
                    id_number=row['id_number'], 
                    status='active',
                    joined_at=datetime.now()
                )
                
                db.add(client)
                count += 1
                
            db.commit()
            print(f"Successfully imported {count} clients.")
            
    except Exception as e:
        print(f"Error importing clients: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_clients()
