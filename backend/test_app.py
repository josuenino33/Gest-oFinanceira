import os
import sys
import json
import tempfile
import pytest

# Garante modo SQLite antes de importar app
os.environ.pop('DATABASE_URL', None)

sys.path.insert(0, os.path.dirname(__file__))
import app as flask_app

HEADERS = {'Content-Type': 'application/json'}

USER = {'nome': 'Teste', 'username': 'testuser', 'email': 'teste@test.com',
        'password': 'Senha123', 'codigo_seguranca': 'segredo'}

@pytest.fixture(scope='module')
def client():
    flask_app.app.config['TESTING'] = True
    flask_app.app.config['JWT_SECRET_KEY'] = 'test-secret-key-32-bytes-long!!x'
    flask_app.limiter.enabled = False  # desativa rate limit nos testes
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    flask_app.DB_PATH = path
    flask_app.IS_POSTGRES = False
    flask_app._db_init_done = False
    with flask_app.app.test_client() as c:
        with flask_app.app.app_context():
            flask_app.init_db()
            flask_app._db_init_done = True
        yield c
    os.unlink(path)

@pytest.fixture(scope='module')
def tokens(client):
    """Registra e faz login UMA vez — tokens reutilizados por todos os testes CRUD."""
    client.post('/register', data=json.dumps(USER), headers=HEADERS)
    r = client.post('/login', data=json.dumps({
        'username': USER['username'], 'password': USER['password']
    }), headers=HEADERS)
    assert r.status_code == 200
    data = r.get_json()
    return data['access_token'], data['refresh_token']

def auth(access):
    return {**HEADERS, 'Authorization': f'Bearer {access}'}

def fresh_login(client):
    """Login auxiliar — retorna tokens frescos sem depender do fixture compartilhado."""
    client.post('/register', data=json.dumps({**USER, 'username': 'logoutuser',
                                               'email': 'logout@test.com'}), headers=HEADERS)
    r = client.post('/login', data=json.dumps({
        'username': 'logoutuser', 'password': USER['password']
    }), headers=HEADERS)
    data = r.get_json()
    return data['access_token'], data['refresh_token']

# ==================== AUTH ====================

def test_register(client):
    u = {**USER, 'username': 'newuser99', 'email': 'new99@test.com'}
    r = client.post('/register', data=json.dumps(u), headers=HEADERS)
    assert r.status_code == 201

def test_register_duplicate_username(client):
    client.post('/register', data=json.dumps(USER), headers=HEADERS)
    u = {**USER, 'email': 'outro@test.com'}
    r = client.post('/register', data=json.dumps(u), headers=HEADERS)
    assert r.status_code == 400
    assert 'Username' in r.get_json().get('msg', '')

def test_register_weak_password(client):
    u = {**USER, 'username': 'weakpw', 'email': 'weak@test.com', 'password': 'abc'}
    r = client.post('/register', data=json.dumps(u), headers=HEADERS)
    assert r.status_code == 400

def test_register_missing_fields(client):
    r = client.post('/register', data=json.dumps({'nome': 'x'}), headers=HEADERS)
    assert r.status_code == 400

def test_login_success(client, tokens):
    access, _ = tokens
    assert access

def test_login_wrong_password(client):
    r = client.post('/login', data=json.dumps({
        'username': USER['username'], 'password': 'wrongpass'
    }), headers=HEADERS)
    assert r.status_code == 401

def test_login_unknown_user(client):
    r = client.post('/login', data=json.dumps({
        'username': 'naoexiste', 'password': 'Qualquer1'
    }), headers=HEADERS)
    assert r.status_code == 401

def test_login_sem_content_type(client):
    """Sem Content-Type não deve retornar 415."""
    r = client.post('/login', data='')
    assert r.status_code != 415

def test_no_json_body_returns_400_not_415(client):
    """request.get_json(silent=True) não deve lançar 415."""
    r = client.post('/register')
    assert r.status_code == 400

def test_protected_route_without_token(client):
    r = client.get('/receitas')
    assert r.status_code == 401

def test_refresh_token(client, tokens):
    _, refresh = tokens
    r = client.post('/refresh', headers={**HEADERS, 'Authorization': f'Bearer {refresh}'})
    assert r.status_code == 200
    assert 'access_token' in r.get_json()

def test_logout(client):
    """Usa tokens próprios para não revogar o fixture compartilhado."""
    access, _ = fresh_login(client)
    r = client.post('/logout',
                    data=json.dumps({'refresh_jti': ''}),
                    headers=auth(access))
    assert r.status_code == 200

# ==================== SEGURANÇA ====================

def test_security_headers(client, tokens):
    access, _ = tokens
    r = client.get('/receitas', headers={'Authorization': f'Bearer {access}'})
    assert r.headers.get('X-Content-Type-Options') == 'nosniff'
    assert r.headers.get('X-Frame-Options') == 'DENY'

