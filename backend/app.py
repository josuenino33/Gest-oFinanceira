import os
import sqlite3
import requests as http_requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from google import genai as google_genai
from google.genai import types as genai_types  # type: ignore

app = Flask(__name__)
CORS(app)

# Configurações
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)

# IA Gemini
gemini_client = None
GEMINI_MODEL = 'gemini-flash-lite-latest'
GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts'
GEMINI_TTS_VOICE = 'Zephyr'
try:
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        gemini_client = google_genai.Client(api_key=api_key)
        print('IA Gemini configurada com sucesso.')
    else:
        print('GEMINI_API_KEY não configurada. IA desabilitada.')
except Exception as e:
    print(f'Erro ao configurar IA: {e}')

# ElevenLabs TTS
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY', '')
ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'  # Bella — voz feminina natural, ótima em pt-BR

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
            f"CREATE TABLE IF NOT EXISTS planejamento (id {pk}, user_id INTEGER, categoria_id INTEGER, valor_planejado REAL NOT NULL, mes INTEGER NOT NULL, ano INTEGER NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            f"CREATE TABLE IF NOT EXISTS recorrencias (id {pk}, user_id INTEGER, tipo TEXT NOT NULL, descricao TEXT NOT NULL, valor REAL NOT NULL, categoria_id INTEGER, dia INTEGER DEFAULT 1, ativo INTEGER DEFAULT 1, ultima_geracao TEXT, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            f"CREATE TABLE IF NOT EXISTS orcamentos (id {pk}, user_id INTEGER NOT NULL, categoria_id INTEGER NOT NULL, limite REAL NOT NULL, mes INTEGER NOT NULL, ano INTEGER NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            f"CREATE TABLE IF NOT EXISTS historico_patrimonio (id {pk}, user_id INTEGER NOT NULL, data TEXT NOT NULL, em_caixa REAL DEFAULT 0, a_pagar REAL DEFAULT 0, investido REAL DEFAULT 0, patrimonio_liquido REAL DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            f"CREATE TABLE IF NOT EXISTS envelopes (id {pk}, user_id INTEGER NOT NULL, mes INTEGER NOT NULL, ano INTEGER NOT NULL, categoria_id INTEGER NOT NULL, alocado REAL NOT NULL DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            f"CREATE TABLE IF NOT EXISTS desafios (id {pk}, user_id INTEGER NOT NULL, titulo TEXT NOT NULL, descricao TEXT DEFAULT '', meta_valor REAL NOT NULL, valor_atual REAL DEFAULT 0, data_inicio TEXT NOT NULL, data_fim TEXT NOT NULL, concluido INTEGER DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
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
    nome = (d.get('nome') or '').strip()
    email = (d.get('email') or '').strip()
    password = d.get('password') or ''
    if not nome or not email or not password:
        return jsonify({'msg': 'Preencha todos os campos.'}), 400
    if len(password) < 6:
        return jsonify({'msg': 'A senha deve ter ao menos 6 caracteres.'}), 400
    if '@' not in email:
        return jsonify({'msg': 'Email inválido.'}), 400
    try:
        h = generate_password_hash(password)
        execute_query('INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)', (nome, email, h))
        return jsonify({'msg': 'Usuário criado'}), 201
    except Exception as e:
        return jsonify({'msg': 'Email já cadastrado.'}), 400

@app.route('/resumo', methods=['GET'])
@jwt_required()
def resumo():
    uid = int(get_jwt_identity())
    r = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM receitas WHERE user_id = ?', (uid,))['t']
    d = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ?', (uid,))['t']
    m = fetch_one('SELECT COALESCE(AVG(progresso), 0) as p FROM metas WHERE user_id = ?', (uid,))['p']
    # Saldo = receitas - despesas (investimentos são ativos separados, não saem do saldo)
    saldo = float(r) - float(d)
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

@app.route('/categorias/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
def rota_categoria_id(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM categorias WHERE id = ? AND user_id = ?', (id, uid))
        return jsonify({'msg': 'OK'})
    d = request.json
    execute_query('UPDATE categorias SET nome = ?, cor = ? WHERE id = ? AND user_id = ?', (d.get('nome'), d.get('cor'), id, uid))
    return jsonify({'msg': 'OK'})

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
    # Só contas PAGAS saem do caixa — pendentes são compromissos futuros
    d_pagas   = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ? AND pago = 1', (uid,))['t']
    d_pending = fetch_one('SELECT COALESCE(SUM(valor), 0) as t FROM contas WHERE user_id = ? AND pago = 0', (uid,))['t']
    inv_aplicado = fetch_one('SELECT COALESCE(SUM(valor_investido), 0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']
    inv_atual    = fetch_one('SELECT COALESCE(SUM(valor_atual),    0) as t FROM investimentos WHERE user_id = ?', (uid,))['t']

    # Caixa = receitas recebidas − contas já pagas
    saldo_caixa = float(r) - float(d_pagas)
    # Rendimento = valorização dos investimentos
    rendimento = float(inv_atual) - float(inv_aplicado)
    # Patrimônio Líquido = caixa + investimentos − pendências (o que realmente é seu)
    patrimonio_liquido = saldo_caixa - float(d_pending) + float(inv_atual)

    # Trofeus
    conquistas = []
    total_rec = fetch_one('SELECT COUNT(*) as c FROM receitas WHERE user_id=?', (uid,))['c']
    total_contas = fetch_one('SELECT COUNT(*) as c FROM contas WHERE user_id=?', (uid,))['c']
    total_inv = fetch_one('SELECT COUNT(*) as c FROM investimentos WHERE user_id=?', (uid,))['c']
    total_cartoes = fetch_one('SELECT COUNT(*) as c FROM cartoes WHERE user_id=?', (uid,))['c']
    total_metas = fetch_one('SELECT COUNT(*) as c FROM metas WHERE user_id=?', (uid,))['c']
    metas_100 = fetch_one('SELECT COUNT(*) as c FROM metas WHERE user_id=? AND progresso >= 100', (uid,))['c']
    contas_pendentes = fetch_one('SELECT COUNT(*) as c FROM contas WHERE user_id=? AND pago=0', (uid,))['c']
    economia_pct = round(((float(r) - float(d_pagas)) / float(r)) * 100, 1) if float(r) > 0 else 0

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

    # Salvar snapshot diário
    try:
        salvar_snapshot_patrimonio(uid, saldo_caixa, float(d_pending), float(inv_atual), patrimonio_liquido)
    except:
        pass

    return jsonify({
        'saldo_caixa': saldo_caixa,
        'a_pagar': float(d_pending),
        'investimentos_aplicados': float(inv_aplicado),
        'investimentos': float(inv_atual),
        'rendimento': rendimento,
        'patrimonio_liquido': patrimonio_liquido,
        'conquistas': conquistas
    })

@app.route('/notificacoes', methods=['GET'])
@jwt_required()
def get_notificacoes():
    uid = int(get_jwt_identity())
    now = datetime.now()
    mes, ano = now.month, now.year
    start = f"{ano}-{mes:02d}-01 00:00:00"
    end = f"{ano}-{mes+1:02d}-01 00:00:00" if mes < 12 else f"{ano+1}-01-01 00:00:00"
    notifs = []
    overdue = fetch_all("SELECT descricao, valor FROM contas WHERE user_id=? AND pago=0 AND criado_em < ?", (uid, start))
    for c in overdue:
        notifs.append({'msg': f'Atrasada: {c["descricao"]}', 'valor': float(c['valor']), 'tipo': 'urgente'})
    pending = fetch_all("SELECT descricao, valor FROM contas WHERE user_id=? AND pago=0 AND criado_em >= ? AND criado_em < ?", (uid, start, end))
    for c in pending:
        notifs.append({'msg': f'Pendente: {c["descricao"]}', 'valor': float(c['valor']), 'tipo': 'alerta'})
    return jsonify(notifs[:10])

@app.route('/recorrencias', methods=['GET', 'POST'])
@jwt_required()
def rota_recorrencias():
    uid = int(get_jwt_identity())
    if request.method == 'POST':
        d = request.json
        execute_query(
            'INSERT INTO recorrencias (user_id, tipo, descricao, valor, categoria_id, dia, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)',
            (uid, d.get('tipo'), d.get('descricao'), d.get('valor'), d.get('categoria_id'), d.get('dia', 1))
        )
        return jsonify({'msg': 'OK'})
    rows = fetch_all('''
        SELECT r.*, c.nome as categoria_nome FROM recorrencias r
        LEFT JOIN categorias c ON c.id = r.categoria_id
        WHERE r.user_id = ? ORDER BY r.id DESC
    ''', (uid,))
    return jsonify(rows)

@app.route('/recorrencias/<int:id>', methods=['DELETE', 'PATCH'])
@jwt_required()
def rota_recorrencia_id(id):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM recorrencias WHERE id = ? AND user_id = ?', (id, uid))
        return jsonify({'msg': 'OK'})
    rec = fetch_one('SELECT ativo FROM recorrencias WHERE id = ? AND user_id = ?', (id, uid))
    if not rec:
        return jsonify({'msg': 'Not found'}), 404
    execute_query('UPDATE recorrencias SET ativo = ? WHERE id = ? AND user_id = ?', (0 if rec['ativo'] else 1, id, uid))
    return jsonify({'msg': 'OK'})

@app.route('/recorrencias/gerar', methods=['POST'])
@jwt_required()
def gerar_recorrencias():
    uid = int(get_jwt_identity())
    now = datetime.now()
    mes, ano = now.month, now.year
    chave = f"{ano}-{mes:02d}"
    rows = fetch_all('SELECT * FROM recorrencias WHERE user_id = ? AND ativo = 1', (uid,))
    geradas = 0
    for r in rows:
        if r.get('ultima_geracao') == chave:
            continue
        dia = min(int(r['dia']), 28)
        data = f"{ano}-{mes:02d}-{dia:02d} 12:00:00"
        if r['tipo'] == 'receita':
            execute_query('INSERT INTO receitas (user_id, descricao, valor, categoria_id, criado_em) VALUES (?, ?, ?, ?, ?)',
                          (uid, r['descricao'], r['valor'], r['categoria_id'], data))
        else:
            execute_query('INSERT INTO contas (user_id, descricao, valor, categoria_id, pago, criado_em) VALUES (?, ?, ?, ?, 0, ?)',
                          (uid, r['descricao'], r['valor'], r['categoria_id'], data))
        execute_query("UPDATE recorrencias SET ultima_geracao = ? WHERE id = ?", (chave, r['id']))
        geradas += 1
    return jsonify({'msg': f'{geradas} transações geradas para {mes:02d}/{ano}', 'geradas': geradas})

@app.route('/perfil', methods=['PUT'])
@jwt_required()
def update_perfil():
    uid = int(get_jwt_identity())
    d = request.json
    execute_query('UPDATE users SET nome = ?, email = ? WHERE id = ?', (d.get('nome'), d.get('email'), uid))
    return jsonify({'msg': 'OK'})

@app.route('/perfil/senha', methods=['PUT'])
@jwt_required()
def update_senha():
    uid = int(get_jwt_identity())
    d = request.json
    senha_atual = d.get('senha_atual', '')
    nova_senha = d.get('nova_senha', '')
    if not senha_atual or not nova_senha:
        return jsonify({'msg': 'Preencha os campos de senha.'}), 400
    if len(nova_senha) < 6:
        return jsonify({'msg': 'A nova senha deve ter ao menos 6 caracteres.'}), 400
    user = fetch_one('SELECT senha FROM users WHERE id = ?', (uid,))
    if not user or not check_password_hash(user['senha'], senha_atual):
        return jsonify({'msg': 'Senha atual incorreta.'}), 400
    execute_query('UPDATE users SET senha = ? WHERE id = ?', (generate_password_hash(nova_senha), uid))
    return jsonify({'msg': 'Senha alterada com sucesso!'})

@app.route('/test-ai', methods=['GET'])
def test_ai():
    return jsonify({'modelos_disponiveis': [GEMINI_MODEL] if gemini_client else []})

@app.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    uid = int(get_jwt_identity())
    d = request.json
    msg = d.get('message', '')
    if not gemini_client:
        return jsonify({'response': 'IA não configurada no momento.'})
    try:
        resumo = fetch_one('SELECT COALESCE(SUM(valor),0) as t FROM receitas WHERE user_id=?', (uid,))
        desp = fetch_one('SELECT COALESCE(SUM(valor),0) as t FROM contas WHERE user_id=?', (uid,))
        inv = fetch_one('SELECT COALESCE(SUM(valor_atual),0) as t FROM investimentos WHERE user_id=?', (uid,))
        r, de, iv = float(resumo['t']), float(desp['t']), float(inv['t'])
        context = (
            f"Você é um assistente financeiro pessoal. Dados do usuário:\n"
            f"- Receitas: R$ {r:,.2f}\n"
            f"- Despesas: R$ {de:,.2f}\n"
            f"- Saldo: R$ {r-de:,.2f}\n"
            f"- Investimentos: R$ {iv:,.2f}\n"
            f"Responda de forma concisa em português.\n\nUsuário: {msg}"
        )
        cfg = genai_types.GenerateContentConfig(max_output_tokens=400, temperature=0.5)

        def generate():
            try:
                for chunk in gemini_client.models.generate_content_stream(
                    model=GEMINI_MODEL, contents=context, config=cfg
                ):
                    if chunk.text:
                        safe = chunk.text.replace('\n', '\\n')
                        yield f"data: {safe}\n\n"
            except Exception as ex:
                yield f"data: [ERROR]{str(ex)}\n\n"
            yield "data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
        )
    except Exception as e:
        return jsonify({'response': f'Erro na IA: {str(e)}'}), 500

@app.route('/tts', methods=['POST'])
@jwt_required()
def text_to_speech():
    d = request.json or {}
    text = (d.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'Texto vazio'}), 400

    # Tenta ElevenLabs primeiro
    if ELEVENLABS_API_KEY:
        try:
            el_resp = http_requests.post(
                f'https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}',
                headers={'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'},
                json={
                    'text': text,
                    'model_id': 'eleven_multilingual_v2',
                    'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0.1, 'use_speaker_boost': True}
                },
                timeout=15
            )
            el_resp.raise_for_status()
            return Response(el_resp.content, mimetype='audio/mpeg')
        except Exception as e:
            print(f'ElevenLabs TTS falhou, usando Gemini: {e}')

    # Fallback: Gemini TTS
    if not gemini_client:
        return jsonify({'error': 'TTS não configurado'}), 503
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_TTS_MODEL,
            contents=text,
            config=genai_types.GenerateContentConfig(
                response_modalities=['AUDIO'],
                speech_config=genai_types.SpeechConfig(
                    voice_config=genai_types.VoiceConfig(
                        prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                            voice_name=GEMINI_TTS_VOICE
                        )
                    )
                )
            )
        )
        audio_data = response.candidates[0].content.parts[0].inline_data.data
        if isinstance(audio_data, str):
            import base64
            audio_data = base64.b64decode(audio_data)
        return Response(audio_data, mimetype='audio/wav')
    except Exception as e:
        print(f'Gemini TTS error: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/auto-categorize', methods=['POST'])
@jwt_required()
def auto_categorize():
    uid = int(get_jwt_identity())
    descricao = request.json.get('descricao', '')
    if not gemini_client or not descricao:
        return jsonify({'categoria_id': None})
    try:
        cats = fetch_all('SELECT id, nome FROM categorias WHERE user_id IS NULL OR user_id = ?', (uid,))
        lista = ', '.join([f"{c['id']}:{c['nome']}" for c in cats])
        prompt = (
            f"Categorize esta transação financeira: '{descricao}'\n"
            f"Categorias disponíveis (id:nome): {lista}\n"
            f"Responda APENAS com o número do id da categoria mais adequada. "
            f"Se nenhuma se encaixar, responda 0."
        )
        res = gemini_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        cat_id = int(''.join(filter(str.isdigit, res.text.strip())) or '0')
        valid_ids = {c['id'] for c in cats}
        return jsonify({'categoria_id': cat_id if cat_id in valid_ids else None})
    except Exception as e:
        print(f'auto-categorize error: {e}')
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

# ─── ORÇAMENTOS ────────────────────────────────────────────────────────────────

@app.route('/orcamentos', methods=['GET', 'POST'])
@jwt_required()
def orcamentos():
    uid = int(get_jwt_identity())
    if request.method == 'GET':
        mes = int(request.args.get('mes', datetime.now().month))
        ano = int(request.args.get('ano', datetime.now().year))
        rows = fetch_all('''
            SELECT o.id, o.categoria_id, o.limite, o.mes, o.ano,
                   c.nome as categoria_nome, c.cor,
                   COALESCE((
                       SELECT SUM(ct.valor) FROM contas ct
                       WHERE ct.user_id = o.user_id
                         AND ct.categoria_id = o.categoria_id
                         AND ct.pago = 1
                         AND strftime('%m', ct.criado_em) = ?
                         AND strftime('%Y', ct.criado_em) = ?
                   ), 0) as gasto
            FROM orcamentos o
            LEFT JOIN categorias c ON c.id = o.categoria_id
            WHERE o.user_id = ? AND o.mes = ? AND o.ano = ?
            ORDER BY c.nome
        ''', (f'{mes:02d}', str(ano), uid, mes, ano))
        return jsonify(rows)
    d = request.json or {}
    cat_id  = d.get('categoria_id')
    limite  = float(d.get('limite', 0))
    mes     = int(d.get('mes', datetime.now().month))
    ano     = int(d.get('ano', datetime.now().year))
    if not cat_id or limite <= 0:
        return jsonify({'msg': 'Categoria e limite são obrigatórios.'}), 400
    existing = fetch_one('SELECT id FROM orcamentos WHERE user_id=? AND categoria_id=? AND mes=? AND ano=?', (uid, cat_id, mes, ano))
    if existing:
        execute_query('UPDATE orcamentos SET limite=? WHERE id=?', (limite, existing['id']))
    else:
        execute_query('INSERT INTO orcamentos (user_id, categoria_id, limite, mes, ano) VALUES (?,?,?,?,?)', (uid, cat_id, limite, mes, ano))
    return jsonify({'msg': 'OK'}), 201

@app.route('/orcamentos/<int:oid>', methods=['DELETE'])
@jwt_required()
def delete_orcamento(oid):
    uid = int(get_jwt_identity())
    execute_query('DELETE FROM orcamentos WHERE id=? AND user_id=?', (oid, uid))
    return jsonify({'msg': 'OK'})

# ─── SAÚDE FINANCEIRA ──────────────────────────────────────────────────────────

@app.route('/saude-financeira', methods=['GET'])
@jwt_required()
def saude_financeira():
    uid = int(get_jwt_identity())
    mes = int(request.args.get('mes', datetime.now().month))
    ano = int(request.args.get('ano', datetime.now().year))
    mes_s, ano_s = f'{mes:02d}', str(ano)

    r  = float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM receitas WHERE user_id=? AND strftime('%m',criado_em)=? AND strftime('%Y',criado_em)=?", (uid, mes_s, ano_s))['t'])
    dp = float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM contas   WHERE user_id=? AND pago=1 AND strftime('%m',criado_em)=? AND strftime('%Y',criado_em)=?", (uid, mes_s, ano_s))['t'])
    inv = float(fetch_one('SELECT COALESCE(SUM(valor_atual),0) as t FROM investimentos WHERE user_id=?', (uid,))['t'])
    inv_ap = float(fetch_one('SELECT COALESCE(SUM(valor_investido),0) as t FROM investimentos WHERE user_id=?', (uid,))['t'])
    has_metas = fetch_one('SELECT COUNT(*) as c FROM metas WHERE user_id=?', (uid,))['c']
    has_orc   = fetch_one('SELECT COUNT(*) as c FROM orcamentos WHERE user_id=?', (uid,))['c']

    poupanca = r - dp
    taxa_poupanca = round((poupanca / r * 100), 1) if r > 0 else 0
    rendimento = inv - inv_ap

    score = 0
    fatores = []

    # 1. Taxa de poupança (35 pts)
    if taxa_poupanca >= 20:
        pts = 35
        msg = f'Excelente! Poupando {taxa_poupanca:.0f}% da renda'
    elif taxa_poupanca >= 10:
        pts = 22
        msg = f'Bom. Poupando {taxa_poupanca:.0f}% — meta é 20%'
    elif taxa_poupanca > 0:
        pts = 10
        msg = f'Atenção: poupando apenas {taxa_poupanca:.0f}%'
    else:
        pts = 0
        msg = 'Gastos maiores que receitas este mês'
    score += pts
    fatores.append({'fator': 'Poupança', 'icone': '💰', 'pts': pts, 'max': 35, 'msg': msg})

    # 2. Investimentos (25 pts)
    if inv > 0 and rendimento >= 0:
        pts = 25
        msg = f'Investindo R$ {inv:,.2f} com rendimento positivo'
    elif inv > 0:
        pts = 15
        msg = f'Tem investimentos mas com queda no período'
    else:
        pts = 0
        msg = 'Sem investimentos — comece mesmo que pouco'
    score += pts
    fatores.append({'fator': 'Investimentos', 'icone': '📈', 'pts': pts, 'max': 25, 'msg': msg})

    # 3. Controle de gastos (25 pts)
    if r > 0:
        ratio = dp / r
        if ratio <= 0.5:   pts, msg = 25, 'Gastos abaixo de 50% da renda — excepcional'
        elif ratio <= 0.7: pts, msg = 18, 'Bom controle — gastos entre 50% e 70%'
        elif ratio <= 0.9: pts, msg = 10, 'Gastos elevados — reduza se possível'
        else:               pts, msg = 0,  'Alerta: gastos acima de 90% da renda'
    else:
        pts, msg = 0, 'Sem receita registrada este mês'
    score += pts
    fatores.append({'fator': 'Controle de Gastos', 'icone': '🎯', 'pts': pts, 'max': 25, 'msg': msg})

    # 4. Planejamento (15 pts)
    pts = min(15, (5 if has_orc > 0 else 0) + (5 if has_orc >= 3 else 0) + (5 if has_metas > 0 else 0))
    msg = 'Orçamentos e metas configurados' if pts == 15 else ('Configure orçamentos por categoria e metas' if pts == 0 else 'Adicione mais orçamentos e metas')
    score += pts
    fatores.append({'fator': 'Planejamento', 'icone': '📋', 'pts': pts, 'max': 15, 'msg': msg})

    # 50-30-20
    regra = {
        'necessidades': {'real': round(dp * 0.65, 2), 'meta': round(r * 0.50, 2)},
        'desejos':      {'real': round(dp * 0.35, 2), 'meta': round(r * 0.30, 2)},
        'poupanca':     {'real': round(max(0, poupanca), 2), 'meta': round(r * 0.20, 2)},
    }

    return jsonify({
        'score': min(100, score),
        'taxa_poupanca': taxa_poupanca,
        'receita': r, 'despesa': dp, 'poupanca': poupanca,
        'investimentos': inv, 'rendimento': rendimento,
        'fatores': fatores,
        'regra_50_30_20': regra,
    })

# ─── PROJEÇÃO DE FLUXO DE CAIXA ───────────────────────────────────────────────

@app.route('/projecao', methods=['GET'])
@jwt_required()
def projecao():
    uid  = int(get_jwt_identity())
    meses_futuro = int(request.args.get('meses', 6))
    now  = datetime.now()

    # Média dos últimos 3 meses
    media_rec = media_desp = 0
    amostras = 0
    for delta in range(1, 4):
        d = datetime(now.year, now.month, 1) - timedelta(days=delta * 28)
        ms, ys = f'{d.month:02d}', str(d.year)
        r = float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM receitas WHERE user_id=? AND strftime('%m',criado_em)=? AND strftime('%Y',criado_em)=?", (uid, ms, ys))['t'])
        e = float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM contas WHERE user_id=? AND pago=1 AND strftime('%m',criado_em)=? AND strftime('%Y',criado_em)=?", (uid, ms, ys))['t'])
        if r > 0 or e > 0:
            media_rec  += r
            media_desp += e
            amostras   += 1

    if amostras > 0:
        media_rec  = round(media_rec  / amostras, 2)
        media_desp = round(media_desp / amostras, 2)

    # Recorrências ativas
    recs = fetch_all('SELECT tipo, valor FROM recorrencias WHERE user_id=? AND ativo=1', (uid,))
    rec_entrada = sum(float(r['valor']) for r in recs if r['tipo'] == 'receita')
    rec_saida   = sum(float(r['valor']) for r in recs if r['tipo'] == 'despesa')

    receita_mensal = max(media_rec, rec_entrada)
    despesa_mensal = max(media_desp, rec_saida)

    saldo_atual = float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM receitas WHERE user_id=?", (uid,))['t']) - \
                  float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM contas WHERE user_id=? AND pago=1", (uid,))['t'])

    meses_labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    projecoes = [{'mes': 'Hoje', 'saldo': round(saldo_atual, 2), 'receitas': 0, 'despesas': 0}]

    saldo = saldo_atual
    for i in range(1, meses_futuro + 1):
        m_idx = (now.month - 1 + i) % 12
        saldo += receita_mensal - despesa_mensal
        projecoes.append({
            'mes': meses_labels[m_idx],
            'saldo': round(saldo, 2),
            'receitas': receita_mensal,
            'despesas': despesa_mensal,
        })

    return jsonify({
        'projecoes': projecoes,
        'media_receita': receita_mensal,
        'media_despesa': despesa_mensal,
    })

