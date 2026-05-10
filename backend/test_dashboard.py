import sqlite3
conn = sqlite3.connect('financeiro.db')
conn.row_factory = sqlite3.Row

# Check ALL receitas
print("=== ALL receitas ===")
for r in conn.execute("SELECT * FROM receitas ORDER BY id DESC").fetchall():
    print(dict(r))

# Check what user 2 has
print("\n=== User 2 receitas ===")
for r in conn.execute("SELECT * FROM receitas WHERE user_id = 2").fetchall():
    print(dict(r))

# Check what user 2 has as string
print("\n=== User 2 receitas (string comparison) ===")
for r in conn.execute("SELECT * FROM receitas WHERE user_id = '2'").fetchall():
    print(dict(r))

# Check the resumo endpoint logic for user 2
print("\n=== Resumo for user 2 ===")
r = conn.execute("SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?", (2,)).fetchone()
print(f"Receitas: {r['t']}")
d = conn.execute("SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?", (2,)).fetchone()
print(f"Despesas: {d['t']}")
print(f"Saldo: {r['t'] - d['t']}")

# Check the resumo endpoint logic for user 2 as string
print("\n=== Resumo for user '2' (string) ===")
r = conn.execute("SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?", ('2',)).fetchone()
print(f"Receitas: {r['t']}")

conn.close()
