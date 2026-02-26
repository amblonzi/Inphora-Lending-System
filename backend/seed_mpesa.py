from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import SystemSetting
import os

def seed_mpesa_settings():
    db = SessionLocal()
    try:
        settings = [
            {"setting_key": "mpesa_shortcode", "setting_value": "174379", "category": "payment"},
            {"setting_key": "mpesa_consumer_key", "setting_value": "YOUR_CONSUMER_KEY", "category": "payment"},
            {"setting_key": "mpesa_consumer_secret", "setting_value": "YOUR_CONSUMER_SECRET", "category": "payment"},
            {"setting_key": "mpesa_passkey", "setting_value": "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919", "category": "payment"},
            {"setting_key": "mpesa_env", "setting_value": "sandbox", "category": "payment"},
            {"setting_key": "mpesa_initiator_name", "setting_value": "testapi", "category": "payment"},
            {"setting_key": "mpesa_initiator_password", "setting_value": "YOUR_INITIATOR_PASSWORD", "category": "payment"},
        ]

        for s in settings:
            existing = db.query(SystemSetting).filter(
                SystemSetting.setting_key == s["setting_key"],
                SystemSetting.category == s["category"]
            ).first()
            
            if not existing:
                print(f"Adding setting: {s['setting_key']}")
                db.add(SystemSetting(**s))
            else:
                print(f"Updating setting: {s['setting_key']}")
                existing.setting_value = s["setting_value"]
        
        db.commit()
        print("✓ M-Pesa settings seeded successfully!")
    except Exception as e:
        print(f"❌ Error seeding settings: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_mpesa_settings()