# ─── ALERTAS IA ───────────────────────────────────────────────────────────────

@app.route('/alertas-ia', methods=['GET'])
@jwt_required()
def alertas_ia():
    if not gemini_client:
        return jsonify([])
    uid = int(get_jwt_identity())
    now = datetime.now()
    mes, ano = now.month, now.year
    mes_ant = mes - 1 if mes > 1 else 12
    ano_ant = ano if mes > 1 else ano - 1
    ms, ys   = f'{mes:02d}',     str(ano)
    ms2, ys2 = f'{mes_ant:02d}', str(ano_ant)

    def get_stats(m, y):
        r = float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM receitas WHERE user_id=? AND strftime('%m',criado_em)=? AND strftime('%Y',criado_em)=?", (uid, m, y))['t'])
        d = float(fetch_one("SELECT COALESCE(SUM(valor),0) as t FROM contas WHERE user_id=? AND pago=1 AND strftime('%m',criado_em)=? AND strftime('%Y',criado_em)=?", (uid, m, y))['t'])
        return r, d

    r_atual, d_atual = get_stats(ms,  ys)
    r_ant,   d_ant   = get_stats(ms2, ys2)

    cats = fetch_all("""
        SELECT c.nome, COALESCE(SUM(ct.valor),0) as total
        FROM contas ct JOIN categorias c ON c.id = ct.categoria_id
        WHERE ct.user_id=? AND ct.pago=1 AND strftime('%m',ct.criado_em)=? AND strftime('%Y',ct.criado_em)=?
        GROUP BY c.nome ORDER BY total DESC LIMIT 5
    """, (uid, ms, ys))
    cats_str = ', '.join([f"{c['nome']}: R${c['total']:.2f}" for c in cats]) or 'sem dados'

    var_rec  = ((r_atual - r_ant) / r_ant  * 100) if r_ant  > 0 else 0
    var_desp = ((d_atual - d_ant) / d_ant * 100)  if d_ant > 0 else 0
    taxa_poc = ((r_atual - d_atual) / r_atual * 100) if r_atual > 0 else 0

    prompt = f"""Analise esses dados financeiros pessoais e gere exatamente 4 insights curtos em português brasileiro.

Mês atual: Receitas R${r_atual:.2f} | Despesas pagas R${d_atual:.2f} | Taxa de poupança {taxa_poc:.1f}%
Mês anterior: Receitas R${r_ant:.2f} | Despesas R${d_ant:.2f}
Variação receita: {var_rec:+.1f}% | Variação despesa: {var_desp:+.1f}%
Top categorias de gasto: {cats_str}

Responda APENAS com JSON válido, sem texto extra:
[{{"tipo": "positivo"|"alerta"|"dica", "titulo": "até 5 palavras", "msg": "1 frase direta e útil"}}]"""

    try:
        resp = gemini_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        import json, re
        match = re.search(r'\[.*?\]', resp.text, re.DOTALL)
        if match:
            return jsonify(json.loads(match.group()))
    except Exception as e:
        print(f'alertas-ia error: {e}')
    return jsonify([])


