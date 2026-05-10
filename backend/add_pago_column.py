import sqlite3
import os

DB_PATH = 'financeiro.db'

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(compras_cartao)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'pago' not in columns:
        print("Adding pago column to compras_cartao...")
        cursor.execute("ALTER TABLE compras_cartao ADD COLUMN pago INTEGER DEFAULT 0")
        conn.commit()
        print("Column added successfully!")
    else:
        print("Column 'pago' already exists.")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
