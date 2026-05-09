CREATE DATABASE IF NOT EXISTS dashboard_financeiro;
USE dashboard_financeiro;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receitas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cartoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  bandeira VARCHAR(100) NOT NULL,
  limite DECIMAL(10,2) NOT NULL,
  parcelas VARCHAR(50) NOT NULL,
  descricao VARCHAR(255) DEFAULT '',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descricao VARCHAR(255) DEFAULT '',
  progresso INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (nome, email, senha) VALUES
  ('Usuário Demo', 'admin@financeiro.local', 'scrypt:32768:8:1$yfT9qT53Oy5kPqor$3a1328a38244e05e5b54e1c0b532f973f0c5feaf114d09812bfdf210b1592d522ae7da941b74ede981a70d4f232ba8c5a57dc850f0d114034528196af5b8fbe9');

INSERT INTO receitas (descricao, valor) VALUES
  ('Salário', 7850.00),
  ('Freelance', 1200.00),
  ('Venda de objeto', 320.00);

INSERT INTO contas (descricao, valor) VALUES
  ('Aluguel', 1200.00),
  ('Luz', 250.00),
  ('Internet', 120.00),
  ('Academia', 89.90);

INSERT INTO cartoes (nome, bandeira, limite, parcelas, descricao) VALUES
  ('Cartão Azul', 'Visa', 4500.00, '10x', 'Notebook parcelado'),
  ('Cartão Preto', 'Mastercard', 3000.00, '6x', 'Compras de supermercado');

INSERT INTO metas (titulo, descricao, progresso) VALUES
  ('Reserva de Emergência', 'Guardar R$ 5.000', 42),
  ('Viagem Internacional', 'Economizar para viagem', 39),
  ('Entrada do imóvel', 'Investimento para imóvel', 24);
