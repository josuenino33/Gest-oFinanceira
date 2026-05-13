import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

# Configurações
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)

# IA Gemini
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
model = None
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
except:
    pass

# Banco de Dados
DATABASE_URL = os.environ.get('DATABASE_URL')
IS_POSTGRES = DATABASE_URL is not None
DB_PATH = 'gestao_financeira.db'

# Configuração de Pooling (Dica do Gemini)
db_pool = None
def init_pool():
    global db_pool
    if IS_POSTGRES and db_pool is None:
        try:
            from psycopg2.pool import ThreadedConnectionPool
            db_pool = ThreadedConnectionPool(1, 20, DATABASE_URL)
            print("Pool de conexões PostgreSQL inicializado.")
        except Exception as e:
            print(f"Erro ao inicializar pool: {e}")

DEFAULT_CATEGORIES = [
    ('Alimentação', '#ef4444'),
    ('Moradia', '#3b82f6'),
    ('Transporte', '#f59e0b'),
    ('Lazer', '#ec4899'),
    ('Saúde', '#10b981'),
    ('Educação', '#8b5cf6'),
    ('Salário', '#22c55e'),
    ('Freelance', '#10b981'),
]

def get_db():
    if IS_POSTGRES:
        if db_pool is None: init_pool()
        return db_pool.getconn()
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

def release_db(conn):
    if IS_POSTGRES and db_pool:
        db_pool.putconn(conn)
    else:
        conn.close()

def execute_query(query, params=()):
    if IS_POSTGRES:
        query = query.replace('?', '%s')
    conn = get_db()
    try:
        from psycopg2.extras import RealDictCursor
        c = conn.cursor(cursor_factory=RealDictCursor) if IS_POSTGRES else conn.cursor()
        c.execute(query, params)
        conn.commit()
        lastrowid = c.lastrowid if not IS_POSTGRES else None
        return lastrowid
    finally:
        release_db(conn)

def fetch_all(query, params=()):
    if IS_POSTGRES:
        query = query.replace('?', '%s')
    conn = get_db()
    try:
        from psycopg2.extras import RealDictCursor
        c = conn.cursor(cursor_factory=RealDictCursor) if IS_POSTGRES else conn.cursor()
        c.execute(query, params)
        rows = c.fetchall()
        return [dict(r) for r in rows]
    finally:
        release_db(conn)

def fetch_one(query, params=()):
    if IS_POSTGRES:
        query = query.replace('?', '%s')
    conn = get_db()
    try:
        from psycopg2.extras import RealDictCursor
        c = conn.cursor(cursor_factory=RealDictCursor) if IS_POSTGRES else conn.cursor()
        c.execute(query, params)
        row = c.fetchone()
        return dict(row) if row else None
    finally:
        release_db(conn)

def ensure_postgres_schema(cursor):
    # Migrações para Postgres
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
            ('bandeira', 'TEXT'),
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

def ensure_sqlite_schema(cursor):
    # Migrações simplificadas para SQLite
    pass

def init_db():
    conn = get_db()
    try:
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
        
        # Adicionar índices para performance (Dica do Gemini)
        indices = [
            "CREATE INDEX IF NOT EXISTS idx_receitas_user_date ON receitas (user_id, criado_em)",
            "CREATE INDEX IF NOT EXISTS idx_contas_user_date ON contas (user_id, criado_em)",
            "CREATE INDEX IF NOT EXISTS idx_compras_user_date ON compras_cartao (user_id, criado_em)",
            "CREATE INDEX IF NOT EXISTS idx_metas_user ON metas (user_id)",
            "CREATE INDEX IF NOT EXISTS idx_categorias_user ON categorias (user_id)"
        ]
        for idx_sql in indices:
            try:
                c.execute(idx_sql)
            except:
                pass

        conn.commit()

        if IS_POSTGRES:
            ensure_postgres_schema(c)
            conn.commit()
        else:
            ensure_sqlite_schema(c)

        # Seed data (Categorias)
        for nome, cor in DEFAULT_CATEGORIES:
            c.execute(f"SELECT id FROM categorias WHERE user_id IS NULL AND nome = {p}", (nome,))
            if c.fetchone() is None:
                c.execute(f"INSERT INTO categorias (nome, cor) VALUES ({p}, {p})", (nome, cor))

        conn.commit()
    finally:
        release_db(conn)

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
    uid = int(get_jwt_identity())
    r = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    d = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?', (uid,))['t']
    m = fetch_one('SELECT COALESCE(AVG(progresso), 0) as p FROM metas WHERE user_id = ?', (uid,))['p']
    return jsonify({'receitas': float(r), 'despesas': float(d), 'saldo': float(r-d), 'meta': float(m)})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'db': 'connected'})

