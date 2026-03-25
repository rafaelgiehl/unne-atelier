// ============================================================
//  UNNE Atelier — API Backend (Node.js + Express + mysql2)
//  Instalação: npm install express mysql2 cors
//  Execução:   node server.js
// ============================================================

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('../')); // serve os arquivos HTML/CSS/JS

// ------------------------------------------------------------
// Conexão com o banco
// ------------------------------------------------------------
const pool = mysql.createPool({
  host:             'localhost',
  user:             'root',
  password:         '123456',   // ← altere aqui
  database:         'unne_db',
  waitForConnections: true,
  connectionLimit:    10,
});

// ------------------------------------------------------------
// GET /api/produtos — lista todos os produtos ativos
// Aceita ?destaque=1 para filtrar só os destaques da home
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
// ------------------------------------------------------------
// GET /api/cupom/:codigo — valida um cupom
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// GET /api/unidades — lista as lojas ativas
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// POST /api/contato — salva mensagem de contato
// ------------------------------------------------------------
app.post('/api/contato', async (req, res) => {
  try {
    const { nome, assunto, mensagem } = req.body;

    if (!nome || nome.trim().length < 3) {
      return res.status(400).json({ erro: 'Nome deve ter pelo menos 3 caracteres.' });
    }
    if (!assunto || !mensagem || mensagem.trim().length === 0) {
      return res.status(400).json({ erro: 'Assunto e mensagem são obrigatórios.' });
    }

    await pool.execute(
      `INSERT INTO contatos (nome, assunto, mensagem) VALUES (?, ?, ?)`,
      [nome.trim(), assunto, mensagem.trim()]
    );

    res.json({ sucesso: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar mensagem.' });
  }
});

// ------------------------------------------------------------
// POST /api/clientes — cadastro de novo cliente
// ------------------------------------------------------------
app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, email, telefone, senha, endereco } = req.body;

    if (!nome || nome.trim().length < 3)
      return res.status(400).json({ erro: 'Nome inválido.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ erro: 'E-mail inválido.' });
    if (!senha || senha.length < 8)
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 8 caracteres.' });

    // Verifica e-mail duplicado
    const [existe] = await pool.query(
      'SELECT id FROM clientes WHERE email = ?', [email]
    );
    if (existe.length > 0)
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });

    // Insere cliente (senha em texto — em produção use bcrypt)
    const [result] = await pool.execute(
      `INSERT INTO clientes (nome, email, senha_hash, telefone)
       VALUES (?, ?, ?, ?)`,
      [nome.trim(), email.trim(), senha, telefone || null]
    );
    const clienteId = result.insertId;

    // Insere endereço se fornecido
    if (endereco && endereco.rua) {
      await pool.execute(
        `INSERT INTO enderecos (cliente_id, rua, numero, complemento, bairro, cidade, estado, cep, principal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          clienteId,
          endereco.rua    || '',
          endereco.numero || '',
          endereco.complemento || null,
          endereco.bairro || '',
          endereco.cidade || '',
          endereco.estado || '',
          endereco.cep    || '',
        ]
      );
    }

    res.status(201).json({ sucesso: 'Conta criada com sucesso!', clienteId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

// ============================================================
//  LOGIN E CONTA DO CLIENTE
// ============================================================

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ erro: 'E-mail e senha obrigatórios.' });
    const [rows] = await pool.query(
      'SELECT id, nome, email, telefone FROM clientes WHERE email = ? AND senha_hash = ?',
      [email.trim(), senha]
    );
    if (!rows.length)
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    res.json({ sucesso: true, cliente: rows[0] });
  } catch (err) { res.status(500).json({ erro: 'Erro ao fazer login.' }); }
});

// GET /api/cliente/:id/pedidos
app.get('/api/cliente/:id/pedidos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, status, subtotal, frete, total, criado_em
       FROM pedidos WHERE cliente_id = ? ORDER BY criado_em DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar pedidos.' }); }
});

// GET /api/cliente/:id/endereco
app.get('/api/cliente/:id/endereco', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT rua, numero, complemento, bairro, cidade, estado, cep
       FROM enderecos WHERE cliente_id = ? AND principal = 1 LIMIT 1`,
      [req.params.id]
    );
    res.json(rows[0] || {});
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar endereço.' }); }
});

// PUT /api/cliente/:id
app.put('/api/cliente/:id', async (req, res) => {
  try {
    const { nome, telefone } = req.body;
    if (!nome || nome.trim().length < 3)
      return res.status(400).json({ erro: 'Nome inválido.' });
    await pool.execute(
      'UPDATE clientes SET nome = ?, telefone = ? WHERE id = ?',
      [nome.trim(), telefone || null, req.params.id]
    );
    res.json({ sucesso: 'Dados atualizados.' });
  } catch (err) { res.status(500).json({ erro: 'Erro ao atualizar dados.' }); }
});

