-- ============================================================
--  UNNE Atelier Couro & Estilo — Banco de Dados MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS unne_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unne_db;

-- ------------------------------------------------------------
-- CATEGORIAS
-- ------------------------------------------------------------
CREATE TABLE categorias (
  id        INT          NOT NULL AUTO_INCREMENT,
  nome      VARCHAR(100) NOT NULL,
  slug      VARCHAR(120) NOT NULL,
  ativo     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cat_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PRODUTOS
-- ------------------------------------------------------------
CREATE TABLE produtos (
  id           INT             NOT NULL AUTO_INCREMENT,
  categoria_id INT             NOT NULL,
  nome         VARCHAR(255)    NOT NULL,
  descricao    TEXT            DEFAULT NULL,
  preco        DECIMAL(10,2)   NOT NULL,
  imagem_url   VARCHAR(500)    DEFAULT NULL,
  estoque      INT             NOT NULL DEFAULT 0,
  destaque     TINYINT(1)      NOT NULL DEFAULT 0,
  ativo        TINYINT(1)      NOT NULL DEFAULT 1,
  criado_em    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_prod_cat FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CUPONS
-- ------------------------------------------------------------
CREATE TABLE cupons (
  id          INT            NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(50)    NOT NULL,
  desconto    DECIMAL(5,2)   NOT NULL COMMENT 'Percentual de desconto',
  ativo       TINYINT(1)     NOT NULL DEFAULT 1,
  expira_em   DATE           DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cupom_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- MENSAGENS DE CONTATO
-- ------------------------------------------------------------
CREATE TABLE contatos (
  id         INT          NOT NULL AUTO_INCREMENT,
  nome       VARCHAR(150) NOT NULL,
  assunto    VARCHAR(50)  NOT NULL,
  mensagem   TEXT         NOT NULL,
  criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- UNIDADES / LOJAS
-- ------------------------------------------------------------
CREATE TABLE unidades (
  id        INT          NOT NULL AUTO_INCREMENT,
  cidade    VARCHAR(100) NOT NULL,
  estado    CHAR(2)      NOT NULL,
  endereco  VARCHAR(255) DEFAULT NULL,
  telefone  VARCHAR(20)  DEFAULT NULL,
  ativo     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  DADOS INICIAIS
-- ============================================================
INSERT INTO categorias (nome, slug) VALUES
  ('Bolsas',    'bolsas'),
  ('Mochilas',  'mochilas'),
  ('Carteiras', 'carteiras'),
  ('Malas',     'malas');

INSERT INTO cupons (codigo, desconto, expira_em) VALUES
  ('COURO2026', 10.00, '2026-12-31');

INSERT INTO unidades (cidade, estado, endereco, telefone) VALUES
  ('Picada Café',     'RS', 'Rua Principal, 100',      '(54) 99999-0001'),
  ('Nova Petrópolis', 'RS', 'Av. XV de Novembro, 250', '(54) 99999-0002');

INSERT INTO produtos (categoria_id, nome, preco, imagem_url, destaque, estoque) VALUES
  (1, 'Tote Classic Marrom',    450.00, 'images/colecao1.jpg',  0, 15),
  (1, 'Executiva Black',        520.00, 'images/colecao2.jpg',  0, 10),
  (2, 'Mochila Urban',          580.00, 'images/colecao3.jpg',  0, 8),
  (1, 'Bolsa de Ombro Mel',     390.00, 'images/colecao4.jpg',  0, 12),
  (1, 'Clutch Noite',           290.00, 'images/colecao5.jpg',  0, 20),
  (1, 'Pasta Documentos',       410.00, 'images/colecao6.jpg',  0, 6),
  (1, 'Bolsa Vintage',          480.00, 'images/colecao7.jpg',  0, 9),
  (4, 'Mala de Viagem',         890.00, 'images/colecao8.jpg',  0, 4),
  (1, 'Mini Bag Red',           310.00, 'images/colecao9.jpg',  0, 18),
  (1, 'Bolsa Bucket',           375.00, 'images/colecao10.jpg', 0, 11),
  (1, 'Crossbody Caramelo',     340.00, 'images/colecao11.jpg', 0, 14),
  (3, 'Carteira Slim',          150.00, 'images/colecao12.jpg', 0, 30),
  (1, 'Bolsa Estruturada',      560.00, 'images/colecao13.jpg', 0, 7),
  (1, 'Hobo Bag Soft',          420.00, 'images/colecao14.jpg', 0, 9),
  (1, 'Satchel Premium',        610.00, 'images/colecao15.jpg', 0, 5),
  (1, 'Bolsa Casual',           330.00, 'images/colecao16.jpg', 0, 16),
  (1, 'Doctor Bag',             595.00, 'images/colecao17.jpg', 0, 6),
  (1, 'Bolsa Festa',            445.00, 'images/colecao18.jpg', 0, 10),
  (1, 'Street Bag',             280.00, 'images/colecao19.jpg', 0, 22),
  (1, 'Maxi Tote Luxo',         720.00, 'images/colecao20.jpg', 0, 3),
  -- Destaques da home
  (1, 'Bolsa Executiva',        499.00, 'images/bolsalaranja.jpg', 1, 10),
  (2, 'Mochila Vintage',        550.00, 'images/bolsapreta.jpg',   1, 8),
  (3, 'Carteira Premium',       180.00, 'images/bolsaazul.jpg',    1, 25),
  (1, 'Bolsa Tote',             450.00, 'images/bolsarosa.jpg',    1, 12);