@app.route('/receitas', methods=['GET', 'POST'])
@jwt_required()
def rota_receitas():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        try:
            descricao = str(d.get('descricao', '')).strip()
            valor = float(str(d.get('valor', '0')).replace(',', '.'))
            cat_id = d.get('categoria_id')
            cat_id = int(cat_id) if cat_id and str(cat_id).isdigit() else None
            criado_em = d.get('criado_em')

            if criado_em:
                execute_query('INSERT INTO receitas (user_id, descricao, valor, categoria_id, criado_em) VALUES (?, ?, ?, ?, ?)', (uid, descricao, valor, cat_id, criado_em))
            else:
                execute_query('INSERT INTO receitas (user_id, descricao, valor, categoria_id) VALUES (?, ?, ?, ?)', (uid, descricao, valor, cat_id))
            return jsonify({'msg': 'OK'})
        except Exception as e:
            return jsonify({'msg': str(e)}), 500
    
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
        try:
            descricao = str(d.get('descricao', '')).strip()
            valor = float(str(d.get('valor', '0')).replace(',', '.'))
            cat_id = d.get('categoria_id')
            cat_id = int(cat_id) if cat_id and str(cat_id).isdigit() else None
            pago = 1 if d.get('pago') in [1, True, '1', 'true'] else 0
            criado_em = d.get('criado_em')

            if criado_em:
                execute_query('INSERT INTO contas (user_id, descricao, valor, categoria_id, pago, criado_em) VALUES (?, ?, ?, ?, ?, ?)', (uid, descricao, valor, cat_id, pago, criado_em))
            else:
                execute_query('INSERT INTO contas (user_id, descricao, valor, categoria_id, pago) VALUES (?, ?, ?, ?, ?)', (uid, descricao, valor, cat_id, pago))
            return jsonify({'msg': 'OK'})
        except Exception as e:
            return jsonify({'msg': str(e)}), 500
            
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

@app.route('/resumo-mensal', methods=['GET'])
@jwt_required()
def resumo_mensal():
    uid = int(get_jwt_identity())
    mes = request.args.get('mes', datetime.now().month, type=int)
    ano = request.args.get('ano', datetime.now().year, type=int)
    mes_fim = request.args.get('mes_fim', mes, type=int)
    ano_fim = request.args.get('ano_fim', ano, type=int)

    # Filtro de data genérico
    start_date = f"{ano}-{mes:02d}-01 00:00:00"
    if mes_fim == 12: end_date = f"{ano_fim + 1}-01-01 00:00:00"
    else: end_date = f"{ano_fim}-{mes_fim + 1:02d}-01 00:00:00"

    f_range = "criado_em >= ? AND criado_em < ?"
    f_range_co = "co.criado_em >= ? AND co.criado_em < ?"

    r = fetch_one(f'SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ? AND {f_range}', (uid, start_date, end_date))['t']
    d = fetch_one(f'SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ? AND {f_range}', (uid, start_date, end_date))['t']

    cats = fetch_all(f'SELECT c.nome, COALESCE(SUM(co.valor), 0) as total FROM categorias c LEFT JOIN contas co ON co.categoria_id = c.id AND co.user_id = ? AND {f_range_co} WHERE (c.user_id IS NULL OR c.user_id = ?) GROUP BY c.id, c.nome HAVING COALESCE(SUM(co.valor), 0) > 0 ORDER BY total DESC', (uid, start_date, end_date, uid))
    
    # Histórico simplificado
    historico = []
    meses_label = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    
    if IS_POSTGRES: month_expr = "TO_CHAR(criado_em, 'YYYY-MM')"
    else: month_expr = "strftime('%Y-%m', criado_em)"

    rec_hist = fetch_all(f"SELECT {month_expr} as m, SUM(valor) as t FROM receitas WHERE user_id = ? GROUP BY m", (uid,))
    desp_hist = fetch_all(f"SELECT {month_expr} as m, SUM(valor) as t FROM contas WHERE user_id = ? GROUP BY m", (uid,))
    
    rm, dm = {x['m']: x['t'] for x in rec_hist}, {x['m']: x['t'] for x in desp_hist}
    
    for i in range(12):
        mi = (mes_fim - 12 + i) % 12
        ai = ano_fim + ((mes_fim - 12 + i) // 12)
        k = f"{ai}-{mi + 1:02d}"
        historico.append({'name': meses_label[mi], 'receitas': rm.get(k, 0), 'despesas': dm.get(k, 0)})

    return jsonify({
        'receitas': float(r), 'despesas': float(d), 'saldo': float(r-d),
        'categorias': cats, 'historico': historico
    })

@app.route('/patrimonio', methods=['GET'])
@jwt_required()
def get_patrimonio():
    uid = int(get_jwt_identity())
    r = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    i = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    c = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ? AND pago = 0', (uid,))['t']
    return jsonify({'ativos': float(r+i), 'passivos': float(c), 'patrimonio_liquido': float(r+i-c)})

@app.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    return jsonify([{'msg': 'Seu planejamento está em dia!', 'tipo': 'sucesso'}])

if __name__ == '__main__':
    app.run(debug=True, port=5000)
