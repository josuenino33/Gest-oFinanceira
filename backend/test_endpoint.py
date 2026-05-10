import requests

# Login as Josue
r = requests.post('http://localhost:5000/login', json={'email': 'josuenino33@gmail.com', 'password': '123456'})
data = r.json()
token = data['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Test resumo-mensal
print("=== Testing /resumo-mensal ===")
r2 = requests.get('http://localhost:5000/resumo-mensal?mes=5&ano=2026&mes_fim=5&ano_fim=2026', headers=headers)
print(f"Status: {r2.status_code}")
if r2.status_code == 200:
    d = r2.json()
    print(f"Receitas: {d['receitas']}")
    print(f"Despesas: {d['despesas']}")
    print(f"Saldo: {d['saldo']}")
    print(f"Meta economia: {d['meta_economia']}")
    print(f"Categorias: {d['categorias']}")
    print(f"Contas pagar: {d['contas_pagar']}")
    print(f"Metas: {d['metas']}")
    print(f"Historico: {d['historico']}")
else:
    print(f"ERROR: {r2.text}")

# Test resumo
print("\n=== Testing /resumo ===")
r3 = requests.get('http://localhost:5000/resumo', headers=headers)
print(f"Status: {r3.status_code}")
print(f"Response: {r3.json()}")
