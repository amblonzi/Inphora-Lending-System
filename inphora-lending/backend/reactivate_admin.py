from database import SessionLocal
from models import User

def reactivate():
    db = SessionLocal()
    try:
        # Find the admin user
        admin = db.query(User).filter(User.role == "admin").first()
        if admin:
            print(f"Found admin user: {admin.email}")
            if not admin.is_active:
                admin.is_active = True
                db.commit()
                print("Admin user reactivated successfully!")
            else:
                print("Admin user is already active.")
        else:
            print("No admin user found.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reactivate()
