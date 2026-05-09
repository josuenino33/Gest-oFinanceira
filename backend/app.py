import os
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
CORS(app)

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')
jwt = JWTManager(app)

# Configurações de Banco de Dados
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'financeiro.db')
DATABASE_URL = os.environ.get('DATABASE_URL')
IS_POSTGRES = DATABASE_URL is not None

def get_db():
    if IS_POSTGRES:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

def execute_query(query, params=()):
    if IS_POSTGRES:
        query = query.replace('?', '%s')
    conn = get_db()
    c = conn.cursor()
    c.execute(query, params)
    conn.commit()
    lastrowid = None
    if not IS_POSTGRES:
        lastrowid = c.lastrowid
    conn.close()
    return lastrowid

def fetch_all(query, params=()):
    if IS_POSTGRES:
        query = query.replace('?', '%s')
    conn = get_db()
    c = conn.cursor()
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def fetch_one(query, params=()):
    if IS_POSTGRES:
        query = query.replace('?', '%s')
    conn = get_db()
    c = conn.cursor()
    c.execute(query, params)
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    pk = "SERIAL PRIMARY KEY" if IS_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    p = "%s" if IS_POSTGRES else "?"

    # RESET TOTAL: Deletar tabelas antigas para criar a nova estrutura (Só rode isso uma vez se necessário)
    # Para garantir que o banco do Render atualize, vamos dropar as tabelas principais
    if IS_POSTGRES:
        c.execute("DROP TABLE IF EXISTS planejamento, investimentos, metas, compras_cartao, cartoes, contas, receitas, categorias, users CASCADE")

    # Tabelas
    tables = [
        f"CREATE TABLE IF NOT EXISTS users (id {pk}, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS categorias (id {pk}, nome TEXT NOT NULL, cor TEXT DEFAULT '#22c55e', criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS receitas (id {pk}, user_id INTEGER, descricao TEXT NOT NULL, valor REAL NOT NULL, categoria_id INTEGER, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))",
        f"CREATE TABLE IF NOT EXISTS contas (id {pk}, user_id INTEGER, descricao TEXT NOT NULL, valor REAL NOT NULL, categoria_id INTEGER, pago INTEGER DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))",
        f"CREATE TABLE IF NOT EXISTS cartoes (id {pk}, user_id INTEGER, nome TEXT NOT NULL, bandeira TEXT NOT NULL, limite REAL NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))",
        f"CREATE TABLE IF NOT EXISTS compras_cartao (id {pk}, user_id INTEGER, cartao_id INTEGER NOT NULL, descricao TEXT NOT NULL, valor REAL NOT NULL, parcelas INTEGER DEFAULT 1, parcela_atual INTEGER DEFAULT 1, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))",
        f"CREATE TABLE IF NOT EXISTS metas (id {pk}, user_id INTEGER, titulo TEXT NOT NULL, descricao TEXT DEFAULT '', valor_alvo REAL DEFAULT 0, valor_atual REAL DEFAULT 0, progresso INTEGER NOT NULL DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))",
        f"CREATE TABLE IF NOT EXISTS investimentos (id {pk}, user_id INTEGER, titulo TEXT NOT NULL, tipo TEXT NOT NULL, valor_investido REAL NOT NULL, valor_atual REAL NOT NULL, rentabilidade REAL DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))",
        f"CREATE TABLE IF NOT EXISTS planejamento (id {pk}, user_id INTEGER, categoria_id INTEGER, valor_planejado REAL NOT NULL, mes INTEGER NOT NULL, ano INTEGER NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))"
    ]
    
    for sql in tables:
        c.execute(sql)
    conn.commit()

    # Seed data (Usuário Demo - opcional, vamos deixar apenas para teste se você quiser)
    c.execute("SELECT COUNT(*) FROM users")
    row = c.fetchone()
    count = row[0] if not IS_POSTGRES else list(row.values())[0]
    if count == 0:
        h = generate_password_hash('senha123')
        c.execute(f"INSERT INTO users (nome, email, senha) VALUES ({p}, {p}, {p})", ('Usuário Demo', 'admin@financeiro.local', h))

    # Seed data (Categorias) - Mantemos as categorias para o usuário não ter que criar uma por uma
    c.execute("SELECT COUNT(*) FROM categorias")
    row = c.fetchone()
    count = row[0] if not IS_POSTGRES else list(row.values())[0]
    if count == 0:
        cats = [('Moradia', '#ef4444'), ('Alimentação', '#f97316'), ('Transporte', '#eab308'), ('Lazer', '#8b5cf6'), ('Saúde', '#06b6d4'), ('Educação', '#3b82f6'), ('Salário', '#22c55e'), ('Freelance', '#10b981')]
        c.executemany(f"INSERT INTO categorias (nome, cor) VALUES ({p}, {p})", cats)

    conn.commit()
    conn.close()

# Inicializar banco
init_db()

# ==================== ROTAS ====================

