from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
import models, schemas, auth, database, random
from database import engine, get_db
from utils import log_activity, create_notification
from services.email import send_email

app = FastAPI(title="Inphora Lending System API")

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://tytaj.fipmetrics.co.ke",
    "http://tytaj.fipmetrics.co.ke",
]

# Add Production Origins
if os.getenv("ALLOWED_ORIGINS"):
    origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))
else:
    # Fallback/Default for security if not set
    origins.append("http://localhost:5173")
    origins.append("http://localhost:5174")

# Remove duplicates
origins = list(set(origins))
print(f"INFO: Allowed CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers import (
    users, clients, loans, loan_products, dashboard, 
    branches, customer_groups, upload, expenses, 
    reports, mpesa, settings, disbursements, organization_config, notifications, pwa, sms
)

# Register routers
app.include_router(pwa.router, prefix="/api")
app.include_router(sms.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(loan_products.router, prefix="/api")
app.include_router(loans.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(branches.router, prefix="/api")
app.include_router(customer_groups.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(mpesa.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(disbursements.router, prefix="/api")
app.include_router(organization_config.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")












@app.post("/api/token", response_model=schemas.LoginResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if 2FA is enabled
    if user.two_factor_enabled:
        otp = str(random.randint(100000, 999999))
        user.otp_code = otp
        user.otp_expires_at = auth.datetime.utcnow() + auth.timedelta(minutes=10)
        db.commit()
        
        # In a real system, send SMS here
        print(f"DEBUG: OTP for {user.email}: {otp}")

        # Send OTP via Email (Backup/Primary free option)
        email_subject = "Your Security Code - Inphora"
        email_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #0d9488;">Inphora Security</h2>
                    <p>Hello {user.full_name or 'User'},</p>
                    <p>Your One-Time Password (OTP) for login is:</p>
                    <div style="font-size: 32px; font-weight: bold; color: #333; margin: 20px 0; letter-spacing: 5px;">
                        {otp}
                    </div>
                    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
                </div>
            </body>
        </html>
        """
        try:
            send_email(user.email, email_subject, email_body)
        except Exception as e:
            print(f"Failed to send email OTP: {e}")
        
        return {
            "two_factor_required": True,
            "user_id": user.id,
            "message": f"OTP sent to {user.email} and phone number"
        }

    # Log login activity
    log_activity(db, user.id, "login", "user", user.id, {"email": user.email})
    
    user.last_login = auth.datetime.utcnow()
    db.commit()

    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "two_factor_required": False}

@app.post("/api/verify-otp", response_model=schemas.LoginResponse)
def verify_otp(data: schemas.OTPVerify, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.otp_code or user.otp_code != data.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if auth.datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Clear OTP
    user.otp_code = None
    user.otp_expires_at = None
    
    # Log login activity
    log_activity(db, user.id, "login", "user", user.id, {"email": user.email, "method": "2fa"})
    
    user.last_login = auth.datetime.utcnow()
    db.commit()

    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "two_factor_required": False}

# Static Files & SPA Handling
# This expects the frontend build (dist) to be placed in a 'static' folder
if os.path.exists("static"):
    # Mount assets folder
    if os.path.exists("static/assets"):
        app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
    
    # Mount uploads folder
    if not os.path.exists("static/uploads"):
        os.makedirs("static/uploads")
    app.mount("/uploads", StaticFiles(directory="static/uploads"), name="uploads")
        
    # Catch-all for SPA handling
    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        # Allow API requests to pass through (returns 404 if not found in routers)
        if catchall.startswith("api"):
             raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Check if requested file exists in static (e.g. favicon.ico, manifest.json)
        file_path = os.path.join("static", catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Return index.html for all other non-API routes (SPA routing)
        return FileResponse("static/index.html")
else:
    # Fallback if no static files found
    @app.get("/")
    def read_root():
        return {"message": "TytajExpress API is running (No Setup)"}
