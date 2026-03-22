import sys
import os
import traceback
import time

def application(environ, start_response):
    """
    Advanced Diagnostic Tool for Timeout/Blank Page
    """
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain; charset=utf-8')]
    start_response(status, response_headers)
    
    output = ["--- AMARIFLOW ADVANCED DIAGNOSTICS ---", ""]
    
    def log(msg):
        output.append(msg)

    try:
        # 1. File Structure Check
        cwd = os.path.dirname(__file__)
        log(f"Root Directory: {cwd}")
        log(f"Files in Root: {os.listdir(cwd)}")
        
        # 2. Static File Check (Crucial for Blank Page)
        static_path = os.path.join(cwd, 'static')
        if os.path.exists(static_path):
            log(f"\n[OK] 'static' directory found.")
            if os.path.exists(os.path.join(static_path, 'index.html')):
                 log(f"[OK] 'static/index.html' exists.")
            else:
                 log(f"[CRITICAL] 'static/index.html' MISSING! (Causes Blank Page/404)")
            
            assets_path = os.path.join(static_path, 'assets')
            if os.path.exists(assets_path):
                log(f"[OK] 'static/assets' exists ({len(os.listdir(assets_path))} files).")
            else:
                log(f"[WARNING] 'static/assets' directory missing!")
        else:
            log(f"\n[CRITICAL] 'static' directory MISSING! React Frontend is not uploaded.")

        # 3. Database Latency Check (Crucial for Timeout)
        log("\n--- DATABASE LATENCY TEST ---")
        sys.path.insert(0, cwd)
        
        try:
            from backend.database import SessionLocal
            from sqlalchemy import text
            
            start_time = time.time()
            db = SessionLocal()
            # Run simple query
            db.execute(text("SELECT 1"))
            end_time = time.time()
            
            duration = end_time - start_time
            log(f"[SUCCESS] Database Connected & Query Executed.")
            log(f"Query Time: {duration:.4f} seconds")
            
            if duration > 2.0:
                log("[WARNING] SLOW DATABASE RESPONSE (> 2s). Could cause timeouts.")
            else:
                log("[OK] Database response speed is good.")
                
            db.close()
        except Exception as e:
            log(f"[CRITICAL] Database Connection Failed: {str(e)}")
            log(traceback.format_exc())

    except Exception as e:
        log("\n[SYSTEM ERROR] Script Failure:")
        log(traceback.format_exc())
        
    return ["\n".join(output).encode('utf-8')]
