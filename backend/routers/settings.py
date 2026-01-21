from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/settings", tags=["settings"])

# Helper to check if user is admin
@router.get("/")
def get_settings(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    query = db.query(models.SystemSettings)
    if category:
        query = query.filter(models.SystemSettings.category == category)
    return query.all()

@router.get("/{key}")
def get_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    setting = db.query(models.SystemSettings).filter(
        models.SystemSettings.setting_key == key
    ).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.post("/")
def create_or_update_setting(
    setting_key: str,
    setting_value: str,
    category: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    # Check if exists
    existing = db.query(models.SystemSettings).filter(
        models.SystemSettings.setting_key == setting_key
    ).first()
    
    if existing:
        existing.setting_value = setting_value
        existing.category = category
        existing.description = description
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_setting = models.SystemSettings(
            setting_key=setting_key,
            setting_value=setting_value,
            category=category,
            description=description
        )
        db.add(new_setting)
        db.commit()
        db.refresh(new_setting)
        return new_setting

@router.delete("/{key}")
def delete_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    setting = db.query(models.SystemSettings).filter(
        models.SystemSettings.setting_key == key
    ).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    db.delete(setting)
    db.commit()
    return {"message": "Setting deleted"}

@router.put("/users/me/password")
def change_own_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Verify current password
    if not auth.verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = auth.get_password_hash(new_password)
    db.commit()
    return {"message": "Password changed successfully"}
