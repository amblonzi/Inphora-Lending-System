from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import shutil
import os
from datetime import datetime
import uuid

router = APIRouter(tags=["upload"])

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), type: str = Form("general")):
    try:
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        filename = f"{type}_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return URL (assuming static mount at /assets or /static)
        # In main.py we saw: app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
        # We should probably mount static/uploads as well or just put it in static/assets/uploads
        # Let's return the relative path that the frontend can use. 
        # If we mount "static" to "/", then return "uploads/filename"
        # Let's verify main.py static mounting.
        
        return {"url": f"/uploads/{filename}", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
