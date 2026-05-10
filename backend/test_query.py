import sqlite3
conn = sqlite3.connect('financeiro.db')
query = """SELECT c.nome, COALESCE(SUM(co.valor), 0) as total FROM categorias c LEFT JOIN contas co ON co.categoria_id = c.id AND co.user_id = '1' AND co.criado_em >= '2026-05-01' AND co.criado_em < '2026-06-01' WHERE (c.user_id IS NULL OR c.user_id = '1') GROUP BY c.id HAVING total > 0 ORDER BY total DESC"""
print(conn.execute(query).fetchall())