@app.route('/login', methods=['POST'])
def login():
    d = request.json or {}
    u = fetch_one('SELECT * FROM users WHERE email = ?', (d.get('email'),))
    if u and check_password_hash(u['senha'], d.get('password')):
        token = create_access_token(identity=str(u['id']))
        return jsonify({'access_token': token, 'user': {'id': u['id'], 'nome': u['nome'], 'email': u['email']}})
    return jsonify({'msg': 'Credenciais inválidas'}), 401

@app.route('/register', methods=['POST'])
def register():
    d = request.json or {}
    try:
        h = generate_password_hash(d.get('password'))
        execute_query('INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)', (d.get('nome'), d.get('email'), h))
        return jsonify({'msg': 'Usuário criado'}), 201
    except Exception as e:
        return jsonify({'msg': str(e)}), 400

@app.route('/resumo', methods=['GET'])
@jwt_required()
def resumo():
    uid = get_jwt_identity()
    r = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    d = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?', (uid,))['t']
    m = fetch_one('SELECT COALESCE(AVG(progresso), 0) as p FROM metas WHERE user_id = ?', (uid,))['p']
    return jsonify({'receitas': float(r), 'despesas': float(d), 'saldo': float(r-d), 'meta': float(m)})

@app.route('/receitas', methods=['GET', 'POST'])
@jwt_required()
def rota_receitas():
    uid = get_jwt_identity()
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO receitas (user_id, descricao, valor, categoria_id) VALUES (?, ?, ?, ?)', (uid, d.get('descricao'), d.get('valor'), d.get('categoria_id')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT r.*, c.nome as categoria_nome FROM receitas r LEFT JOIN categorias c ON c.id = r.categoria_id WHERE r.user_id = ? ORDER BY r.id DESC', (uid,)))

