import sqlite3
import os

DB_PATH = 'financeiro.db'

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    tables = ['receitas', 'contas', 'cartoes', 'compras_cartao', 'metas', 'investimentos', 'planejamento']
    
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'user_id' not in columns:
            print(f"Adding user_id to {table}...")
            try:
                # Add column and set default to 1 (assuming first user is 1)
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER DEFAULT 1")
                conn.commit()
            except Exception as e:
                print(f"Error migrating {table}: {e}")
        else:
            print(f"Table {table} already has user_id.")

    # Add pago column to compras_cartao if it doesn't exist
    cursor.execute("PRAGMA table_info(compras_cartao)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'pago' not in columns:
        print("Adding pago column to compras_cartao...")
        try:
            cursor.execute("ALTER TABLE compras_cartao ADD COLUMN pago INTEGER DEFAULT 0")
            conn.commit()
        except Exception as e:
            print(f"Error adding pago column: {e}")
    else:
        print("compras_cartao already has pago column.")

    conn.close()
    print("Migration finished.")

if __name__ == "__main__":
    migrate()