# ==================== HISTÓRICO DE PATRIMÔNIO ====================

@app.route('/historico-patrimonio', methods=['GET'])
@jwt_required()
def historico_patrimonio():
    uid = int(get_jwt_identity())
    dias = int(request.args.get('dias', 90))
    rows = fetch_all(
        'SELECT data, em_caixa, a_pagar, investido, patrimonio_liquido FROM historico_patrimonio WHERE user_id = ? ORDER BY data ASC LIMIT ?',
        (uid, dias)
    )
    return jsonify([dict(r) for r in rows])

def salvar_snapshot_patrimonio(uid, em_caixa, a_pagar, investido, patrimonio_liquido):
    hoje = datetime.now().strftime('%Y-%m-%d')
    existing = fetch_one('SELECT id FROM historico_patrimonio WHERE user_id = ? AND data = ?', (uid, hoje))
    if existing:
        execute_query(
            'UPDATE historico_patrimonio SET em_caixa=?, a_pagar=?, investido=?, patrimonio_liquido=? WHERE user_id=? AND data=?',
            (em_caixa, a_pagar, investido, patrimonio_liquido, uid, hoje)
        )
    else:
        execute_query(
            'INSERT INTO historico_patrimonio (user_id, data, em_caixa, a_pagar, investido, patrimonio_liquido) VALUES (?,?,?,?,?,?)',
            (uid, hoje, em_caixa, a_pagar, investido, patrimonio_liquido)
        )

