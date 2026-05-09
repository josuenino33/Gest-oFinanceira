import os
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
CORS(app)

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')
jwt = JWTManager(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'financeiro.db')


def get_db():
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # Se houver DATABASE_URL, assume que é PostgreSQL
        import psycopg2
        from psycopg2.extras import RealDictRow
        conn = psycopg2.connect(database_url)
        # Ajuste para PostgreSQL se comportar como SQLite Row
        conn.cursor_factory = RealDictRow
        return conn
    else:
        # Caso contrário, usa SQLite local
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    # Detectar se estamos no Postgres ou SQLite para ajustar a sintaxe
    is_postgres = os.environ.get('DATABASE_URL') is not None
    pk_type = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"

    c.execute(f'''CREATE TABLE IF NOT EXISTS users (
        id {pk_type},
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS categorias (
        id {pk_type},
        nome TEXT NOT NULL,
        cor TEXT DEFAULT '#22c55e',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS receitas (
        id {pk_type},
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        categoria_id INTEGER,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS contas (
        id {pk_type},
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        categoria_id INTEGER,
        pago INTEGER DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS cartoes (
        id {pk_type},
        nome TEXT NOT NULL,
        bandeira TEXT NOT NULL,
        limite REAL NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS compras_cartao (
        id {pk_type},
        cartao_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        parcelas INTEGER DEFAULT 1,
        parcela_atual INTEGER DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cartao_id) REFERENCES cartoes(id) ON DELETE CASCADE
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS metas (
        id {pk_type},
        titulo TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        valor_alvo REAL DEFAULT 0,
        valor_atual REAL DEFAULT 0,
        progresso INTEGER NOT NULL DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS investimentos (
        id {pk_type},
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL,
        valor_investido REAL NOT NULL,
        valor_atual REAL NOT NULL,
        rentabilidade REAL DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute(f'''CREATE TABLE IF NOT EXISTS planejamento (
        id {pk_type},
        categoria_id INTEGER,
        valor_planejado REAL NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    )''')

    # --- Seed data ---
    c.execute('SELECT COUNT(*) FROM users')
    if c.fetchone()[0] == 0:
        senha_hash = generate_password_hash('senha123')
        c.execute('INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)',
                  ('Usuário Demo', 'admin@financeiro.local', senha_hash))

    c.execute('SELECT COUNT(*) FROM categorias')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO categorias (nome, cor) VALUES (?, ?)', [
            ('Moradia', '#ef4444'),
            ('Alimentação', '#f97316'),
            ('Transporte', '#eab308'),
            ('Lazer', '#8b5cf6'),
            ('Saúde', '#06b6d4'),
            ('Educação', '#3b82f6'),
            ('Salário', '#22c55e'),
            ('Freelance', '#10b981'),
        ])

    c.execute('SELECT COUNT(*) FROM receitas')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO receitas (descricao, valor, categoria_id) VALUES (?, ?, ?)', [
            ('Salário', 7850.00, 7),
            ('Freelance', 1200.00, 8),
            ('Venda de objeto', 320.00, None),
        ])

    c.execute('SELECT COUNT(*) FROM contas')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO contas (descricao, valor, categoria_id, pago) VALUES (?, ?, ?, ?)', [
            ('Aluguel', 1200.00, 1, 1),
            ('Conta de Luz', 250.00, 1, 0),
            ('Internet', 120.00, 1, 1),
            ('Academia', 89.90, 5, 0),
            ('Supermercado', 850.00, 2, 1),
            ('Gasolina', 320.00, 3, 0),
            ('Cinema', 55.50, 4, 1),
            ('Farmácia', 180.00, 5, 0),
            ('Curso Online', 120.00, 6, 1),
        ])

    c.execute('SELECT COUNT(*) FROM cartoes')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO cartoes (nome, bandeira, limite) VALUES (?, ?, ?)', [
            ('Cartão Azul', 'Visa', 8000.00),
            ('Cartão Preto', 'Mastercard', 12000.00),
        ])

    c.execute('SELECT COUNT(*) FROM compras_cartao')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO compras_cartao (cartao_id, descricao, valor, parcelas, parcela_atual) VALUES (?, ?, ?, ?, ?)', [
            (1, 'Supermercado', 350.00, 1, 1),
            (1, 'Notebook', 4500.00, 10, 3),
            (2, 'Viagem', 2200.00, 12, 5),
            (2, 'Celular', 3000.00, 8, 2),
        ])

    c.execute('SELECT COUNT(*) FROM metas')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO metas (titulo, descricao, valor_alvo, valor_atual, progresso) VALUES (?, ?, ?, ?, ?)', [
            ('Reserva de Emergência', 'Guardar R$ 12.000', 12000, 5040, 42),
            ('Viagem Internacional', 'Economizar para viagem', 8000, 3120, 39),
            ('Entrada do Imóvel', 'Investimento para imóvel', 50000, 12000, 24),
        ])

    c.execute('SELECT COUNT(*) FROM investimentos')
    if c.fetchone()[0] == 0:
        c.executemany('INSERT INTO investimentos (titulo, tipo, valor_investido, valor_atual, rentabilidade) VALUES (?, ?, ?, ?, ?)', [
            ('Tesouro Selic', 'Renda Fixa', 5000.00, 5320.00, 6.4),
            ('CDB Banco X', 'Renda Fixa', 3000.00, 3180.00, 6.0),
            ('Fundo Imobiliário', 'FII', 2000.00, 2150.00, 7.5),
            ('Ações PETR4', 'Ações', 1500.00, 1380.00, -8.0),
        ])

    c.execute('SELECT COUNT(*) FROM planejamento')
    if c.fetchone()[0] == 0:
        now = datetime.now()
        c.executemany('INSERT INTO planejamento (categoria_id, valor_planejado, mes, ano) VALUES (?, ?, ?, ?)', [
            (1, 1500.00, now.month, now.year),
            (2, 1000.00, now.month, now.year),
            (3, 400.00, now.month, now.year),
            (4, 300.00, now.month, now.year),
            (5, 250.00, now.month, now.year),
            (6, 200.00, now.month, now.year),
        ])

    conn.commit()
    conn.close()


init_db()


def fetch_all(query, values=None):
    conn = get_db()
    data = conn.execute(query, values or ()).fetchall()
    conn.close()
    return [dict(row) for row in data]


def fetch_one(query, values=None):
    conn = get_db()
    item = conn.execute(query, values or ()).fetchone()
    conn.close()
    return dict(item) if item else None


def execute_query(query, values=None):
    conn = get_db()
    cursor = conn.execute(query, values or ())
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id


# ==================== AUTH ====================

@app.route('/login', methods=['POST'])
def login():
    dados = request.json or {}
    email = dados.get('email')
    senha = dados.get('password')
    if not email or not senha:
        return jsonify({'msg': 'Email e senha são obrigatórios'}), 400
    usuario = fetch_one('SELECT * FROM users WHERE email = ?', (email,))
    if not usuario or not check_password_hash(usuario['senha'], senha):
        return jsonify({'msg': 'Credenciais inválidas'}), 401
    access_token = create_access_token(identity=str(usuario['id']))
    return jsonify({
        'access_token': access_token,
        'user': {'id': usuario['id'], 'nome': usuario['nome'], 'email': usuario['email']},
    })


@app.route('/register', methods=['POST'])
def register():
    dados = request.json or {}
    nome = dados.get('nome')
    email = dados.get('email')
    senha = dados.get('password')

    if not nome or not email or not senha:
        return jsonify({'msg': 'Todos os campos são obrigatórios'}), 400

    try:
        senha_hash = generate_password_hash(senha)
        user_id = execute_query('INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)',
                                (nome, email, senha_hash))
        return jsonify({'msg': 'Usuário criado com sucesso', 'user_id': user_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({'msg': 'Este email já está cadastrado'}), 400
    except Exception as e:
        return jsonify({'msg': str(e)}), 500


# ==================== RESUMO ====================

@app.route('/resumo', methods=['GET'])
@jwt_required()
def resumo():
    receitas = fetch_one('SELECT COALESCE(SUM(valor), 0) AS total FROM receitas')['total']
    despesas = fetch_one('SELECT COALESCE(SUM(valor), 0) AS total FROM contas')['total']
    meta = fetch_one('SELECT COALESCE(AVG(progresso), 0) AS progresso FROM metas')['progresso']
    saldo = receitas - despesas
    return jsonify({
        'receitas': float(receitas),
        'despesas': float(despesas),
        'saldo': float(saldo),
        'meta': float(meta),
    })


@app.route('/resumo-mensal', methods=['GET'])
@jwt_required()
def resumo_mensal():
    receitas = fetch_one('SELECT COALESCE(SUM(valor), 0) AS total FROM receitas')['total']
    despesas = fetch_one('SELECT COALESCE(SUM(valor), 0) AS total FROM contas')['total']
    saldo = receitas - despesas
    meta_economia = fetch_one('SELECT COALESCE(AVG(progresso), 0) AS p FROM metas')['p']

    # Despesas por categoria
    despesas_cat = fetch_all('''
        SELECT c.nome, COALESCE(SUM(co.valor), 0) AS total
        FROM categorias c
        LEFT JOIN contas co ON co.categoria_id = c.id
        GROUP BY c.id
        HAVING total > 0
        ORDER BY total DESC
        LIMIT 5
    ''')
    total_desp = sum(d['total'] for d in despesas_cat) or 1
    categorias = [{'nome': d['nome'], 'percentual': round(d['total'] / total_desp * 100)} for d in despesas_cat]

    contas_pagar = fetch_all('SELECT * FROM contas WHERE pago = 0 ORDER BY valor DESC LIMIT 4')
    compras = fetch_all('''
        SELECT cc.descricao, cc.parcelas || 'x' AS parcelas, cc.valor,
               ca.nome AS cartao
        FROM compras_cartao cc
        JOIN cartoes ca ON ca.id = cc.cartao_id
        ORDER BY cc.id DESC LIMIT 4
    ''')
    metas = fetch_all('SELECT titulo, progresso FROM metas ORDER BY id LIMIT 3')

    return jsonify({
        'receitas': float(receitas),
        'despesas': float(despesas),
        'saldo': float(saldo),
        'meta_economia': float(meta_economia),
        'categorias': categorias,
        'contas_pagar': [dict(c) for c in contas_pagar],
        'compras_cartao': [dict(c) for c in compras],
        'metas': [dict(m) for m in metas],
    })


# ==================== RECEITAS ====================

@app.route('/receitas', methods=['GET'])
@jwt_required()
def listar_receitas():
    return jsonify(fetch_all('SELECT r.*, c.nome AS categoria_nome FROM receitas r LEFT JOIN categorias c ON c.id = r.categoria_id ORDER BY r.id DESC'))


@app.route('/receitas', methods=['POST'])
@jwt_required()
def adicionar_receita():
    d = request.json or {}
    execute_query('INSERT INTO receitas (descricao, valor, categoria_id) VALUES (?, ?, ?)',
                  (d.get('descricao'), d.get('valor'), d.get('categoria_id')))
    return jsonify({'mensagem': 'Receita adicionada'})


@app.route('/receitas/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_receita(id):
    execute_query('DELETE FROM receitas WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Receita removida'})


@app.route('/receitas/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_receita(id):
    d = request.json or {}
    execute_query('UPDATE receitas SET descricao = ?, valor = ?, categoria_id = ? WHERE id = ?',
                  (d.get('descricao'), d.get('valor'), d.get('categoria_id'), id))
    return jsonify({'mensagem': 'Receita atualizada'})


# ==================== CONTAS ====================

@app.route('/contas', methods=['GET'])
@jwt_required()
def listar_contas():
    return jsonify(fetch_all('SELECT co.*, c.nome AS categoria_nome FROM contas co LEFT JOIN categorias c ON c.id = co.categoria_id ORDER BY co.id DESC'))


@app.route('/contas', methods=['POST'])
@jwt_required()
def adicionar_conta():
    d = request.json or {}
    execute_query('INSERT INTO contas (descricao, valor, categoria_id) VALUES (?, ?, ?)',
                  (d.get('descricao'), d.get('valor'), d.get('categoria_id')))
    return jsonify({'mensagem': 'Conta adicionada'})


@app.route('/contas/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_conta(id):
    execute_query('DELETE FROM contas WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Conta removida'})


@app.route('/contas/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_conta(id):
    d = request.json or {}
    execute_query('UPDATE contas SET descricao = ?, valor = ?, categoria_id = ?, pago = ? WHERE id = ?',
                  (d.get('descricao'), d.get('valor'), d.get('categoria_id'), d.get('pago', 0), id))
    return jsonify({'mensagem': 'Conta atualizada'})


@app.route('/contas/<int:id>/pagar', methods=['PATCH'])
@jwt_required()
def pagar_conta(id):
    execute_query('UPDATE contas SET pago = 1 WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Conta marcada como paga'})


# ==================== CATEGORIAS ====================

@app.route('/categorias', methods=['GET'])
@jwt_required()
def listar_categorias():
    return jsonify(fetch_all('SELECT * FROM categorias ORDER BY nome'))


@app.route('/categorias', methods=['POST'])
@jwt_required()
def adicionar_categoria():
    d = request.json or {}
    execute_query('INSERT INTO categorias (nome, cor) VALUES (?, ?)',
                  (d.get('nome'), d.get('cor', '#22c55e')))
    return jsonify({'mensagem': 'Categoria adicionada'})


@app.route('/categorias/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_categoria(id):
    execute_query('DELETE FROM categorias WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Categoria removida'})


@app.route('/categorias/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_categoria(id):
    d = request.json or {}
    execute_query('UPDATE categorias SET nome = ?, cor = ? WHERE id = ?',
                  (d.get('nome'), d.get('cor'), id))
    return jsonify({'mensagem': 'Categoria atualizada'})


# ==================== CARTÕES ====================

@app.route('/cartoes', methods=['GET'])
@jwt_required()
def listar_cartoes():
    return jsonify(fetch_all('SELECT * FROM cartoes ORDER BY id DESC'))


@app.route('/cartoes', methods=['POST'])
@jwt_required()
def adicionar_cartao():
    d = request.json or {}
    execute_query('INSERT INTO cartoes (nome, bandeira, limite) VALUES (?, ?, ?)',
                  (d.get('nome'), d.get('bandeira'), d.get('limite')))
    return jsonify({'mensagem': 'Cartão cadastrado'})


@app.route('/cartoes/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_cartao(id):
    execute_query('DELETE FROM cartoes WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Cartão removido'})


# ==================== COMPRAS NO CARTÃO ====================

@app.route('/compras-cartao', methods=['GET'])
@jwt_required()
def listar_compras_cartao():
    return jsonify(fetch_all('''
        SELECT cc.*, ca.nome AS cartao_nome, ca.bandeira
        FROM compras_cartao cc
        JOIN cartoes ca ON ca.id = cc.cartao_id
        ORDER BY cc.id DESC
    '''))


@app.route('/compras-cartao', methods=['POST'])
@jwt_required()
def adicionar_compra_cartao():
    d = request.json or {}
    execute_query(
        'INSERT INTO compras_cartao (cartao_id, descricao, valor, parcelas, parcela_atual) VALUES (?, ?, ?, ?, ?)',
        (d.get('cartao_id'), d.get('descricao'), d.get('valor'), d.get('parcelas', 1), d.get('parcela_atual', 1)))
    return jsonify({'mensagem': 'Compra adicionada'})


@app.route('/compras-cartao/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_compra_cartao(id):
    execute_query('DELETE FROM compras_cartao WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Compra removida'})


# ==================== METAS ====================

@app.route('/metas', methods=['GET'])
@jwt_required()
def listar_metas():
    return jsonify(fetch_all('SELECT * FROM metas ORDER BY id DESC'))


@app.route('/metas', methods=['POST'])
@jwt_required()
def adicionar_meta():
    d = request.json or {}
    progresso = 0
    if d.get('valor_alvo') and d.get('valor_atual'):
        progresso = int(float(d['valor_atual']) / float(d['valor_alvo']) * 100)
    execute_query(
        'INSERT INTO metas (titulo, descricao, valor_alvo, valor_atual, progresso) VALUES (?, ?, ?, ?, ?)',
        (d.get('titulo'), d.get('descricao', ''), d.get('valor_alvo', 0), d.get('valor_atual', 0), progresso))
    return jsonify({'mensagem': 'Meta adicionada'})


@app.route('/metas/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_meta(id):
    execute_query('DELETE FROM metas WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Meta removida'})


@app.route('/metas/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_meta(id):
    d = request.json or {}
    progresso = 0
    if d.get('valor_alvo') and d.get('valor_atual'):
        progresso = int(float(d['valor_atual']) / float(d['valor_alvo']) * 100)
    execute_query(
        'UPDATE metas SET titulo = ?, descricao = ?, valor_alvo = ?, valor_atual = ?, progresso = ? WHERE id = ?',
        (d.get('titulo'), d.get('descricao', ''), d.get('valor_alvo', 0), d.get('valor_atual', 0), progresso, id))
    return jsonify({'mensagem': 'Meta atualizada'})


# ==================== INVESTIMENTOS ====================

@app.route('/investimentos', methods=['GET'])
@jwt_required()
def listar_investimentos():
    return jsonify(fetch_all('SELECT * FROM investimentos ORDER BY id DESC'))


@app.route('/investimentos', methods=['POST'])
@jwt_required()
def adicionar_investimento():
    d = request.json or {}
    vi = float(d.get('valor_investido', 0))
    va = float(d.get('valor_atual', 0))
    rent = round((va - vi) / vi * 100, 1) if vi > 0 else 0
    execute_query(
        'INSERT INTO investimentos (titulo, tipo, valor_investido, valor_atual, rentabilidade) VALUES (?, ?, ?, ?, ?)',
        (d.get('titulo'), d.get('tipo'), vi, va, rent))
    return jsonify({'mensagem': 'Investimento adicionado'})


@app.route('/investimentos/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_investimento(id):
    execute_query('DELETE FROM investimentos WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Investimento removido'})


# ==================== PLANEJAMENTO ====================

@app.route('/planejamento', methods=['GET'])
@jwt_required()
def listar_planejamento():
    return jsonify(fetch_all('''
        SELECT p.*, c.nome AS categoria_nome, c.cor,
               COALESCE((SELECT SUM(co.valor) FROM contas co WHERE co.categoria_id = p.categoria_id), 0) AS valor_gasto
        FROM planejamento p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        ORDER BY p.id
    '''))


@app.route('/planejamento', methods=['POST'])
@jwt_required()
def adicionar_planejamento():
    d = request.json or {}
    execute_query(
        'INSERT INTO planejamento (categoria_id, valor_planejado, mes, ano) VALUES (?, ?, ?, ?)',
        (d.get('categoria_id'), d.get('valor_planejado'), d.get('mes'), d.get('ano')))
    return jsonify({'mensagem': 'Planejamento adicionado'})


@app.route('/planejamento/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_planejamento(id):
    execute_query('DELETE FROM planejamento WHERE id = ?', (id,))
    return jsonify({'mensagem': 'Planejamento removido'})


# ==================== RELATÓRIOS ====================

@app.route('/relatorios', methods=['GET'])
@jwt_required()
def relatorios():
    receitas = fetch_all('SELECT descricao, valor, criado_em FROM receitas ORDER BY id DESC')
    despesas = fetch_all('SELECT descricao, valor, criado_em, pago FROM contas ORDER BY id DESC')
    total_receitas = fetch_one('SELECT COALESCE(SUM(valor), 0) AS t FROM receitas')['t']
    total_despesas = fetch_one('SELECT COALESCE(SUM(valor), 0) AS t FROM contas')['t']
    total_investido = fetch_one('SELECT COALESCE(SUM(valor_investido), 0) AS t FROM investimentos')['t']
    total_atual_inv = fetch_one('SELECT COALESCE(SUM(valor_atual), 0) AS t FROM investimentos')['t']

    por_categoria = fetch_all('''
        SELECT c.nome, c.cor, COALESCE(SUM(co.valor), 0) AS total
        FROM categorias c LEFT JOIN contas co ON co.categoria_id = c.id
        GROUP BY c.id HAVING total > 0 ORDER BY total DESC
    ''')

    return jsonify({
        'receitas': receitas,
        'despesas': despesas,
        'total_receitas': float(total_receitas),
        'total_despesas': float(total_despesas),
        'saldo': float(total_receitas - total_despesas),
        'total_investido': float(total_investido),
        'total_atual_investimentos': float(total_atual_inv),
        'por_categoria': por_categoria,
    })


# ==================== CONFIGURAÇÕES / PERFIL ====================

@app.route('/perfil', methods=['GET'])
@jwt_required()
def get_perfil():
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    user = fetch_one('SELECT id, nome, email, criado_em FROM users WHERE id = ?', (user_id,))
    return jsonify(user)


@app.route('/perfil', methods=['PUT'])
@jwt_required()
def atualizar_perfil():
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    d = request.json or {}
    execute_query('UPDATE users SET nome = ?, email = ? WHERE id = ?',
                  (d.get('nome'), d.get('email'), user_id))
    return jsonify({'mensagem': 'Perfil atualizado'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
