from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(
    prefix="/organization",
    tags=["organization"]
)

@router.get("/config", response_model=schemas.OrganizationConfig)
def get_organization_config(
    db: Session = Depends(get_db)
):
    """
    Get organization configuration settings.
    Available to all users (public) to support login page branding.
    """
    config = db.query(models.OrganizationConfig).first()
    
    if not config:
        # Create default config if it doesn't exist
        config = models.OrganizationConfig(
            organization_name="Inphora Lending System",
            primary_color="#f97316",
            secondary_color="#0ea5e9",
            currency="KES",
            locale="en-KE",
            timezone="Africa/Nairobi"
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return config

@router.put("/config", response_model=schemas.OrganizationConfig)
def update_organization_config(
    config_update: schemas.OrganizationConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update organization configuration settings.
    Admin only.
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update organization settings"
        )
    
    config = db.query(models.OrganizationConfig).first()
    
    if not config:
        # Create new config if it doesn't exist
        config = models.OrganizationConfig()
        db.add(config)
    
    # Update fields
    update_data = config_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    
    return config