# ==================== TRANSCRIÇÃO SMS/EXTRATO ====================

@app.route('/ai/transcrever', methods=['POST'])
@jwt_required()
def transcrever_sms():
    uid = int(get_jwt_identity())
    if not gemini_client:
        return jsonify({'error': 'IA não configurada'}), 503
    d = request.json or {}
    texto = (d.get('texto') or '').strip()
    if not texto:
        return jsonify({'error': 'Texto vazio'}), 400

    categorias = fetch_all('SELECT id, nome FROM categorias WHERE user_id IS NULL OR user_id = ?', (uid,))
    cats_str = ', '.join([f"{c['id']}:{c['nome']}" for c in categorias])

    prompt = f"""Extraia os dados da transação financeira abaixo e retorne APENAS JSON válido, sem texto extra.

Texto: "{texto}"

Categorias disponíveis (id:nome): {cats_str}

Retorne:
{{"tipo": "receita" ou "despesa", "descricao": "nome curto da transação", "valor": número, "categoria_id": id mais adequado ou null, "data": "YYYY-MM-DD" ou null}}

Se não conseguir extrair valor ou tipo, retorne {{"erro": "não reconhecido"}}"""

    try:
        resp = gemini_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        import json, re
        match = re.search(r'\{.*?\}', resp.text, re.DOTALL)
        if match:
            return jsonify(json.loads(match.group()))
    except Exception as e:
        print(f'transcrever error: {e}')
    return jsonify({'erro': 'Falha ao processar'}), 500