# ==================== RECEITAS ====================

def test_criar_receita(client, tokens):
    access, _ = tokens
    r = client.post('/receitas',
                    data=json.dumps({'descricao': 'Salário', 'valor': 3000}),
                    headers=auth(access))
    assert r.status_code == 200

def test_listar_receitas(client, tokens):
    access, _ = tokens
    r = client.get('/receitas', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200
    assert isinstance(r.get_json(), list)

def test_editar_receita(client, tokens):
    access, _ = tokens
    client.post('/receitas', data=json.dumps({'descricao': 'Freelance', 'valor': 500}),
                headers=auth(access))
    receitas = client.get('/receitas', headers={'Authorization': f'Bearer {access}'}).get_json()
    assert isinstance(receitas, list) and len(receitas) > 0
    rid = receitas[0]['id']
    r = client.put(f'/receitas/{rid}',
                   data=json.dumps({'descricao': 'Freelance Edit', 'valor': 600, 'categoria_id': None}),
                   headers=auth(access))
    assert r.status_code == 200

def test_deletar_receita(client, tokens):
    access, _ = tokens
    client.post('/receitas', data=json.dumps({'descricao': 'Para deletar', 'valor': 1}),
                headers=auth(access))
    receitas = client.get('/receitas', headers={'Authorization': f'Bearer {access}'}).get_json()
    rid = receitas[0]['id']
    r = client.delete(f'/receitas/{rid}', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200

# ==================== CONTAS ====================

def test_criar_conta(client, tokens):
    access, _ = tokens
    r = client.post('/contas',
                    data=json.dumps({'descricao': 'Aluguel', 'valor': 1200, 'pago': 0}),
                    headers=auth(access))
    assert r.status_code == 200

def test_listar_contas(client, tokens):
    access, _ = tokens
    r = client.get('/contas', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200
    assert isinstance(r.get_json(), list)

def test_pagar_conta(client, tokens):
    access, _ = tokens
    client.post('/contas', data=json.dumps({'descricao': 'Luz', 'valor': 150}),
                headers=auth(access))
    contas = client.get('/contas', headers={'Authorization': f'Bearer {access}'}).get_json()
    assert isinstance(contas, list) and len(contas) > 0
    cid = contas[0]['id']
    r = client.patch(f'/contas/{cid}', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200

def test_editar_conta(client, tokens):
    access, _ = tokens
    contas = client.get('/contas', headers={'Authorization': f'Bearer {access}'}).get_json()
    assert isinstance(contas, list) and len(contas) > 0
    cid = contas[0]['id']
    r = client.put(f'/contas/{cid}',
                   data=json.dumps({'descricao': 'Luz Edit', 'valor': 200,
                                    'categoria_id': None, 'pago': 0}),
                   headers=auth(access))
    assert r.status_code == 200

# ==================== CATEGORIAS ====================

def test_listar_categorias(client, tokens):
    access, _ = tokens
    r = client.get('/categorias', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200
    assert isinstance(r.get_json(), list)

def test_criar_categoria(client, tokens):
    access, _ = tokens
    r = client.post('/categorias',
                    data=json.dumps({'nome': 'Pets', 'cor': '#ff0000'}),
                    headers=auth(access))
    assert r.status_code == 200

def test_editar_categoria(client, tokens):
    access, _ = tokens
    client.post('/categorias', data=json.dumps({'nome': 'TempCat', 'cor': '#aaa'}),
                headers=auth(access))
    cats = client.get('/categorias', headers={'Authorization': f'Bearer {access}'}).get_json()
    assert isinstance(cats, list)
    user_cats = [c for c in cats if c.get('user_id')]
    assert len(user_cats) > 0
    cid = user_cats[0]['id']
    r = client.put(f'/categorias/{cid}',
                   data=json.dumps({'nome': 'TempCat Edit', 'cor': '#bbb'}),
                   headers=auth(access))
    assert r.status_code == 200

# ==================== METAS ====================

def test_criar_meta(client, tokens):
    access, _ = tokens
    r = client.post('/metas',
                    data=json.dumps({'titulo': 'Viagem', 'valor_alvo': 5000, 'valor_atual': 0}),
                    headers=auth(access))
    assert r.status_code == 200

def test_listar_metas(client, tokens):
    access, _ = tokens
    r = client.get('/metas', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200
    assert isinstance(r.get_json(), list)

# ==================== RESUMO ====================

def test_resumo_mensal(client, tokens):
    access, _ = tokens
    r = client.get('/resumo-mensal', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200

def test_notificacoes(client, tokens):
    access, _ = tokens
    r = client.get('/notificacoes', headers={'Authorization': f'Bearer {access}'})
    assert r.status_code == 200
