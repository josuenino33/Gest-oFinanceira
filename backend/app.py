import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
jwt = JWTManager(app)

# Configuração Google Gemini
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyApIggH1cMf5J-18eqZaPTT99uoe6kGn0g')
try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-latest')
    print("GOOGLE GEMINI: Inicializado com sucesso")
except Exception as e:
    print(f"GOOGLE GEMINI: Erro na inicialização: {e}")
    model = None

# Configurações de Banco de Dados
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'financeiro.db')
DATABASE_URL = os.environ.get('DATABASE_URL')
IS_POSTGRES = DATABASE_URL is not None

DEFAULT_CATEGORIES = [
    ('Moradia', '#ef4444'),
    ('Alimentação', '#f97316'),
    ('Transporte', '#eab308'),
    ('Lazer', '#8b5cf6'),
    ('Saúde', '#06b6d4'),
    ('Educação', '#3b82f6'),
    ('Salário', '#22c55e'),
    ('Freelance', '#10b981'),
]

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

def ensure_sqlite_schema(cursor):
    migrations = {
        'categorias': [
            ('user_id', 'INTEGER'),
            ('cor', "TEXT DEFAULT '#22c55e'"),
        ],
        'receitas': [
            ('user_id', 'INTEGER'),
            ('categoria_id', 'INTEGER'),
        ],
        'contas': [
            ('user_id', 'INTEGER'),
            ('categoria_id', 'INTEGER'),
            ('pago', 'INTEGER DEFAULT 0'),
        ],
        'cartoes': [
            ('user_id', 'INTEGER'),
            ('limite', 'REAL DEFAULT 0'),
        ],
        'compras_cartao': [
            ('user_id', 'INTEGER'),
            ('pago', 'INTEGER DEFAULT 0'),
            ('parcela_atual', 'INTEGER DEFAULT 1'),
        ],
        'metas': [
            ('user_id', 'INTEGER'),
            ('valor_alvo', 'REAL DEFAULT 0'),
            ('valor_atual', 'REAL DEFAULT 0'),
            ('progresso', 'INTEGER NOT NULL DEFAULT 0'),
        ],
        'investimentos': [
            ('user_id', 'INTEGER'),
            ('rentabilidade', 'REAL DEFAULT 0'),
        ],
        'planejamento': [
            ('user_id', 'INTEGER'),
        ],
    }

    for table, columns in migrations.items():
        cursor.execute(f"PRAGMA table_info({table})")
        existing_columns = {col[1] for col in cursor.fetchall()}
        for column_name, definition in columns:
            if column_name not in existing_columns:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_name} {definition}")

def ensure_postgres_schema(cursor):
    migrations = {
        'categorias': [
            ('user_id', 'INTEGER'),
            ('cor', "TEXT DEFAULT '#22c55e'"),
        ],
        'receitas': [
            ('user_id', 'INTEGER'),
            ('categoria_id', 'INTEGER'),
        ],
        'contas': [
            ('user_id', 'INTEGER'),
            ('categoria_id', 'INTEGER'),
            ('pago', 'INTEGER DEFAULT 0'),
        ],
        'cartoes': [
            ('user_id', 'INTEGER'),
            ('limite', 'REAL DEFAULT 0'),
        ],
        'compras_cartao': [
            ('user_id', 'INTEGER'),
            ('pago', 'INTEGER DEFAULT 0'),
            ('parcela_atual', 'INTEGER DEFAULT 1'),
        ],
        'metas': [
            ('user_id', 'INTEGER'),
            ('valor_alvo', 'REAL DEFAULT 0'),
            ('valor_atual', 'REAL DEFAULT 0'),
            ('progresso', 'INTEGER DEFAULT 0'),
        ],
        'investimentos': [
            ('user_id', 'INTEGER'),
            ('rentabilidade', 'REAL DEFAULT 0'),
        ],
        'planejamento': [
            ('user_id', 'INTEGER'),
        ],
    }

    for table, columns in migrations.items():
        cursor.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
            (table,)
        )
        existing_columns = {row['column_name'] for row in cursor.fetchall()}
        for column_name, definition in columns:
            if column_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_name} {definition}")
                except Exception:
                    pass