@app.route('/receitas/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_receita(id):
    uid = get_jwt_identity()
    if request.method == 'DELETE':
        execute_query('DELETE FROM receitas WHERE id = ? AND user_id = ?', (id, uid))
    else:
        d = request.json
        execute_query('UPDATE receitas SET descricao=?, valor=?, categoria_id=? WHERE id=? AND user_id=?', (d.get('descricao'), d.get('valor'), d.get('categoria_id'), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/contas', methods=['GET', 'POST'])
@jwt_required()
def rota_contas():
    uid = get_jwt_identity()
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO contas (user_id, descricao, valor, categoria_id) VALUES (?, ?, ?, ?)', (uid, d.get('descricao'), d.get('valor'), d.get('categoria_id')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT co.*, c.nome as categoria_nome FROM contas co LEFT JOIN categorias c ON c.id = co.categoria_id WHERE co.user_id = ? ORDER BY co.id DESC', (uid,)))

@app.route('/contas/<int:id>', methods=['DELETE', 'PUT', 'PATCH'])
@jwt_required()
def acao_conta(id):
    uid = get_jwt_identity()
    if request.method == 'DELETE':
        execute_query('DELETE FROM contas WHERE id = ? AND user_id = ?', (id, uid))
    elif request.method == 'PATCH':
        execute_query('UPDATE contas SET pago = 1 WHERE id = ? AND user_id = ?', (id, uid))
    else:
        d = request.json
        execute_query('UPDATE contas SET descricao=?, valor=?, categoria_id=?, pago=? WHERE id=? AND user_id=?', (d.get('descricao'), d.get('valor'), d.get('categoria_id'), d.get('pago', 0), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/categorias', methods=['GET', 'POST'])
@jwt_required()
def rota_categorias():
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO categorias (nome, cor) VALUES (?, ?)', (d.get('nome'), d.get('cor', '#22c55e')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT * FROM categorias ORDER BY nome'))

@app.route('/categorias/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_categoria(id):
    if request.method == 'DELETE':
        execute_query('DELETE FROM categorias WHERE id = ?', (id,))
    else:
        d = request.json
        execute_query('UPDATE categorias SET nome=?, cor=? WHERE id=?', (d.get('nome'), d.get('cor'), id))
    return jsonify({'msg': 'OK'})

@app.route('/cartoes', methods=['GET', 'POST'])
@jwt_required()
def rota_cartoes():
    uid = get_jwt_identity()
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO cartoes (user_id, nome, bandeira, limite) VALUES (?, ?, ?, ?)', (uid, d.get('nome'), d.get('bandeira'), d.get('limite')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT * FROM cartoes WHERE user_id = ? ORDER BY id DESC', (uid,)))

@app.route('/cartoes/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_cartao(id):
    uid = get_jwt_identity()
    execute_query('DELETE FROM cartoes WHERE id = ? AND user_id = ?', (id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/compras-cartao', methods=['GET', 'POST'])
@jwt_required()
def rota_compras():
    uid = get_jwt_identity()
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO compras_cartao (user_id, cartao_id, descricao, valor, parcelas, parcela_atual) VALUES (?, ?, ?, ?, ?, ?)', (uid, d.get('cartao_id'), d.get('descricao'), d.get('valor'), d.get('parcelas', 1), d.get('parcela_atual', 1)))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT cc.*, ca.nome as cartao_nome, ca.bandeira FROM compras_cartao cc JOIN cartoes ca ON ca.id = cc.cartao_id WHERE cc.user_id = ? ORDER BY cc.id DESC', (uid,)))

@app.route('/compras-cartao/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_compra(id):
    uid = get_jwt_identity()
    execute_query('DELETE FROM compras_cartao WHERE id = ? AND user_id = ?', (id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/metas', methods=['GET', 'POST'])
@jwt_required()
def rota_metas():
    uid = get_jwt_identity()
    if request.method == 'POST':
        d = request.json
        prog = int(float(d['valor_atual']) / float(d['valor_alvo']) * 100) if float(d.get('valor_alvo', 0)) > 0 else 0
        execute_query('INSERT INTO metas (user_id, titulo, descricao, valor_alvo, valor_atual, progresso) VALUES (?, ?, ?, ?, ?, ?)', (uid, d.get('titulo'), d.get('descricao', ''), d.get('valor_alvo', 0), d.get('valor_atual', 0), prog))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT * FROM metas WHERE user_id = ? ORDER BY id DESC', (uid,)))

@app.route('/metas/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_meta(id):
    uid = get_jwt_identity()
    if request.method == 'DELETE':
        execute_query('DELETE FROM metas WHERE id = ? AND user_id = ?', (id, uid))
    else:
        d = request.json
        prog = int(float(d['valor_atual']) / float(d['valor_alvo']) * 100) if float(d.get('valor_alvo', 0)) > 0 else 0
        execute_query('UPDATE metas SET titulo=?, descricao=?, valor_alvo=?, valor_atual=?, progresso=? WHERE id=? AND user_id=?', (d.get('titulo'), d.get('descricao', ''), d.get('valor_alvo', 0), d.get('valor_atual', 0), prog, id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/investimentos', methods=['GET', 'POST'])
@jwt_required()
def rota_investimentos():
    uid = get_jwt_identity()
    if request.method == 'POST':
        d = request.json
        vi, va = float(d.get('valor_investido', 0)), float(d.get('valor_atual', 0))
        rent = round((va - vi) / vi * 100, 1) if vi > 0 else 0
        execute_query('INSERT INTO investimentos (user_id, titulo, tipo, valor_investido, valor_atual, rentabilidade) VALUES (?, ?, ?, ?, ?, ?)', (uid, d.get('titulo'), d.get('tipo'), vi, va, rent))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT * FROM investimentos WHERE user_id = ? ORDER BY id DESC', (uid,)))

@app.route('/investimentos/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_investimento(id):
    uid = get_jwt_identity()
    execute_query('DELETE FROM investimentos WHERE id = ? AND user_id = ?', (id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/planejamento', methods=['GET', 'POST'])
@jwt_required()
def rota_planejamento():
    uid = get_jwt_identity()
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO planejamento (user_id, categoria_id, valor_planejado, mes, ano) VALUES (?, ?, ?, ?, ?)', (uid, d.get('categoria_id'), d.get('valor_planejado'), d.get('mes'), d.get('ano')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT p.*, c.nome as categoria_nome, c.cor, COALESCE((SELECT SUM(co.valor) FROM contas co WHERE co.categoria_id = p.categoria_id AND co.user_id = p.user_id), 0) as valor_gasto FROM planejamento p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.user_id = ? ORDER BY p.id', (uid,)))

@app.route('/planejamento/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_planejamento(id):
    uid = get_jwt_identity()
    execute_query('DELETE FROM planejamento WHERE id = ? AND user_id = ?', (id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/relatorios', methods=['GET'])
@jwt_required()
def relatorios():
    uid = get_jwt_identity()
    r = fetch_all('SELECT descricao, valor, criado_em FROM receitas WHERE user_id = ? ORDER BY id DESC', (uid,))
    d = fetch_all('SELECT descricao, valor, criado_em, pago FROM contas WHERE user_id = ? ORDER BY id DESC', (uid,))
    tr = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    td = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?', (uid,))['t']
    ti = fetch_one('SELECT COALESCE(SUM(valor_investido), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    ta = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    pc = fetch_all('SELECT c.nome, c.cor, COALESCE(SUM(co.valor), 0) as total FROM categorias c LEFT JOIN contas co ON co.categoria_id = c.id AND co.user_id = ? GROUP BY c.id HAVING total > 0 ORDER BY total DESC', (uid,))
    return jsonify({'receitas': r, 'despesas': d, 'total_receitas': float(tr), 'total_despesas': float(td), 'saldo': float(tr-td), 'total_investido': float(ti), 'total_atual_investimentos': float(ta), 'por_categoria': pc})

@app.route('/perfil', methods=['GET', 'PUT'])
@jwt_required()
def rota_perfil():
    uid = get_jwt_identity()
    if request.method == 'PUT':
        d = request.json
        execute_query('UPDATE users SET nome=?, email=? WHERE id=?', (d.get('nome'), d.get('email'), uid))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_one('SELECT id, nome, email, criado_em FROM users WHERE id = ?', (uid,)))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