# ==================== ENVELOPES ====================

@app.route('/envelopes', methods=['GET', 'POST'])
@jwt_required()
def rota_envelopes():
    uid = int(get_jwt_identity())
    if request.method == 'GET':
        mes = int(request.args.get('mes', datetime.now().month))
        ano = int(request.args.get('ano', datetime.now().year))
        ms = str(mes).zfill(2)
        ys = str(ano)
        rows = fetch_all('''
            SELECT e.id, e.categoria_id, e.alocado, c.nome as categoria_nome, c.cor,
                COALESCE((
                    SELECT SUM(ct.valor) FROM contas ct
                    WHERE ct.categoria_id = e.categoria_id AND ct.user_id = e.user_id
                    AND strftime('%m', ct.criado_em) = ? AND strftime('%Y', ct.criado_em) = ?
                ), 0) as gasto
            FROM envelopes e
            JOIN categorias c ON c.id = e.categoria_id
            WHERE e.user_id = ? AND e.mes = ? AND e.ano = ?
            ORDER BY e.alocado DESC
        ''', (ms, ys, uid, mes, ano))
        return jsonify([dict(r) for r in rows])

    d = request.json or {}
    categoria_id = d.get('categoria_id')
    alocado = float(d.get('alocado', 0))
    mes = int(d.get('mes', datetime.now().month))
    ano = int(d.get('ano', datetime.now().year))
    existing = fetch_one('SELECT id FROM envelopes WHERE user_id=? AND categoria_id=? AND mes=? AND ano=?', (uid, categoria_id, mes, ano))
    if existing:
        execute_query('UPDATE envelopes SET alocado=? WHERE id=?', (alocado, existing['id']))
    else:
        execute_query('INSERT INTO envelopes (user_id, categoria_id, alocado, mes, ano) VALUES (?,?,?,?,?)', (uid, categoria_id, alocado, mes, ano))
    return jsonify({'ok': True})

