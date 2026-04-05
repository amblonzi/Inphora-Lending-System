from sqlalchemy.orm import Session
import models
from datetime import datetime, timezone
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
            timestamp=datetime.now(timezone.utc)
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
            created_at=datetime.now(timezone.utc),
            is_read=False
        )
        db.add(notification)
        db.commit()
    except Exception as e:
        print(f"Failed to create notification: {e}")
        db.rollback()
        
def calculate_apr(principal: float, periodic_interest_rate: float, periods: int, upfront_fees: float, period_type: str = "months") -> float:
    """
    Calculates the Effective Annual Percentage Rate (APR).
    Iteratively finds the rate that equates PV of repayments to the net disbursed.
    
    :param principal: Loan amount
    :param periodic_interest_rate: Rate per period (e.g., 0.05 for 5%)
    :param periods: Total number of periods
    :param upfront_fees: sum of all upfront costs
    :param period_type: 'months', 'weeks', 'days'
    :return: APR as a percentage (e.g., 45.2)
    """
    if principal <= upfront_fees:
        return 0.0
        
    net_disbursed = principal - upfront_fees
    
    # Calculate periodic payment (PMT) assuming fixed installments
    # PMT = P * r / (1 - (1 + r)^-n)
    if periodic_interest_rate == 0:
        pmt = principal / periods
    else:
        pmt = (principal * periodic_interest_rate) / (1 - (1 + periodic_interest_rate)**-periods)
    
    # Solve for internal rate of return 'r_irr' such that:
    # net_disbursed = sum(pmt / (1 + r_irr)^i for i from 1 to periods)
    # Using Newton-Raphson or simply Binary Search for stability
    
    low = 0.0
    high = 1.0 # 100% per period
    r_irr = 0.0
    
    for _ in range(100): # 100 iterations for precision
        mid = (low + high) / 2
        if mid == 0:
            pv = pmt * periods
        else:
            pv = pmt * (1 - (1 + mid)**-periods) / mid
            
        if pv > net_disbursed:
            low = mid
        else:
            high = mid
            
    r_irr = low
    
    # Annualize based on period type
    periods_per_year = 12
    if period_type == "weeks":
        periods_per_year = 52
    elif period_type == "days":
        periods_per_year = 365
        
    # Annualized APR = (1 + r_irr)^periods_per_year - 1
    apr = (((1 + r_irr)**periods_per_year) - 1) * 100
    return round(apr, 2)

import os

def translate(key: str, locale: str = "en", **kwargs) -> str:
    """
    Simple i18n helper to fetch translations from JSON files.
    """
    try:
        # Construct path to i18n directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(current_dir, "i18n", f"{locale}.json")
        
        if not os.path.exists(path):
            path = os.path.join(current_dir, "i18n", "en.json")
            
        if not os.path.exists(path):
            return key
            
        with open(path, "r", encoding="utf-8") as f:
            translations = json.load(f)
            
        text = translations.get(key, key)
        return text.format(**kwargs)
    except Exception as e:
        print(f"I18n Error: {e}")
        return key
  
