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
model = None
try:
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        print('IA Gemini configurada com sucesso.')
    else:
        print('GEMINI_API_KEY não configurada. IA desabilitada.')
except Exception as e:
    print(f'Erro ao configurar IA: {e}')

# Banco de Dados
DATABASE_URL = os.environ.get('DATABASE_URL')
IS_POSTGRES = DATABASE_URL is not None
DB_PATH = 'financeiro.db'

# Configuração de Pooling (Dica do Gemini)
db_pool = None
def init_pool():
    global db_pool
    if IS_POSTGRES and db_pool is None:
        try:
            from psycopg2.pool import ThreadedConnectionPool
            # Correção de URL para o Render (postgres:// para postgresql://)
            url = DATABASE_URL
            if url and url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            
            db_pool = ThreadedConnectionPool(1, 20, url)
            print("Pool de conexões PostgreSQL inicializado.")
        except Exception as e:
            print(f"ERRO CRÍTICO ao inicializar pool: {e}")
            raise e

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
    migrations = {
        'users': [('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'categorias': [('user_id', 'INTEGER'), ('cor', "TEXT DEFAULT '#22c55e'"), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'receitas': [('user_id', 'INTEGER'), ('categoria_id', 'INTEGER'), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'contas': [('user_id', 'INTEGER'), ('categoria_id', 'INTEGER'), ('pago', 'INTEGER DEFAULT 0'), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'cartoes': [('user_id', 'INTEGER'), ('bandeira', 'TEXT'), ('limite', 'REAL DEFAULT 0'), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'compras_cartao': [('user_id', 'INTEGER'), ('pago', 'INTEGER DEFAULT 0'), ('parcela_atual', 'INTEGER DEFAULT 1'), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'metas': [('user_id', 'INTEGER'), ('valor_alvo', 'REAL DEFAULT 0'), ('valor_atual', 'REAL DEFAULT 0'), ('progresso', 'INTEGER DEFAULT 0'), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'investimentos': [('user_id', 'INTEGER'), ('rentabilidade', 'REAL DEFAULT 0'), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')],
        'planejamento': [('user_id', 'INTEGER'), ('criado_em', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')]
    }

    for table, columns in migrations.items():
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table,))
        existing = {row[0] for row in cursor.fetchall()}
        for col, definition in columns:
            if col not in existing:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
                except:
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

# Inicializar banco na importação
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
    inv = fetch_one('SELECT COALESCE(SUM(valor_investido), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    m = fetch_one('SELECT COALESCE(AVG(progresso), 0) as p FROM metas WHERE user_id = ?', (uid,))['p']
    # Saldo = receitas - despesas - o que foi alocado em investimentos
    saldo = float(r) - float(d) - float(inv)
    return jsonify({'receitas': float(r), 'despesas': float(d), 'saldo': saldo, 'meta': float(m)})

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

    economia = round(((float(r) - float(d)) / float(r)) * 100, 1) if float(r) > 0 else 0
    return jsonify({
        'receitas': float(r), 'despesas': float(d), 'saldo': float(r-d),
        'meta_economia': economia,
        'categorias': cats, 'historico': historico
    })

@app.route('/patrimonio', methods=['GET'])
@jwt_required()
def get_patrimonio():
    uid = int(get_jwt_identity())
    r = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    d = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?', (uid,))['t']
    inv_aplicado = fetch_one('SELECT COALESCE(SUM(valor_investido), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    inv_atual = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']

    # Caixa = receitas − despesas − o que foi alocado em investimentos
    saldo_caixa = float(r) - float(d) - float(inv_aplicado)
    # Rendimento = valorização ou desvalorização dos investimentos
    rendimento = float(inv_atual) - float(inv_aplicado)
    # Patrimônio = caixa disponível + valor atual dos investimentos
    patrimonio_liquido = saldo_caixa + float(inv_atual)

    # Trofeus
    conquistas = []
    total_rec = fetch_one('SELECT COUNT(*) as c FROM receitas WHERE user_id=?', (uid,))['c']
    total_contas = fetch_one('SELECT COUNT(*) as c FROM contas WHERE user_id=?', (uid,))['c']
    total_inv = fetch_one('SELECT COUNT(*) as c FROM investimentos WHERE user_id=?', (uid,))['c']
    total_cartoes = fetch_one('SELECT COUNT(*) as c FROM cartoes WHERE user_id=?', (uid,))['c']
    total_metas = fetch_one('SELECT COUNT(*) as c FROM metas WHERE user_id=?', (uid,))['c']
    metas_100 = fetch_one('SELECT COUNT(*) as c FROM metas WHERE user_id=? AND progresso >= 100', (uid,))['c']
    contas_pendentes = fetch_one('SELECT COUNT(*) as c FROM contas WHERE user_id=? AND pago=0', (uid,))['c']
    economia_pct = round(((float(r) - float(d)) / float(r)) * 100, 1) if float(r) > 0 else 0

    if total_rec >= 1:
        conquistas.append({'titulo': 'Primeiro Passo', 'icone': '🌱', 'desc': 'Registrou sua primeira receita', 'desbloqueado': True})
    if economia_pct >= 20:
        conquistas.append({'titulo': 'Poupador', 'icone': '💰', 'desc': f'Economizando {economia_pct:.0f}% da renda', 'desbloqueado': True})
    if economia_pct >= 50:
        conquistas.append({'titulo': 'Grande Poupador', 'icone': '🏆', 'desc': 'Economizando mais de 50%!', 'desbloqueado': True})
    if total_inv >= 1:
        conquistas.append({'titulo': 'Investidor', 'icone': '📈', 'desc': 'Tem pelo menos 1 investimento', 'desbloqueado': True})
    if (total_rec + total_contas) >= 10:
        conquistas.append({'titulo': 'Organizado', 'icone': '📋', 'desc': 'Mais de 10 lançamentos registrados', 'desbloqueado': True})
    if total_cartoes >= 1:
        conquistas.append({'titulo': 'Carteira Completa', 'icone': '💳', 'desc': 'Cadastrou um cartão de crédito', 'desbloqueado': True})
    if total_metas >= 1:
        conquistas.append({'titulo': 'Sonhador', 'icone': '🌟', 'desc': 'Criou sua primeira meta', 'desbloqueado': True})
    if metas_100 >= 1:
        conquistas.append({'titulo': 'Meta Atingida', 'icone': '🎯', 'desc': 'Concluiu uma meta com sucesso!', 'desbloqueado': True})
    if total_contas >= 1 and contas_pendentes == 0:
        conquistas.append({'titulo': 'Sem Dívidas', 'icone': '✨', 'desc': 'Todas as contas estão pagas!', 'desbloqueado': True})

    return jsonify({
        'saldo_caixa': saldo_caixa,
        'investimentos_aplicados': float(inv_aplicado),
        'investimentos': float(inv_atual),
        'rendimento': rendimento,
        'patrimonio_liquido': patrimonio_liquido,
        'conquistas': conquistas
    })

@app.route('/notificacoes', methods=['GET'])
@jwt_required()
def get_notificacoes():
    return jsonify([])

@app.route('/perfil', methods=['PUT'])
@jwt_required()
def update_perfil():
    uid = int(get_jwt_identity())
    d = request.json
    execute_query('UPDATE users SET nome = ?, email = ? WHERE id = ?', (d.get('nome'), d.get('email'), uid))
    return jsonify({'msg': 'OK'})

@app.route('/test-ai', methods=['GET'])
def test_ai():
    return jsonify({'modelos_disponiveis': ['gemini-1.5-flash'] if model else []})

@app.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    d = request.json
    msg = d.get('message', '')
    if not model:
        return jsonify({'response': 'IA não configurada no momento.'})
    try:
        res = model.generate_content(msg)
        return jsonify({'response': res.text})
    except Exception as e:
        return jsonify({'response': f'Erro na IA: {str(e)}'}), 500

@app.route('/auto-categorize', methods=['POST'])
@jwt_required()
def auto_categorize():
    return jsonify({'categoria_id': None})

@app.route('/cartoes', methods=['GET', 'POST'])
@jwt_required()
def rota_cartoes():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        try:
            execute_query('INSERT INTO cartoes (user_id, nome, bandeira, limite) VALUES (?, ?, ?, ?)',
                          (uid, d.get('nome'), d.get('bandeira'), float(str(d.get('limite','0')).replace(',','.'))))
            return jsonify({'msg': 'OK'})
        except Exception as e:
            return jsonify({'msg': str(e)}), 500
    rows = fetch_all('SELECT * FROM cartoes WHERE user_id = ? ORDER BY id DESC', (uid,))
    for r in rows:
        gasto = fetch_one('SELECT COALESCE(SUM(valor),0) as t FROM compras_cartao WHERE cartao_id=? AND user_id=? AND pago=0', (r['id'], uid))
        r['total_gasto'] = float(gasto['t']) if gasto else 0
    return jsonify(rows)

@app.route('/cartoes/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_cartao(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM cartoes WHERE id = ? AND user_id = ?', (id, uid))
    else:
        d = request.json
        execute_query('UPDATE cartoes SET nome=?, bandeira=?, limite=? WHERE id=? AND user_id=?',
                      (d.get('nome'), d.get('bandeira'), d.get('limite'), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/compras-cartao', methods=['GET', 'POST'])
@jwt_required()
def rota_compras_cartao():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        try:
            cartao_id = int(d.get('cartao_id'))
            descricao = str(d.get('descricao','')).strip()
            valor_total = float(str(d.get('valor','0')).replace(',','.'))
            parcelas = int(d.get('parcelas', 1))
            mes_compra = int(d.get('mes_compra', datetime.now().month))
            ano_compra = int(d.get('ano_compra', datetime.now().year))
            valor_parcela = valor_total / parcelas
            for i in range(parcelas):
                m = mes_compra + 1 + i  # +1: fatura começa no mês seguinte à compra
                a = ano_compra
                while m > 12:
                    m -= 12
                    a += 1
                criado_em = f"{a}-{m:02d}-15 12:00:00"
                execute_query('INSERT INTO compras_cartao (user_id, cartao_id, descricao, valor, parcelas, parcela_atual, pago, criado_em) VALUES (?,?,?,?,?,?,0,?)',
                              (uid, cartao_id, descricao, valor_parcela, parcelas, i+1, criado_em))
            return jsonify({'msg': 'OK'})
        except Exception as e:
            return jsonify({'msg': str(e)}), 500
    rows = fetch_all('SELECT cc.*, c.nome as cartao_nome, c.bandeira FROM compras_cartao cc LEFT JOIN cartoes c ON c.id=cc.cartao_id WHERE cc.user_id=? ORDER BY cc.id DESC', (uid,))
    return jsonify(rows)

@app.route('/compras-cartao/grupo', methods=['DELETE'])
@jwt_required()
def excluir_grupo_compra():
    uid = int(get_jwt_identity())
    descricao = request.args.get('descricao', '')
    cartao_id = request.args.get('cartao_id', type=int)
    if not descricao or not cartao_id:
        return jsonify({'msg': 'Parâmetros inválidos'}), 400
    execute_query('DELETE FROM compras_cartao WHERE user_id=? AND descricao=? AND cartao_id=?', (uid, descricao, cartao_id))
    return jsonify({'msg': 'OK'})

@app.route('/compras-cartao/<int:id>', methods=['DELETE', 'PUT', 'PATCH'])
@jwt_required()
def acao_compra_cartao(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM compras_cartao WHERE id=? AND user_id=?', (id, uid))
    elif request.method == 'PATCH':
        execute_query('UPDATE compras_cartao SET pago=1 WHERE id=? AND user_id=?', (id, uid))
    else:
        d = request.json
        execute_query('UPDATE compras_cartao SET descricao=?, valor=?, cartao_id=?, parcelas=? WHERE id=? AND user_id=?',
                      (d.get('descricao'), d.get('valor'), d.get('cartao_id'), d.get('parcelas'), id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/metas', methods=['GET', 'POST'])
@jwt_required()
def rota_metas():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        try:
            va = float(str(d.get('valor_alvo','0')).replace(',','.'))
            vc = float(str(d.get('valor_atual','0')).replace(',','.'))
            prog = int((vc/va)*100) if va > 0 else 0
            execute_query('INSERT INTO metas (user_id, titulo, descricao, valor_alvo, valor_atual, progresso) VALUES (?,?,?,?,?,?)',
                          (uid, d.get('titulo'), d.get('descricao',''), va, vc, prog))
            return jsonify({'msg': 'OK'})
        except Exception as e:
            return jsonify({'msg': str(e)}), 500
    return jsonify(fetch_all('SELECT * FROM metas WHERE user_id=? ORDER BY id DESC', (uid,)))

@app.route('/metas/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_meta(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM metas WHERE id=? AND user_id=?', (id, uid))
    else:
        d = request.json
        va = float(str(d.get('valor_alvo','0')).replace(',','.'))
        vc = float(str(d.get('valor_atual','0')).replace(',','.'))
        prog = int((vc/va)*100) if va > 0 else 0
        execute_query('UPDATE metas SET titulo=?, descricao=?, valor_alvo=?, valor_atual=?, progresso=? WHERE id=? AND user_id=?',
                      (d.get('titulo'), d.get('descricao',''), va, vc, prog, id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/investimentos', methods=['GET', 'POST'])
@jwt_required()
def rota_investimentos():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        try:
            vi = float(str(d.get('valor_investido','0')).replace(',','.'))
            va = float(str(d.get('valor_atual','0')).replace(',','.'))
            rent = round(((va-vi)/vi)*100, 2) if vi > 0 else 0
            execute_query('INSERT INTO investimentos (user_id, titulo, tipo, valor_investido, valor_atual, rentabilidade) VALUES (?,?,?,?,?,?)',
                          (uid, d.get('titulo'), d.get('tipo'), vi, va, rent))
            return jsonify({'msg': 'OK'})
        except Exception as e:
            return jsonify({'msg': str(e)}), 500
    return jsonify(fetch_all('SELECT * FROM investimentos WHERE user_id=? ORDER BY id DESC', (uid,)))

@app.route('/investimentos/<int:id>', methods=['DELETE', 'PUT'])
@jwt_required()
def acao_investimento(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM investimentos WHERE id=? AND user_id=?', (id, uid))
    else:
        d = request.json
        vi = float(str(d.get('valor_investido','0')).replace(',','.'))
        va = float(str(d.get('valor_atual','0')).replace(',','.'))
        rent = round(((va-vi)/vi)*100, 2) if vi > 0 else 0
        execute_query('UPDATE investimentos SET titulo=?, tipo=?, valor_investido=?, valor_atual=?, rentabilidade=? WHERE id=? AND user_id=?',
                      (d.get('titulo'), d.get('tipo'), vi, va, rent, id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    uid = int(get_jwt_identity())
    insights = []
    r = fetch_one('SELECT COALESCE(SUM(valor),0) as t FROM receitas WHERE user_id=?', (uid,))['t']
    d = fetch_one('SELECT COALESCE(SUM(valor),0) as t FROM contas WHERE user_id=?', (uid,))['t']
    if float(d) > float(r) and float(r) > 0:
        insights.append({'msg': f'Suas despesas (R${float(d):.2f}) estão maiores que suas receitas. Hora de revisar os gastos!'})
    if float(r) > 0 and float(d) > 0:
        economia = ((float(r)-float(d))/float(r))*100
        if economia > 20:
            insights.append({'msg': f'Parabéns! Você está economizando {economia:.0f}% da sua renda.'})
    if not insights:
        insights.append({'msg': 'Continue registrando seus lançamentos para receber insights personalizados.'})
    return jsonify(insights)

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    d = request.json or {}
    email = d.get('email')
    u = fetch_one('SELECT * FROM users WHERE email = ?', (email,))
    if not u:
        return jsonify({'msg': 'Email não encontrado'}), 404
    return jsonify({'msg': 'Email encontrado. Defina sua nova senha.', 'email': email})

@app.route('/reset-password', methods=['POST'])
def reset_password():
    d = request.json or {}
    email = d.get('email')
    password = d.get('password')
    if not email or not password:
        return jsonify({'msg': 'Email e senha são obrigatórios'}), 400
    u = fetch_one('SELECT * FROM users WHERE email = ?', (email,))
    if not u:
        return jsonify({'msg': 'Email não encontrado'}), 404
    h = generate_password_hash(password)
    execute_query('UPDATE users SET senha = ? WHERE email = ?', (h, email))
    return jsonify({'msg': 'Senha alterada com sucesso!'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