@app.route('/envelopes/<int:eid>', methods=['DELETE'])
@jwt_required()
def deletar_envelope(eid):
    uid = int(get_jwt_identity())
    execute_query('DELETE FROM envelopes WHERE id=? AND user_id=?', (eid, uid))
    return jsonify({'ok': True})

@app.route('/envelopes/renda', methods=['GET'])
@jwt_required()
def renda_envelopes():
    uid = int(get_jwt_identity())
    mes = int(request.args.get('mes', datetime.now().month))
    ano = int(request.args.get('ano', datetime.now().year))
    ms = str(mes).zfill(2)
    ys = str(ano)
    renda = fetch_one(
        "SELECT COALESCE(SUM(valor),0) as t FROM receitas WHERE user_id=? AND strftime('%m',criado_em)=? AND strftime('%Y',criado_em)=?",
        (uid, ms, ys)
    )['t']
    return jsonify({'renda': float(renda)})

# ==================== DESAFIOS ====================

@app.route('/desafios', methods=['GET', 'POST'])
@jwt_required()
def rota_desafios():
    uid = int(get_jwt_identity())
    if request.method == 'GET':
        rows = fetch_all('SELECT * FROM desafios WHERE user_id=? ORDER BY concluido ASC, data_fim ASC', (uid,))
        return jsonify([dict(r) for r in rows])
    d = request.json or {}
    titulo = (d.get('titulo') or '').strip()
    descricao = (d.get('descricao') or '').strip()
    meta_valor = float(d.get('meta_valor', 0))
    data_inicio = d.get('data_inicio', datetime.now().strftime('%Y-%m-%d'))
    data_fim = d.get('data_fim', '')
    if not titulo or meta_valor <= 0 or not data_fim:
        return jsonify({'msg': 'Dados inválidos'}), 400
    execute_query(
        'INSERT INTO desafios (user_id, titulo, descricao, meta_valor, data_inicio, data_fim) VALUES (?,?,?,?,?,?)',
        (uid, titulo, descricao, meta_valor, data_inicio, data_fim)
    )
    return jsonify({'ok': True}), 201

@app.route('/desafios/<int:did>', methods=['PATCH', 'DELETE'])
@jwt_required()
def atualizar_desafio(did):
    uid = int(get_jwt_identity())
    if request.method == 'DELETE':
        execute_query('DELETE FROM desafios WHERE id=? AND user_id=?', (did, uid))
        return jsonify({'ok': True})
    d = request.json or {}
    valor_atual = float(d.get('valor_atual', 0))
    desafio = fetch_one('SELECT * FROM desafios WHERE id=? AND user_id=?', (did, uid))
    if not desafio:
        return jsonify({'msg': 'Não encontrado'}), 404
    concluido = 1 if valor_atual >= desafio['meta_valor'] else 0
    execute_query('UPDATE desafios SET valor_atual=?, concluido=? WHERE id=? AND user_id=?', (valor_atual, concluido, did, uid))
    return jsonify({'ok': True, 'concluido': bool(concluido)})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
