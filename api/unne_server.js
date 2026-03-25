// ============================================================
//  UNNE Atelier — API Backend (Node.js + Express + mysql2)
//  Versão Estável para Render.com + TiDB Cloud
// ============================================================

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos (HTML, CSS, JS) da pasta raiz
app.use(express.static(path.join(__dirname, '../')));

// ------------------------------------------------------------
// Conexão com o banco (TiDB Cloud)
// ------------------------------------------------------------
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  port:             process.env.DB_PORT || 4000,
  waitForConnections: true,
  connectionLimit:    10,
  ssl: {
    rejectUnauthorized: false
  }
});

// ------------------------------------------------------------
// ROTA PRINCIPAL: Envia o index.html ao acessar a raiz /
// ------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../', 'index.html'));
});

// ------------------------------------------------------------
// API: Produtos
// ------------------------------------------------------------
app.get('/api/produtos', async (req, res) => {
  try {
    const { destaque } = req.query;
    let sql = `
      SELECT p.id, p.nome, p.preco, p.imagem_url, p.estoque,
             c.nome AS categoria
      FROM produtos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.ativo = 1
    `;
    const params = [];
    if (destaque === '1') {
      sql += ' AND p.destaque = 1';
    }
    sql += ' ORDER BY p.nome';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// API: Outlet
app.get('/api/outlet', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.nome, p.preco, p.imagem_url, p.estoque,
              c.nome AS categoria
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE p.ativo = 1 AND p.outlet = 1
       ORDER BY p.nome`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar produtos outlet.' });
  }
});

// API: Cupons
app.get('/api/cupom/:codigo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT codigo, desconto FROM cupons
       WHERE codigo = ? AND ativo = 1
         AND (expira_em IS NULL OR expira_em >= CURDATE())`,
      [req.params.codigo.toUpperCase()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Cupom inválido.' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao validar cupom.' });
  }
});

// API: Unidades
app.get('/api/unidades', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cidade, estado, endereco, telefone
       FROM unidades WHERE ativo = 1 ORDER BY cidade`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar unidades.' });
  }
});

// API: Contato (POST)
app.post('/api/contato', async (req, res) => {
  try {
    const { nome, assunto, mensagem } = req.body;
    await pool.execute(
      `INSERT INTO contatos (nome, assunto, mensagem) VALUES (?, ?, ?)`,
      [nome.trim(), assunto, mensagem.trim()]
    );
    res.json({ sucesso: 'Mensagem enviada!' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar contato.' });
  }
});

// API: Clientes (POST)
app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, email, telefone, senha, endereco } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO clientes (nome, email, senha_hash, telefone) VALUES (?, ?, ?, ?)`,
      [nome.trim(), email.trim(), senha, telefone || null]
    );
    res.status(201).json({ sucesso: 'Conta criada!', clienteId: result.insertId });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

// API: Login (POST)
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const [rows] = await pool.query(
      'SELECT id, nome, email, telefone FROM clientes WHERE email = ? AND senha_hash = ?',
      [email.trim(), senha]
    );
    if (!rows.length) return res.status(401).json({ erro: 'Credenciais inválidas.' });
    res.json({ sucesso: true, cliente: rows[0] });
  } catch (err) { res.status(500).json({ erro: 'Erro no login.' }); }
});

// ------------------------------------------------------------
// Iniciar Servidor
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ API UNNE Ativa na porta ${PORT}`);
});
