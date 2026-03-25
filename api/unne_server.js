// ============================================================
//  UNNE Atelier — API Backend (Node.js + Express + mysql2)
//  Ajustado para Render.com + TiDB Cloud
// ============================================================

const express = require('express');
const mysql   = require('mysql2/promise');
const cors     = require('cors');
const path     = require('path');

const app  = express();
// O Render define a porta automaticamente, se não houver, usa a 3000
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO CRÍTICA: Serve os arquivos HTML/CSS/JS que estão na raiz (um nível acima da pasta api)
app.use(express.static(path.join(__dirname, '../')));

// ------------------------------------------------------------
// Conexão com o banco (Usando Variáveis de Ambiente do Render)
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
    rejectUnauthorized: false // Obrigatório para o TiDB Cloud
  }
});

// ------------------------------------------------------------
// ROTA RAIZ: Força o envio do index.html quando acessar o link principal
// ------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../', 'index.html'));
});

// ------------------------------------------------------------
// GET /api/produtos — lista todos os produtos ativos
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

// GET /api/outlet — produtos marcados como outlet
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

// GET /api/cupom/:codigo — valida um cupom
app.get('/api/cupom/:codigo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT codigo, desconto FROM cupons
       WHERE codigo = ? AND ativo = 1
         AND (expira_em IS NULL OR expira_em >= CURDATE())`,
      [req.params.codigo.toUpperCase()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Cupom inválido ou expirado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao validar cupom.' });
  }
});

// GET /api/unidades — lista as lojas ativas
app.get('/api/unidades', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cidade, estado, endereco, telefone
       FROM unidades WHERE ativo = 1 ORDER BY cidade`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar unidades.' });
  }
});

// POST /api/contato — salva mensagem de contato
app.post('/api/contato', async (req, res) => {
  try {
    const { nome, assunto, mensagem } = req.body;
    if (!nome || nome.trim().length < 3) return res.status(400).json({ erro: 'Nome curto.' });
    await pool.execute(
      `INSERT INTO contatos (nome, assunto, mensagem) VALUES (?, ?, ?)`,
      [nome.trim(), assunto, mensagem.trim()]
    );
    res.json({ sucesso: 'Mensagem enviada!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar contato.' });
  }
});

// POST /api/clientes — cadastro de novo cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, email, telefone, senha, endereco } = req.body;
    const [existe] = await pool.query('SELECT id FROM clientes WHERE email = ?', [email]);
    if (existe.length > 0) return res.status(409).json({ erro: 'E-mail já cadastrado.' });

    const [result] = await pool.execute(
      `INSERT INTO clientes (nome, email, senha_hash, telefone) VALUES (?, ?, ?, ?)`,
      [nome.trim(), email.trim(), senha, telefone || null]
    );
    const clienteId = result.insertId;

    if (endereco && endereco.rua) {
      await pool.execute(
        `INSERT INTO enderecos (cliente_id, rua, numero, complemento, bairro, cidade, estado, cep, principal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [clienteId, endereco.rua, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, endereco.estado, endereco.cep]
      );
    }
    res.status(201).json({ sucesso: 'Conta criada!', clienteId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const [rows] = await pool.query(
      'SELECT id, nome, email, telefone FROM clientes WHERE email = ? AND senha_hash = ?',
      [email.trim(), senha]
    );
    if (!rows.length) return res.status(401).json({ erro: 'Incorretos.' });
    res.json({ sucesso: true, cliente: rows[0] });
  } catch (err) { res.status(500).json({ erro: 'Erro no login.' }); }
});

// Rota de fallback para qualquer outra coisa (SPA mode)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'index.html'));
});

// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Servidor UNNE Ativo na porta ${PORT}`);
});
