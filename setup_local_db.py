import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to MySQL server (without database)
connection = pymysql.connect(
    host='localhost',
    user='root',
    password='root'
)

try:
    with connection.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS lendingdb")
        print("Database 'lendingdb' created or already exists.")
finally:
    connection.close()