def init_db():
    conn = get_db()
    c = conn.cursor()

    pk = "SERIAL PRIMARY KEY" if IS_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    p = "%s" if IS_POSTGRES else "?"

    # Tabelas
    tables = [
        f"CREATE TABLE IF NOT EXISTS users (id {pk}, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS categorias (id {pk}, user_id INTEGER, nome TEXT NOT NULL, cor TEXT DEFAULT '#22c55e', criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS receitas (id {pk}, user_id INTEGER, descricao TEXT NOT NULL, valor REAL NOT NULL, categoria_id INTEGER, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS contas (id {pk}, user_id INTEGER, descricao TEXT NOT NULL, valor REAL NOT NULL, categoria_id INTEGER, pago INTEGER DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS cartoes (id {pk}, user_id INTEGER, nome TEXT NOT NULL, bandeira TEXT NOT NULL, limite REAL NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS compras_cartao (id {pk}, user_id INTEGER, cartao_id INTEGER NOT NULL, descricao TEXT NOT NULL, valor REAL NOT NULL, parcelas INTEGER DEFAULT 1, parcela_atual INTEGER DEFAULT 1, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS metas (id {pk}, user_id INTEGER, titulo TEXT NOT NULL, descricao TEXT DEFAULT '', valor_alvo REAL DEFAULT 0, valor_atual REAL DEFAULT 0, progresso INTEGER DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS investimentos (id {pk}, user_id INTEGER, titulo TEXT NOT NULL, tipo TEXT NOT NULL, valor_investido REAL NOT NULL, valor_atual REAL NOT NULL, rentabilidade REAL DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        f"CREATE TABLE IF NOT EXISTS planejamento (id {pk}, user_id INTEGER, categoria_id INTEGER, valor_planejado REAL NOT NULL, mes INTEGER NOT NULL, ano INTEGER NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    ]

    for sql in tables:
        c.execute(sql)
    conn.commit()

    if IS_POSTGRES:
        ensure_postgres_schema(c)
        conn.commit()
    else:
        ensure_sqlite_schema(c)

    # Seed data (Categorias) - recria categorias base caso tenham sumido.
    for nome, cor in DEFAULT_CATEGORIES:
        c.execute(f"SELECT id FROM categorias WHERE user_id IS NULL AND nome = {p}", (nome,))
        if c.fetchone() is None:
            c.execute(f"INSERT INTO categorias (nome, cor) VALUES ({p}, {p})", (nome, cor))

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

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    d = request.json or {}
    email = d.get('email')
    user = fetch_one('SELECT * FROM users WHERE email = ?', (email,))
    if user:
        # Em produção, aqui enviaríamos um email com um token real.
        # Para o demo, vamos apenas simular o envio.
        return jsonify({'msg': 'Link de recuperação enviado para o seu email (Simulado)', 'token': 'demo-token-123'})
    return jsonify({'msg': 'Email não encontrado'}), 404

@app.route('/reset-password', methods=['POST'])
def reset_password():
    d = request.json or {}
    email = d.get('email')
    new_password = d.get('password')
    token = d.get('token')
    
    if token != 'demo-token-123':
        return jsonify({'msg': 'Token inválido ou expirado'}), 400
        
    try:
        h = generate_password_hash(new_password)
        execute_query('UPDATE users SET senha = ? WHERE email = ?', (h, email))
        return jsonify({'msg': 'Senha atualizada com sucesso'})
    except Exception as e:
        return jsonify({'msg': str(e)}), 400

@app.route('/resumo', methods=['GET'])
@jwt_required()
def resumo():
    uid = int(get_jwt_identity())
    r = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    d = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?', (uid,))['t']
    m = fetch_one('SELECT COALESCE(AVG(progresso), 0) as p FROM metas WHERE user_id = ?', (uid,))['p']
    return jsonify({'receitas': float(r), 'despesas': float(d), 'saldo': float(r-d), 'meta': float(m)})

@app.route('/receitas', methods=['GET', 'POST'])
@jwt_required()
def rota_receitas():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        criado_em = d.get('criado_em')  # opcional: YYYY-MM-DD HH:MM:SS
        if criado_em:
            execute_query('INSERT INTO receitas (user_id, descricao, valor, categoria_id, criado_em) VALUES (?, ?, ?, ?, ?)', (uid, d.get('descricao'), d.get('valor'), d.get('categoria_id'), criado_em))
        else:
            execute_query('INSERT INTO receitas (user_id, descricao, valor, categoria_id) VALUES (?, ?, ?, ?)', (uid, d.get('descricao'), d.get('valor'), d.get('categoria_id')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT r.*, c.nome as categoria_nome FROM receitas r LEFT JOIN categorias c ON c.id = r.categoria_id WHERE r.user_id = ? ORDER BY r.id DESC', (uid,)))

@app.route('/receitas/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_receita(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM receitas WHERE id = ? AND user_id = ?', (id, uid))
    else:
        d = request.json
        execute_query('UPDATE receitas SET descricao=?, valor=?, categoria_id=? WHERE id=? AND user_id=?', (d.get('descricao'), d.get('valor'), d.get('categoria_id'), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/contas', methods=['GET', 'POST'])
@jwt_required()
def rota_contas():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        criado_em = d.get('criado_em')  # opcional: YYYY-MM-DD HH:MM:SS
        if criado_em:
            execute_query('INSERT INTO contas (user_id, descricao, valor, categoria_id, criado_em) VALUES (?, ?, ?, ?, ?)', (uid, d.get('descricao'), d.get('valor'), d.get('categoria_id'), criado_em))
        else:
            execute_query('INSERT INTO contas (user_id, descricao, valor, categoria_id) VALUES (?, ?, ?, ?)', (uid, d.get('descricao'), d.get('valor'), d.get('categoria_id')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT co.*, c.nome as categoria_nome FROM contas co LEFT JOIN categorias c ON c.id = co.categoria_id WHERE co.user_id = ? ORDER BY co.id DESC', (uid,)))

@app.route('/contas/<int:id>', methods=['DELETE', 'PUT', 'PATCH'])
@jwt_required()
def acao_conta(id):
    uid = int(get_jwt_identity())
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
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO categorias (user_id, nome, cor) VALUES (?, ?, ?)', (uid, d.get('nome'), d.get('cor', '#22c55e')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT * FROM categorias WHERE user_id IS NULL OR user_id = ? ORDER BY nome', (uid,)))

@app.route('/categorias/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_categoria(id):
    uid = int(get_jwt_identity())
    categoria = fetch_one('SELECT * FROM categorias WHERE id = ?', (id,))
    if not categoria:
        return jsonify({'msg': 'Categoria não encontrada'}), 404
    if categoria.get('user_id') is None:
        return jsonify({'msg': 'Categorias padrão não podem ser alteradas ou excluídas'}), 403
    if str(categoria.get('user_id')) != str(uid):
        return jsonify({'msg': 'Sem permissão para alterar esta categoria'}), 403

    if request.method == 'DELETE':
        execute_query('DELETE FROM categorias WHERE id = ? AND user_id = ?', (id, uid))
    else:
        d = request.json
        execute_query('UPDATE categorias SET nome=?, cor=? WHERE id=? AND user_id=?', (d.get('nome'), d.get('cor'), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/cartoes', methods=['GET', 'POST'])
@jwt_required()
def rota_cartoes():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO cartoes (user_id, nome, bandeira, limite) VALUES (?, ?, ?, ?)', (uid, d.get('nome'), d.get('bandeira'), d.get('limite')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT ca.id, ca.nome, ca.bandeira, ca.limite, COALESCE(SUM(cc.valor), 0) as total_gasto FROM cartoes ca LEFT JOIN compras_cartao cc ON cc.cartao_id = ca.id AND cc.user_id = ca.user_id WHERE ca.user_id = ? GROUP BY ca.id, ca.nome, ca.bandeira, ca.limite ORDER BY ca.id DESC', (uid,)))

@app.route('/cartoes/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_cartao(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM cartoes WHERE id = ? AND user_id = ?', (id, uid))
    else: # PUT
        d = request.json
        execute_query('UPDATE cartoes SET nome=?, bandeira=?, limite=? WHERE id=? AND user_id=?', (d.get('nome'), d.get('bandeira'), d.get('limite'), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/compras-cartao', methods=['GET', 'POST'])
@jwt_required()
def rota_compras():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        num_parcelas = int(d.get('parcelas', 1))
        valor_total = float(d.get('valor', 0))
        valor_parcela = round(valor_total / num_parcelas, 2)
        mes_compra = d.get('mes_compra')  # 1-12, opcional
        ano_compra = d.get('ano_compra')  # ex: 2026, opcional

        for i in range(num_parcelas):
            parcela_atual = i + 1
            # Calcular criado_em para cada parcela
            if mes_compra and ano_compra:
                m = int(mes_compra) + i
                a = int(ano_compra)
                while m > 12:
                    m -= 12
                    a += 1
                criado_em = f"{a}-{m:02d}-15 12:00:00"
                execute_query(
                    'INSERT INTO compras_cartao (user_id, cartao_id, descricao, valor, parcelas, parcela_atual, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    (uid, d.get('cartao_id'), d.get('descricao'), valor_parcela, num_parcelas, parcela_atual, criado_em)
                )
            else:
                execute_query(
                    'INSERT INTO compras_cartao (user_id, cartao_id, descricao, valor, parcelas, parcela_atual) VALUES (?, ?, ?, ?, ?, ?)',
                    (uid, d.get('cartao_id'), d.get('descricao'), valor_parcela, num_parcelas, parcela_atual)
                )
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT cc.*, ca.nome as cartao_nome, ca.bandeira FROM compras_cartao cc JOIN cartoes ca ON ca.id = cc.cartao_id AND ca.user_id = cc.user_id WHERE cc.user_id = ? ORDER BY cc.id DESC', (uid,)))

@app.route('/compras-cartao/<int:id>', methods=['DELETE', 'PATCH', 'PUT'])
@jwt_required()
def deletar_compra(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM compras_cartao WHERE id = ? AND user_id = ?', (id, uid))
    elif request.method == 'PATCH':
        execute_query('UPDATE compras_cartao SET pago = 1 WHERE id = ? AND user_id = ?', (id, uid))
    else: # PUT
        d = request.json
        execute_query('UPDATE compras_cartao SET cartao_id=?, descricao=?, valor=?, parcelas=?, pago=? WHERE id=? AND user_id=?', (d.get('cartao_id'), d.get('descricao'), d.get('valor'), d.get('parcelas', 1), d.get('pago', 0), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/metas', methods=['GET', 'POST'])
@jwt_required()
def rota_metas():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        prog = int(float(d['valor_atual']) / float(d['valor_alvo']) * 100) if float(d.get('valor_alvo', 0)) > 0 else 0
        execute_query('INSERT INTO metas (user_id, titulo, descricao, valor_alvo, valor_atual, progresso) VALUES (?, ?, ?, ?, ?, ?)', (uid, d.get('titulo'), d.get('descricao', ''), d.get('valor_alvo', 0), d.get('valor_atual', 0), prog))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT * FROM metas WHERE user_id = ? ORDER BY id DESC', (uid,)))

@app.route('/metas/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_meta(id):
    uid = int(get_jwt_identity())
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
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        vi, va = float(d.get('valor_investido', 0)), float(d.get('valor_atual', 0))
        rent = round((va - vi) / vi * 100, 1) if vi > 0 else 0
        execute_query('INSERT INTO investimentos (user_id, titulo, tipo, valor_investido, valor_atual, rentabilidade) VALUES (?, ?, ?, ?, ?, ?)', (uid, d.get('titulo'), d.get('tipo'), vi, va, rent))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT * FROM investimentos WHERE user_id = ? ORDER BY id DESC', (uid,)))

@app.route('/investimentos/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_investimento(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM investimentos WHERE id = ? AND user_id = ?', (id, uid))
    else: # PUT
        d = request.json
        vi, va = float(d.get('valor_investido', 0)), float(d.get('valor_atual', 0))
        rent = round((va - vi) / vi * 100, 1) if vi > 0 else 0
        execute_query('UPDATE investimentos SET titulo=?, tipo=?, valor_investido=?, valor_atual=?, rentabilidade=? WHERE id=? AND user_id=?', (d.get('titulo'), d.get('tipo'), vi, va, rent, id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/planejamento', methods=['GET', 'POST'])
@jwt_required()
def rota_planejamento():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        execute_query('INSERT INTO planejamento (user_id, categoria_id, valor_planejado, mes, ano) VALUES (?, ?, ?, ?, ?)', (uid, d.get('categoria_id'), d.get('valor_planejado'), d.get('mes'), d.get('ano')))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_all('SELECT p.*, c.nome as categoria_nome, c.cor, COALESCE((SELECT SUM(co.valor) FROM contas co WHERE co.categoria_id = p.categoria_id AND co.user_id = p.user_id), 0) as valor_gasto FROM planejamento p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.user_id = ? ORDER BY p.id', (uid,)))

@app.route('/planejamento/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_planejamento(id):
    uid = int(get_jwt_identity())
    execute_query('DELETE FROM planejamento WHERE id = ? AND user_id = ?', (id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/relatorios', methods=['GET'])
@jwt_required()
def relatorios():
    uid = int(get_jwt_identity())
    r = fetch_all('SELECT descricao, valor, criado_em FROM receitas WHERE user_id = ? ORDER BY id DESC', (uid,))
    d = fetch_all('SELECT descricao, valor, criado_em, pago FROM contas WHERE user_id = ? ORDER BY id DESC', (uid,))
    tr = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    td = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?', (uid,))['t']
    ti = fetch_one('SELECT COALESCE(SUM(valor_investido), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    ta = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    pc = fetch_all('SELECT c.nome, c.cor, COALESCE(SUM(co.valor), 0) as total FROM categorias c LEFT JOIN contas co ON co.categoria_id = c.id AND co.user_id = ? GROUP BY c.id, c.nome, c.cor HAVING COALESCE(SUM(co.valor), 0) > 0 ORDER BY total DESC', (uid,))
    return jsonify({'receitas': r, 'despesas': d, 'total_receitas': float(tr), 'total_despesas': float(td), 'saldo': float(tr-td), 'total_investido': float(ti), 'total_atual_investimentos': float(ta), 'por_categoria': pc})

@app.route('/notificacoes', methods=['GET'])
@jwt_required()
def notificacoes():
    uid = int(get_jwt_identity())
    now = datetime.now()
    amanha = now + timedelta(days=1)
    depois = now + timedelta(days=2)
    
    # Buscar todas as contas não pagas
    contas = fetch_all('SELECT * FROM contas WHERE user_id = ? AND pago = 0', (uid,))
    
    alertas = []
    for c in contas:
        try:
            # Tentar converter a data de criação
            dt = datetime.strptime(c['criado_em'], '%Y-%m-%d %H:%M:%S')
            
            # Se o dia e mês forem hoje ou próximos
            if dt.date() == now.date():
                alertas.append({'id': c['id'], 'msg': f"Vence HOJE: {c['descricao']}", 'tipo': 'urgente', 'valor': c['valor']})
            elif dt.date() == amanha.date():
                alertas.append({'id': c['id'], 'msg': f"Vence AMANHÃ: {c['descricao']}", 'tipo': 'alerta', 'valor': c['valor']})
            elif dt.date() == depois.date():
                alertas.append({'id': c['id'], 'msg': f"Vence em 2 dias: {c['descricao']}", 'tipo': 'info', 'valor': c['valor']})
        except:
            continue
            
    return jsonify(alertas)

@app.route('/resumo-mensal', methods=['GET'])
@jwt_required()
def resumo_mensal():
    uid = int(get_jwt_identity())
    mes = request.args.get('mes', datetime.now().month, type=int)
    ano = request.args.get('ano', datetime.now().year, type=int)
    mes_fim = request.args.get('mes_fim', mes, type=int)
    ano_fim = request.args.get('ano_fim', ano, type=int)

    # Garantir que "De" não é maior que "Para"
    if (ano > ano_fim) or (ano == ano_fim and mes > mes_fim):
        mes, mes_fim = mes_fim, mes
        ano, ano_fim = ano_fim, ano

    # Filtro de data genérico para SQLite e Postgres
    f_range = "criado_em >= ? AND criado_em < ?"
    f_range_co = "co.criado_em >= ? AND co.criado_em < ?"

    # Calcular datas de início e fim
    start_date = f"{ano}-{mes:02d}-01 00:00:00"
    # Fim do período: primeiro dia do mês subsequente ao mês final
    if mes_fim == 12:
        end_date = f"{ano_fim + 1}-01-01 00:00:00"
    else:
        end_date = f"{ano_fim}-{mes_fim + 1:02d}-01 00:00:00"

    r = fetch_one(f'SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ? AND {f_range}', (uid, start_date, end_date))['t']
    d = fetch_one(f'SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ? AND {f_range}', (uid, start_date, end_date))['t']

    # Categorias com percentual
    try:
        total_despesas = float(d)
        cats = fetch_all(f'SELECT c.nome, COALESCE(SUM(co.valor), 0) as total FROM categorias c LEFT JOIN contas co ON co.categoria_id = c.id AND co.user_id = ? AND {f_range_co} WHERE (c.user_id IS NULL OR c.user_id = ?) GROUP BY c.id, c.nome HAVING COALESCE(SUM(co.valor), 0) > 0 ORDER BY total DESC', (uid, start_date, end_date, uid))
        for c in cats:
            c['percentual'] = round((float(c['total']) / total_despesas * 100), 1) if total_despesas > 0 else 0
    except Exception as e:
        print(f"Erro ao carregar categorias: {e}")
        cats = []

    # Contas a pagar (não pagas e do período)
    cp = fetch_all(f'SELECT * FROM contas WHERE user_id = ? AND pago = 0 AND {f_range} ORDER BY id DESC', (uid, start_date, end_date))

    # Compras no cartão do período
    cc = fetch_all(f'SELECT * FROM compras_cartao WHERE user_id = ? AND {f_range} ORDER BY id DESC', (uid, start_date, end_date))

    # Metas
    metas = fetch_all('SELECT * FROM metas WHERE user_id = ? ORDER BY id DESC', (uid,))

    # Histórico (últimos 12 meses do ponto final) - otimizado com 2 queries ao invés de 24
    historico = []
    meses_label = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    # Calcular intervalo total do histórico (12 meses antes do mês final)
    h_start_m = (mes_fim - 12) % 12
    h_start_a = ano_fim + ((mes_fim - 12) // 12)
    hist_start = f"{h_start_a}-{h_start_m + 1:02d}-01 00:00:00"
    if mes_fim == 12:
        hist_end = f"{ano_fim + 1}-01-01 00:00:00"
    else:
        hist_end = f"{ano_fim}-{mes_fim + 1:02d}-01 00:00:00"

    # Buscar receitas e despesas agrupadas por mês em 2 queries
    if IS_POSTGRES:
        month_expr = "TO_CHAR(criado_em, 'YYYY-MM')"
    else:
        month_expr = "strftime('%Y-%m', criado_em)"

    rec_hist = fetch_all(f"SELECT {month_expr} as mes, COALESCE(SUM(valor), 0) as total FROM receitas WHERE user_id = ? AND criado_em >= ? AND criado_em < ? GROUP BY {month_expr}", (uid, hist_start, hist_end))
    desp_hist = fetch_all(f"SELECT {month_expr} as mes, COALESCE(SUM(valor), 0) as total FROM contas WHERE user_id = ? AND criado_em >= ? AND criado_em < ? GROUP BY {month_expr}", (uid, hist_start, hist_end))

    rec_map = {r['mes']: float(r['total']) for r in rec_hist}
    desp_map = {d['mes']: float(d['total']) for d in desp_hist}

    for i in range(12):
        m_idx = (mes_fim - 12 + i) % 12
        a_idx = ano_fim + ((mes_fim - 12 + i) // 12)
        key = f"{a_idx}-{m_idx + 1:02d}"
        historico.append({'name': meses_label[m_idx], 'receitas': rec_map.get(key, 0.0), 'despesas': desp_map.get(key, 0.0)})

    res = {
        'receitas': float(r),
        'despesas': float(d),
        'saldo': float(r - d),
        'meta_economia': round((float(r - d) / float(r) * 100), 1) if r > 0 else 0,
        'categorias': cats,
        'contas_pagar': cp,
        'compras_cartao': cc,
        'metas': metas,
        'historico': historico
    }
    return jsonify(res)

@app.route('/perfil', methods=['GET', 'PUT'])
@jwt_required()
def rota_perfil():
    uid = int(get_jwt_identity())
    if request.method == 'PUT':
        d = request.json
        execute_query('UPDATE users SET nome=?, email=? WHERE id=?', (d.get('nome'), d.get('email'), uid))
        return jsonify({'msg': 'OK'})
    return jsonify(fetch_one('SELECT id, nome, email, criado_em FROM users WHERE id = ?', (uid,)))

@app.route('/chat', methods=['POST'])
@jwt_required()
def chat_ia():
    uid = int(get_jwt_identity())
    d = request.json or {}
    pergunta = d.get('message')
    
    # Coleta contexto do usuário
    res = fetch_one('SELECT COALESCE(SUM(valor), 0) as r FROM receitas WHERE user_id = ?', (uid,))['r']
    con = fetch_one('SELECT COALESCE(SUM(valor), 0) as c FROM contas WHERE user_id = ?', (uid,))['c']
    inv = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) as i FROM investimentos WHERE user_id = ?', (uid,))['i']
    metas = fetch_all('SELECT titulo, progresso FROM metas WHERE user_id = ?', (uid,))
    
    contexto = f"""
    Você é um consultor financeiro sênior e amigável.
    Dados atuais do usuário:
    - Saldo Total (Receitas): R$ {res:.2f}
    - Total de Contas a Pagar (Despesas): R$ {con:.2f}
    - Saldo Líquido: R$ {res-con:.2f}
    - Total Investido: R$ {inv:.2f}
    - Metas: {', '.join([f"{m['titulo']} ({m['progresso']}%)" for m in metas])}
    
    Responda de forma curta, objetiva e motivadora. Nunca peça senhas ou dados bancários reais.
    Pergunta do usuário: {pergunta}
    """
    
    if not model:
        return jsonify({'response': 'A IA não foi configurada corretamente no servidor. Verifique a chave API.'}), 500
        
    try:
        response = model.generate_content(contexto)
        if response and response.text:
            return jsonify({'response': response.text})
        else:
            return jsonify({'response': 'A IA não conseguiu gerar uma resposta. Tente reformular a pergunta.'})
    except Exception as e:
        print(f"ERRO GEMINI: {str(e)}")
        return jsonify({'response': f'Erro na IA: {str(e)[:100]}...'}), 500

@app.route('/auto-categorize', methods=['POST'])
@jwt_required()
def auto_categorize():
    uid = int(get_jwt_identity())
    d = request.json or {}
    descricao = d.get('descricao')
    
    cats = fetch_all('SELECT id, nome FROM categorias WHERE user_id = ? OR user_id IS NULL', (uid,))
    lista_cats = ", ".join([f"{c['id']}:{c['nome']}" for c in cats])
    
    prompt = f"""
    Baseado na descrição da despesa "{descricao}", escolha a categoria mais adequada da lista abaixo.
    Responda APENAS o ID numérico da categoria.
    Lista: {lista_cats}
    """
    
    try:
        response = model.generate_content(prompt)
        cat_id = response.text.strip()
        return jsonify({'categoria_id': int(cat_id)})
    except:
        return jsonify({'categoria_id': None})

@app.route('/patrimonio', methods=['GET'])
@jwt_required()
def get_patrimonio():
    uid = int(get_jwt_identity())
    
    # Ativos
    rec = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    inv = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    ativos = float(rec) + float(inv)
    
    # Passivos
    contas = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ? AND pago = 0', (uid,))['t']
    cartao = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM compras_cartao WHERE user_id = ? AND pago = 0', (uid,))['t']
    passivos = float(contas) + float(cartao)
    
    patrimonio = ativos - passivos
    
    # Conquistas (Gamificação)
    conquistas = []
    
    # 1. Primeiro Passo
    if rec > 0:
        conquistas.append({'id': 1, 'titulo': 'Primeiro Passo', 'desc': 'Registrou sua primeira receita', 'icon': '🌱', 'ganho': True})
    else:
        conquistas.append({'id': 1, 'titulo': 'Primeiro Passo', 'desc': 'Registre sua primeira receita', 'icon': '🌱', 'ganho': False})
        
    # 2. Investidor
    if inv > 0:
        conquistas.append({'id': 2, 'titulo': 'Investidor', 'desc': 'Começou a fazer o dinheiro trabalhar', 'icon': '💰', 'ganho': True})
    else:
        conquistas.append({'id': 2, 'titulo': 'Investidor', 'desc': 'Adicione seu primeiro investimento', 'icon': '💰', 'ganho': False})
        
    # 3. Mestre do Planejamento
    plan = fetch_one('SELECT COUNT(*) as c FROM planejamento WHERE user_id = ?', (uid,))['c']
    conquistas.append({
        'id': 3, 
        'titulo': 'Planejador', 
        'desc': 'Criou 3 ou mais planejamentos mensais', 
        'icon': '📅', 
        'ganho': plan >= 3
    })
    
    # 4. Ficha Limpa (Sem contas atrasadas no mês atual)
    now = datetime.now()
    mes_atual = f"{now.year}-{now.month:02d}-01"
    atrasadas = fetch_one('SELECT COUNT(*) as c FROM contas WHERE user_id = ? AND pago = 0 AND criado_em < ?', (uid, mes_atual))['c']
    conquistas.append({
        'id': 4, 
        'titulo': 'Ficha Limpa', 
        'desc': 'Nenhuma conta pendente de meses anteriores', 
        'icon': '🛡️', 
        'ganho': atrasadas == 0 and rec > 0
    })

    return jsonify({
        'ativos': ativos,
        'passivos': passivos,
        'patrimonio': patrimonio,
        'conquistas': conquistas
    })

@app.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    uid = int(get_jwt_identity())
    
    # Coleta de dados para análise
    res = fetch_one('SELECT COALESCE(SUM(valor), 0) as r FROM receitas WHERE user_id = ?', (uid,))['r']
    con = fetch_one('SELECT COALESCE(SUM(valor), 0) as c FROM contas WHERE user_id = ?', (uid,))['c']
    inv = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) as i FROM investimentos WHERE user_id = ?', (uid,))['i']
    
    gastos_cat = fetch_all('''
        SELECT c.nome, SUM(t.valor) as total 
        FROM contas t 
        JOIN categorias c ON c.id = t.categoria_id 
        WHERE t.user_id = ? 
        GROUP BY c.nome 
        ORDER BY total DESC 
        LIMIT 3
    ''', (uid,))
    
    insights = []
    
    # Lógica de "IA" Heurística
    if res > 0:
        taxa_poupanca = (res - con) / res * 100
        if taxa_poupanca > 20:
            insights.append({
                'tipo': 'positivo',
                'msg': f'Excelente! Sua taxa de poupança está em {taxa_poupanca:.1f}%. Você está acima da média de 15% recomendada por especialistas.',
                'icon': '🚀'
            })
        elif taxa_poupanca > 0:
            insights.append({
                'tipo': 'alerta',
                'msg': f'Sua taxa de poupança é de {taxa_poupanca:.1f}%. Tente reduzir gastos variáveis para chegar aos 20%.',
                'icon': '💡'
            })
        else:
            insights.append({
                'tipo': 'critico',
                'msg': 'Atenção! Suas despesas superaram suas receitas este mês. Revise seus custos fixos imediatamente.',
                'icon': '⚠️'
            })

    if gastos_cat:
        top_cat = gastos_cat[0]
        porc_top = (top_cat['total'] / con * 100) if con > 0 else 0
        if porc_top > 40:
            insights.append({
                'tipo': 'analise',
                'msg': f'Sua maior despesa é "{top_cat["nome"]}", representando {porc_top:.1f}% do seu orçamento. Existe margem para negociar ou reduzir aqui?',
                'icon': '🔍'
            })

    if inv == 0 and res > con:
        insights.append({
            'tipo': 'oportunidade',
            'msg': 'Você tem saldo positivo mas ainda não possui investimentos registrados. Que tal começar com uma Reserva de Emergência?',
            'icon': '💎'
        })

    return jsonify(insights)

@app.route('/test-ai', methods=['GET'])
def test_ai():
    try:
        models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                models.append(m.name)
        return jsonify({
            'status': 'sucesso',
            'modelos_disponiveis': models,
            'chave_usada': GEMINI_API_KEY[:10] + "..."
        })
    except Exception as e:
        return jsonify({'status': 'erro', 'msg': str(e)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
