from sqlalchemy import create_engine, text

# Hardcoded from .env to ensure no loading issues
DATABASE_URL = "mysql+pymysql://fcghmzxi_tytajuser:control4028@127.0.0.1/fcghmzxi_tytajdb"

def update_schema():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        try:
            print("Attempting to add 'originator_conversation_id' column to 'disbursement_transactions' table...")
            connection.execute(text("ALTER TABLE disbursement_transactions ADD COLUMN originator_conversation_id VARCHAR(100) DEFAULT NULL"))
            print("Successfully added 'originator_conversation_id' column.")
            connection.commit()
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column 'originator_conversation_id' already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    update_schema()
