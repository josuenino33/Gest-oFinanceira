# Dashboard Financeiro Full Stack

Este projeto foi reorganizado para uma aplicação full stack com:

- Frontend React + TailwindCSS + React Router DOM + Axios + Recharts
- Backend Python Flask + SQLite (não precisa instalar MySQL)

## Estrutura do projeto

```plaintext
finance-dashboard/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── database.sql
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── routes/
    │
    ├── index.html
    ├── package.json
    ├── package-lock.json
    └── vite.config.js
```

## Como rodar

### Backend

1. Acesse `backend`
2. Instale as dependências:

```bash
pip install -r backend/requirements.txt
```

3. Rode o backend:

```bash
python backend/app.py
```

### Frontend

1. Acesse `frontend`
2. Instale as dependências:

```bash
npm install
```

3. Rode o frontend:

```bash
npm run dev
```

### Endpoints

- `POST /login`
- `GET /resumo`
- `GET /receitas`
- `POST /receitas`
- `GET /contas`
- `POST /contas`
- `GET /cartoes`
- `POST /cartoes`
- `GET /metas`
- `POST /metas`

## Observações

- O frontend consome o backend em `http://localhost:5000`
- Usuário demo para login: `admin@financeiro.local` / `senha123`
- O banco SQLite é criado automaticamente na primeira execução