// PUT /api/cliente/:id/endereco
app.put('/api/cliente/:id/endereco', async (req, res) => {
  try {
    const { cep, estado, cidade, rua, numero, complemento } = req.body;
    const [existe] = await pool.query(
      'SELECT id FROM enderecos WHERE cliente_id = ? AND principal = 1',
      [req.params.id]
    );
    if (existe.length) {
      await pool.execute(
        `UPDATE enderecos SET cep=?, estado=?, cidade=?, rua=?, numero=?, complemento=?
         WHERE cliente_id=? AND principal=1`,
        [cep, estado, cidade, rua, numero, complemento||null, req.params.id]
      );
    } else {
      await pool.execute(
        `INSERT INTO enderecos (cliente_id, rua, numero, complemento, bairro, cidade, estado, cep, principal)
         VALUES (?,?,?,?,?,?,?,?,1)`,
        [req.params.id, rua, numero, complemento||null, '', cidade, estado, cep]
      );
    }
    res.json({ sucesso: 'Endereço atualizado.' });
  } catch (err) { res.status(500).json({ erro: 'Erro ao atualizar endereço.' }); }
});

// PUT /api/cliente/:id/senha
app.put('/api/cliente/:id/senha', async (req, res) => {
  try {
    const { senhaAtual, senhaNova } = req.body;
    if (!senhaNova || senhaNova.length < 8)
      return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 8 caracteres.' });
    const [rows] = await pool.query(
      'SELECT id FROM clientes WHERE id = ? AND senha_hash = ?',
      [req.params.id, senhaAtual]
    );
    if (!rows.length)
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    await pool.execute(
      'UPDATE clientes SET senha_hash = ? WHERE id = ?',
      [senhaNova, req.params.id]
    );
    res.json({ sucesso: 'Senha alterada com sucesso.' });
  } catch (err) { res.status(500).json({ erro: 'Erro ao alterar senha.' }); }
});

// ============================================================
//  ROTAS ADMIN
// ============================================================

// GET /api/admin/clientes
app.get('/api/admin/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nome, email, telefone, criado_em
       FROM clientes ORDER BY criado_em DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar clientes.' }); }
});

// GET /api/admin/contatos
app.get('/api/admin/contatos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nome, assunto, mensagem, criado_em
       FROM contatos ORDER BY criado_em DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar contatos.' }); }
});

// GET /api/admin/pedidos
app.get('/api/admin/pedidos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pe.id, pe.status, pe.subtotal, pe.frete, pe.total,
              pe.observacoes, pe.criado_em,
              c.nome AS cliente_nome
       FROM pedidos pe
       LEFT JOIN clientes c ON c.id = pe.cliente_id
       ORDER BY pe.criado_em DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar pedidos.' }); }
});

// PUT /api/admin/pedidos/:id/status
app.put('/api/admin/pedidos/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validos = ['aguardando_pagamento','pago','em_separacao','enviado','entregue','cancelado'];
    if (!validos.includes(status))
      return res.status(400).json({ erro: 'Status inválido.' });
    await pool.execute(
      'UPDATE pedidos SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    res.json({ sucesso: 'Status atualizado.' });
  } catch (err) { res.status(500).json({ erro: 'Erro ao atualizar status.' }); }
});

// POST /api/admin/produtos
app.post('/api/admin/produtos', async (req, res) => {
  try {
    const { categoria_id, nome, descricao, preco, estoque, imagem_url, destaque, ativo } = req.body;
    if (!nome || !preco)
      return res.status(400).json({ erro: 'Nome e preço são obrigatórios.' });
    const [result] = await pool.execute(
      `INSERT INTO produtos (categoria_id, nome, descricao, preco, estoque, imagem_url, destaque, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [categoria_id||1, nome, descricao||null, preco, estoque||0, imagem_url||null, destaque||0, ativo!==undefined?ativo:1]
    );
    res.status(201).json({ sucesso: 'Produto criado.', id: result.insertId });
  } catch (err) { res.status(500).json({ erro: 'Erro ao criar produto.' }); }
});

// PUT /api/admin/produtos/:id
app.put('/api/admin/produtos/:id', async (req, res) => {
  try {
    const { categoria_id, nome, descricao, preco, estoque, imagem_url, destaque, ativo } = req.body;
    await pool.execute(
      `UPDATE produtos SET categoria_id=?, nome=?, descricao=?, preco=?,
       estoque=?, imagem_url=?, destaque=?, ativo=? WHERE id=?`,
      [categoria_id||1, nome, descricao||null, preco, estoque||0, imagem_url||null, destaque||0, ativo!==undefined?ativo:1, req.params.id]
    );
    res.json({ sucesso: 'Produto atualizado.' });
  } catch (err) { res.status(500).json({ erro: 'Erro ao atualizar produto.' }); }
});

// DELETE /api/admin/produtos/:id
app.delete('/api/admin/produtos/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM produtos WHERE id = ?', [req.params.id]);
    res.json({ sucesso: 'Produto excluído.' });
  } catch (err) { res.status(500).json({ erro: 'Erro ao excluir produto.' }); }
});

// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅  API UNNE rodando em http://localhost:${PORT}`);
});
