import sqlite3
conn = sqlite3.connect('financeiro.db')
print(conn.execute("SELECT COALESCE(SUM(valor), 0) FROM receitas WHERE user_id = '1' AND criado_em >= '2026-05-01' AND criado_em < '2026-06-01'").fetchall())
