from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
import json
import models
from database import get_db

router = APIRouter(
    tags=["pwa"]
)

@router.get("/manifest.json")
def get_manifest(db: Session = Depends(get_db)):
    """
    Dynamically generate manifest.json based on organization configuration.
    """
    config = db.query(models.OrganizationConfig).first()
    
    if not config or not config.pwa_enabled:
        # Fallback to a basic manifest if not configured or disabled
        manifest = {
            "name": config.organization_name if config else "Inphora Lending System",
            "short_name": "Inphora",
            "description": "Digital Lending Management System",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#3b82f6",
            "icons": [
                {
                    "src": "/inphora-icon.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "/inphora-icon.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        }
    else:
        # Use database configuration
        manifest = {
            "name": config.organization_name,
            "short_name": config.pwa_short_name or config.organization_name.split(' ')[0],
            "description": config.pwa_description or "Digital Lending Management System",
            "start_url": config.pwa_start_url or "/",
            "display": config.pwa_display or "standalone",
            "background_color": config.pwa_splash_bg_color or "#ffffff",
            "theme_color": config.pwa_theme_color or config.primary_color,
            "icons": [
                {
                    "src": config.pwa_icon_url or "/inphora-icon.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": config.pwa_icon_512_url or "/inphora-icon.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        }
        
    return Response(content=json.dumps(manifest, indent=2), media_type="application/json")
