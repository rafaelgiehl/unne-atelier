// ============================================================
//  UNNE Atelier — API Backend (Node.js + Express + mysql2)
//  Versão Corrigida para Render.com + TiDB Cloud
// ============================================================

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ CORREÇÃO: servidor está na raiz junto com os HTMLs
app.use(express.static(path.join(__dirname, './')));

// ------------------------------------------------------------
// Conexão com o banco (TiDB Cloud via variáveis de ambiente)
// ------------------------------------------------------------
const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME || 'unne_db',
  port:               parseInt(process.env.DB_PORT) || 4000,
  waitForConnections: true,
  connectionLimit:    10,
  ssl: { rejectUnauthorized: false }
});

// Teste de conexão ao iniciar
pool.getConnection()
  .then(conn => { console.log('✅ Banco de dados conectado!'); conn.release(); })
  .catch(err  => console.error('❌ Erro ao conectar no banco:', err.message));

// ------------------------------------------------------------
// ROTA PRINCIPAL
// ------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
    if (destaque === '1') sql += ' AND p.destaque = 1';
    sql += ' ORDER BY p.nome';

    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Erro /api/produtos:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// ------------------------------------------------------------
// API: Outlet
// ✅ CORREÇÃO: coluna `outlet` agora existe no banco (via patch SQL)
// ------------------------------------------------------------
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
    console.error('Erro /api/outlet:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos outlet.' });
  }
});

// ------------------------------------------------------------
// API: Cupons
// ------------------------------------------------------------
app.get('/api/cupom/:codigo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT codigo, desconto FROM cupons
       WHERE codigo = ? AND ativo = 1
         AND (expira_em IS NULL OR expira_em >= CURDATE())`,
      [req.params.codigo.toUpperCase()]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Cupom inválido ou expirado.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro /api/cupom:', err.message);
    res.status(500).json({ erro: 'Erro ao validar cupom.' });
  }
});

// ------------------------------------------------------------
// API: Unidades
// ------------------------------------------------------------
app.get('/api/unidades', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cidade, estado, endereco, telefone
       FROM unidades WHERE ativo = 1 ORDER BY cidade`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro /api/unidades:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar unidades.' });
  }
});

// ------------------------------------------------------------
// API: Contato (POST)
// ✅ CORREÇÃO: inclui campo email (que existia no form mas faltava no INSERT)
// ------------------------------------------------------------
app.post('/api/contato', async (req, res) => {
  try {
    const { nome, email, assunto, mensagem } = req.body;
    if (!nome || !assunto || !mensagem) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });
    }
    await pool.execute(
      `INSERT INTO contatos (nome, email, assunto, mensagem) VALUES (?, ?, ?, ?)`,
      [nome.trim(), (email || '').trim(), assunto, mensagem.trim()]
    );
    res.json({ sucesso: 'Mensagem enviada!' });
  } catch (err) {
    console.error('Erro /api/contato:', err.message);
    res.status(500).json({ erro: 'Erro ao salvar contato.' });
  }
});

// ------------------------------------------------------------
// API: Clientes — Cadastro (POST)
// ✅ CORREÇÃO: tabela clientes agora existe (criada via patch SQL)
// ------------------------------------------------------------
app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
    }
    const [existe] = await pool.query('SELECT id FROM clientes WHERE email = ?', [email.trim()]);
    if (existe.length > 0) return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });

    const [result] = await pool.execute(
      `INSERT INTO clientes (nome, email, senha_hash, telefone) VALUES (?, ?, ?, ?)`,
      [nome.trim(), email.trim(), senha, telefone || null]
    );
    res.status(201).json({ sucesso: 'Conta criada!', clienteId: result.insertId });
  } catch (err) {
    console.error('Erro /api/clientes:', err.message);
    res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

// ------------------------------------------------------------
// API: Login (POST)
// ✅ CORREÇÃO: retorna dados de endereço para preencher painel
// ------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });

    const [rows] = await pool.query(
      `SELECT id, nome, email, telefone,
              cep, estado, cidade, rua, numero, complemento
       FROM clientes WHERE email = ? AND senha_hash = ?`,
      [email.trim(), senha]
    );
    if (!rows.length) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    res.json({ sucesso: true, cliente: rows[0] });
  } catch (err) {
    console.error('Erro /api/login:', err.message);
    res.status(500).json({ erro: 'Erro no login.' });
  }
});

// ------------------------------------------------------------
// API: Atualizar dados pessoais (PUT)
// ------------------------------------------------------------
app.put('/api/clientes/:id/dados', async (req, res) => {
  try {
    const { nome, telefone } = req.body;
    await pool.execute(
      `UPDATE clientes SET nome = ?, telefone = ? WHERE id = ?`,
      [nome.trim(), telefone || null, req.params.id]
    );
    res.json({ sucesso: 'Dados atualizados!' });
  } catch (err) {
    console.error('Erro PUT dados:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar dados.' });
  }
});

// ------------------------------------------------------------
// API: Atualizar endereço (PUT)
// ------------------------------------------------------------
app.put('/api/clientes/:id/endereco', async (req, res) => {
  try {
    const { cep, estado, cidade, rua, numero, complemento } = req.body;
    await pool.execute(
      `UPDATE clientes SET cep=?, estado=?, cidade=?, rua=?, numero=?, complemento=? WHERE id=?`,
      [cep||null, estado||null, cidade||null, rua||null, numero||null, complemento||null, req.params.id]
    );
    res.json({ sucesso: 'Endereço atualizado!' });
  } catch (err) {
    console.error('Erro PUT endereco:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar endereço.' });
  }
});

// ------------------------------------------------------------
// API: Alterar senha (PUT)
// ------------------------------------------------------------
app.put('/api/clientes/:id/senha', async (req, res) => {
  try {
    const { senhaAtual, senhaNova } = req.body;
    const [rows] = await pool.query(
      'SELECT id FROM clientes WHERE id = ? AND senha_hash = ?',
      [req.params.id, senhaAtual]
    );
    if (!rows.length) return res.status(401).json({ erro: 'Senha atual incorreta.' });
    await pool.execute('UPDATE clientes SET senha_hash = ? WHERE id = ?', [senhaNova, req.params.id]);
    res.json({ sucesso: 'Senha alterada!' });
  } catch (err) {
    console.error('Erro PUT senha:', err.message);
    res.status(500).json({ erro: 'Erro ao alterar senha.' });
  }
});

// ------------------------------------------------------------
// Iniciar Servidor
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ API UNNE Ativa na porta ${PORT}`);
});
