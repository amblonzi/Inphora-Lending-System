import sqlite3
import os

db_path = 'backend/test.db'
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings';")
        if cursor.fetchone():
            cursor.execute("SELECT setting_key, setting_value FROM system_settings WHERE category = 'payment';")
            rows = cursor.fetchall()
            if rows:
                print("FOUND_SETTINGS:")
                for row in rows:
                    print(f"{row[0]}={row[1]}")
            else:
                print("NO_PAYMENT_SETTINGS")
        else:
            print("TABLE_NOT_FOUND")
        conn.close()
    except Exception as e:
        print(f"ERROR: {str(e)}")
else:
    print(f"DB_NOT_FOUND: {db_path}")
