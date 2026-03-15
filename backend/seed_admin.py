#!/usr/bin/env python3
"""
seed_admin.py — Create or reset admin users for Inphora Lending System.

Usage (local):
    cd backend
    python seed_admin.py

Usage (production Docker):
    docker compose exec backend_tytahj python seed_admin.py
    docker compose exec backend_amariflow python seed_admin.py
    docker compose exec backend_il python seed_admin.py
"""

import os
import sys
from datetime import datetime, timezone

# ── Load .env if present (local dev only) ─────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required in Docker (env vars already set)

# ── Import app modules ────────────────────────────────────────────────────────
try:
    from database import SessionLocal
    from models import User
    from auth import get_password_hash
except ImportError as e:
    print(f"ERROR: Could not import app modules: {e}")
    print("Make sure you run this script from inside the backend/ directory.")
    sys.exit(1)

# ── Admin accounts to create ──────────────────────────────────────────────────
ADMINS = [
    {
        "email":     "admin@inphora.net",
        "full_name": "System Administrator",
        "role":      "admin",
        "password":  os.getenv("ADMIN_DEFAULT_PASSWORD", "Admin@Inphora2025!"),
    },
]

def seed_admins():
    db = SessionLocal()
    try:
        tenant = os.getenv("TENANT_NAME", "local")
        print(f"\n{'='*55}")
        print(f"  Inphora Admin Seeder — Tenant: {tenant}")
        print(f"{'='*55}")

        for admin_data in ADMINS:
            email    = admin_data["email"]
            password = admin_data["password"]

            existing = db.query(User).filter(User.email == email).first()

            if existing:
                # Reset password and ensure active
                existing.hashed_password = get_password_hash(password)
                existing.is_active = True
                existing.role = admin_data["role"]
                db.commit()
                print(f"  ✓ RESET   {email}  (password updated, account re-activated)")
            else:
                user = User(
                    email=email,
                    full_name=admin_data["full_name"],
                    hashed_password=get_password_hash(password),
                    role=admin_data["role"],
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(user)
                db.commit()
                print(f"  ✓ CREATED {email}")

            print(f"    Email:    {email}")
            print(f"    Password: {password}")
            print(f"    Role:     {admin_data['role']}")
            print()

        print("  ⚠   Change these passwords immediately after first login!")
        print(f"{'='*55}\n")

    except Exception as e:
        print(f"\nERROR: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_admins()
