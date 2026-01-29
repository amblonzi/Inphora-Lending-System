from sqlalchemy.orm import Session
import models
from datetime import datetime
import json

def log_activity(db: Session, user_id: int, action: str, resource: str, resource_id: str = None, details: dict = None, ip_address: str = None):
    """
    Logs an activity to the database.
    """
    try:
        log = models.ActivityLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to log activity: {e}")
        db.rollback()

def create_notification(db: Session, user_id: int, title: str, message: str, type: str = "info"):
    """
    Creates a notification for a user.
    """
    try:
        notification = models.Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            created_at=datetime.utcnow(),
            is_read=False
        )
        db.add(notification)
        db.commit()
    except Exception as e:
        print(f"Failed to create notification: {e}")
        db.rollback()
