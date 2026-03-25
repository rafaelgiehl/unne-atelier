// ============================================================
//  UNNE Atelier — script.js (VERSÃO CORRIGIDA)
// ============================================================

// ── CONFIGURAÇÃO DE AMBIENTE ──────────────
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';

// ── VARIÁVEIS GLOBAIS ─────────────────────
let carrinho  = JSON.parse(localStorage.getItem('unne_carrinho') || '[]');
let cupomAtivo = null;

// ============================================================
//  UTILITÁRIOS
// ============================================================

function fmt(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

window.toast = function (msg, tipo = 'ok') {
  const t = document.getElementById('toastU');
  if (!t) { console.log(msg); return; }
  t.textContent = msg;
  t.className = `toast-u ${tipo} visivel`;
  setTimeout(() => t.classList.remove('visivel'), 3000);
};

// ============================================================
//  CARRINHO
// ============================================================

function salvarCarrinho() {
  localStorage.setItem('unne_carrinho', JSON.stringify(carrinho));
  atualizarBadge();
  renderCarrinho();
}

function atualizarBadge() {
  const total = carrinho.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('carrBadgeHeader');
  if (badge) badge.textContent = total;
  document.querySelectorAll('.nav-carrinho-count, .cart-count').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}

window.abrirCarrinho = function () {
  document.getElementById('carrinhoOverlay')?.classList.add('aberto');
  document.getElementById('carrinhoDrawer')?.classList.add('aberto');
  document.body.style.overflow = 'hidden';
};

window.fecharCarrinho = function () {
  document.getElementById('carrinhoOverlay')?.classList.remove('aberto');
  document.getElementById('carrinhoDrawer')?.classList.remove('aberto');
  document.body.style.overflow = '';
};

window.adicionarAoCarrinho = function (id, nome, preco, imagem, btn) {
  const idx = carrinho.findIndex(i => i.id === id);
  if (idx >= 0) {
    carrinho[idx].qty++;
  } else {
    carrinho.push({ id, nome, preco: Number(preco), imagem, qty: 1 });
  }
  salvarCarrinho();
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ ADICIONADO';
    setTimeout(() => { btn.innerHTML = orig; }, 1000);
  }
  window.abrirCarrinho();
};

window.alterarQty = function (id, delta) {
  const idx = carrinho.findIndex(i => i.id === id);
  if (idx < 0) return;
  carrinho[idx].qty += delta;
  if (carrinho[idx].qty <= 0) carrinho.splice(idx, 1);
  salvarCarrinho();
};

window.removerItem = function (id) {
  carrinho = carrinho.filter(i => i.id !== id);
  salvarCarrinho();
};

window.finalizarCompra = function () {
  const cliente = JSON.parse(sessionStorage.getItem('unne_cliente') || 'null');
  if (!cliente) {
    alert('Faça login para finalizar a compra.');
    window.location.href = 'minha-conta.html';
    return;
  }
  alert('Pedido recebido! Em breve você receberá a confirmação por e-mail.');
  carrinho = [];
  salvarCarrinho();
  window.fecharCarrinho();
};

// ============================================================
//  CUPONS
// ============================================================

window.liberarCupom = async function () {
  const p = document.getElementById('promoTexto');
  const b = document.getElementById('btnCupom');
  if (!b) return;
  b.innerText = 'Aguarde...';
  try {
    const res  = await fetch(`${API}/cupom/COURO2026`);
    const data = await res.json();
    if (res.ok) {
      if (p) p.innerHTML = `Cupom Liberado: <strong>${data.codigo}</strong> — ${data.desconto}% OFF`;
      b.innerText = 'LIBERADO';
      b.disabled  = true;
    }
  } catch {
    if (p) p.innerHTML = 'Cupom de Boas-vindas: <strong>COURO2026</strong> — 10% OFF';
    b.innerText = 'LIBERADO';
    b.disabled  = true;
  }
};

window.aplicarCupomCarr = async function () {
  const input = document.getElementById('inputCupomCarr');
  const msg   = document.getElementById('cupomMsg');
  if (!input) return;
  const codigo = input.value.trim().toUpperCase();
  if (!codigo) return;
  try {
    const res  = await fetch(`${API}/cupom/${codigo}`);
    const data = await res.json();
    if (res.ok) {
      cupomAtivo = { codigo: data.codigo, desconto: data.desconto };
      if (msg) { msg.innerText = `✓ Cupom "${data.codigo}" aplicado! ${data.desconto}% OFF`; msg.style.color = 'green'; }
      renderCarrinho();
    } else {
      if (msg) { msg.innerText = data.erro || 'Cupom inválido.'; msg.style.color = 'red'; }
      cupomAtivo = null;
      renderCarrinho();
    }
  } catch {
    if (msg) { msg.innerText = 'Erro ao validar cupom.'; msg.style.color = 'red'; }
  }
};

// ============================================================
//  RENDER DO CARRINHO
// ============================================================

function renderCarrinho() {
  const lista  = document.getElementById('carrItens');
  const footer = document.getElementById('carrFooter');
  if (!lista) return;

  if (carrinho.length === 0) {
    lista.innerHTML = '<div class="carr-vazio"><span class="carr-vazio-icone">🛍</span><p>Seu carrinho está vazio</p></div>';
    if (footer) footer.style.display = 'none';
    return;
  }

  lista.innerHTML = carrinho.map(item => `
    <div class="carr-item">
      <img class="carr-item-img" src="${item.imagem}" alt="${item.nome}">
      <div class="carr-item-info">
        <p class="carr-item-nome">${item.nome}</p>
        <p class="carr-item-preco">${fmt(item.preco)} / un.</p>
        <div class="carr-qty">
          <button onclick="alterarQty(${item.id}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="alterarQty(${item.id}, 1)">+</button>
        </div>
      </div>
      <button class="carr-item-remover" onclick="removerItem(${item.id})">✕</button>
    </div>
  `).join('');

  const subtotal   = carrinho.reduce((s, i) => s + (i.preco * i.qty), 0);
  let   totalFinal = subtotal;

  const linhaDesc = document.getElementById('carrLinhaDesconto');
  const valorDesc = document.getElementById('carrDescontoValor');
  const labelDesc = document.getElementById('carrDescontoLabel');

  if (cupomAtivo) {
    const descReal = subtotal * (cupomAtivo.desconto / 100);
    totalFinal = subtotal - descReal;
    if (linhaDesc) linhaDesc.style.display = 'flex';
    if (valorDesc) valorDesc.textContent = `− ${fmt(descReal)}`;
    if (labelDesc) labelDesc.textContent  = `Cupom ${cupomAtivo.codigo}`;
  } else {
    if (linhaDesc) linhaDesc.style.display = 'none';
  }

  const elSub   = document.getElementById('carrSubtotal');
  const elTotal = document.getElementById('carrTotal');
  if (elSub)   elSub.textContent   = fmt(subtotal);
  if (elTotal) elTotal.textContent = fmt(totalFinal);
  if (footer)  footer.style.display = 'block';
}

// ============================================================
//  AUTENTICAÇÃO (Login / Cadastro / Logout)
// ============================================================

// ── Sessão ──────────────────────────────
function getCliente() {
  return JSON.parse(sessionStorage.getItem('unne_cliente') || 'null');
}

function setCliente(cliente) {
  sessionStorage.setItem('unne_cliente', JSON.stringify(cliente));
}

function clearCliente() {
  sessionStorage.removeItem('unne_cliente');
}

// ── Atualiza nav (Entrar → nome do usuário) ──
function atualizarNav() {
  const cliente  = getCliente();
  const navLogin = document.getElementById('navLogin');
  if (!navLogin) return;
  if (cliente) {
    navLogin.textContent = `👤 ${cliente.nome.split(' ')[0]}`;
    navLogin.href = 'minha-conta.html';
    navLogin.onclick = null;
  } else {
    navLogin.textContent = 'Entrar';
    navLogin.href = 'minha-conta.html';
  }
}

// ── Login (usado na página minha-conta.html) ──
window.fazerLogin = async function () {
  const email = document.getElementById('loginEmail')?.value.trim();
  const senha = document.getElementById('loginSenha')?.value;
  const fb    = document.getElementById('loginFeedback');
  const btn   = document.getElementById('btnLogin');

  if (!email || !senha) {
    if (fb) { fb.textContent = 'Preencha e-mail e senha.'; fb.className = 'modal-feedback erro'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }

  try {
    const res  = await fetch(`${API}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha })
    });
    const data = await res.json();

    if (res.ok) {
      setCliente(data.cliente);
      exibirPainel(data.cliente);
    } else {
      if (fb) { fb.textContent = data.erro || 'Erro ao entrar.'; fb.className = 'modal-feedback erro'; }
    }
  } catch {
    if (fb) { fb.textContent = 'Sem conexão com o servidor.'; fb.className = 'modal-feedback erro'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
  }
};

// ── Logout ──
window.fazerLogout = function () {
  clearCliente();
  window.location.reload();
};

// ── Exibir painel do usuário ──
function exibirPainel(cliente) {
  const modal  = document.getElementById('modalLoginOverlay');
  const painel = document.getElementById('painelUsuario');
  const tela   = document.getElementById('telaInicial');

  if (modal)  modal.classList.remove('aberto');
  if (tela)   tela.style.display   = 'none';
  if (painel) painel.style.display = 'block';

  const hero = document.getElementById('nomeUsuarioHero');
  if (hero) hero.textContent = cliente.nome;

  // Preenche campos de dados
  const campos = {
    pfNome:     cliente.nome,
    pfEmail:    cliente.email,
    pfTelefone: cliente.telefone || '',
    pfCep:      cliente.cep      || '',
    pfEstado:   cliente.estado   || '',
    pfCidade:   cliente.cidade   || '',
    pfRua:      cliente.rua      || '',
    pfNumero:   cliente.numero   || '',
    pfComp:     cliente.complemento || ''
  };

  Object.entries(campos).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // Carrega pedidos (simulado — tabela pedidos não existe ainda)
  const listaPedidos = document.getElementById('listaPedidos');
  if (listaPedidos) {
    listaPedidos.innerHTML = '<p class="estado-vazio-p">Você ainda não realizou nenhum pedido.</p>';
  }
}

// ── Abas do modal login ──
window.trocarAba = function (aba, el) {
  document.querySelectorAll('.modal-aba').forEach(a => a.classList.remove('ativa'));
  document.querySelectorAll('.modal-secao').forEach(s => s.classList.remove('visivel'));
  el.classList.add('ativa');
  const target = document.getElementById(`aba${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
  if (target) target.classList.add('visivel');
};

// ── Fechar modal ──
window.fecharLogin = function () {
  document.getElementById('modalLoginOverlay')?.classList.remove('aberto');
};

window.fecharLoginFora = function (e) {
  if (e.target === document.getElementById('modalLoginOverlay')) fecharLogin();
};

// ── Abas do painel do usuário ──
window.irParaAba = function (aba, el) {
  document.querySelectorAll('.painel-aba').forEach(a => a.classList.remove('ativa'));
  document.querySelectorAll('.painel-secao').forEach(s => s.classList.remove('visivel'));
  if (el) el.classList.add('ativa');
  const target = document.getElementById(`sec-${aba}`);
  if (target) target.classList.add('visivel');
};

// ── Salvar dados pessoais ──
window.salvarDados = async function () {
  const cliente = getCliente();
  if (!cliente) return;
  const nome     = document.getElementById('pfNome')?.value.trim();
  const telefone = document.getElementById('pfTelefone')?.value.trim();
  const fb       = document.getElementById('dadosFeedback');

  try {
    const res  = await fetch(`${API}/clientes/${cliente.id}/dados`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nome, telefone })
    });
    const data = await res.json();
    if (res.ok) {
      cliente.nome = nome; cliente.telefone = telefone;
      setCliente(cliente);
      const hero = document.getElementById('nomeUsuarioHero');
      if (hero) hero.textContent = nome;
      if (fb) { fb.textContent = '✓ Dados salvos!'; fb.className = 'modal-feedback ok'; }
    } else {
      if (fb) { fb.textContent = data.erro; fb.className = 'modal-feedback erro'; }
    }
  } catch {
    if (fb) { fb.textContent = 'Erro de conexão.'; fb.className = 'modal-feedback erro'; }
  }
};

// ── Salvar endereço ──
window.salvarEndereco = async function () {
  const cliente = getCliente();
  if (!cliente) return;
  const body = {
    cep:         document.getElementById('pfCep')?.value.trim(),
    estado:      document.getElementById('pfEstado')?.value.trim(),
    cidade:      document.getElementById('pfCidade')?.value.trim(),
    rua:         document.getElementById('pfRua')?.value.trim(),
    numero:      document.getElementById('pfNumero')?.value.trim(),
    complemento: document.getElementById('pfComp')?.value.trim()
  };
  const fb = document.getElementById('endFeedback');

  try {
    const res  = await fetch(`${API}/clientes/${cliente.id}/endereco`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      Object.assign(cliente, body);
      setCliente(cliente);
      if (fb) { fb.textContent = '✓ Endereço salvo!'; fb.className = 'modal-feedback ok'; }
    } else {
      if (fb) { fb.textContent = data.erro; fb.className = 'modal-feedback erro'; }
    }
  } catch {
    if (fb) { fb.textContent = 'Erro de conexão.'; fb.className = 'modal-feedback erro'; }
  }
};

// ── Alterar senha ──
window.alterarSenha = async function () {
  const cliente    = getCliente();
  if (!cliente) return;
  const senhaAtual = document.getElementById('senhaAtual')?.value;
  const senhaNova  = document.getElementById('senhaNova')?.value;
  const senhaConf  = document.getElementById('senhaConf')?.value;
  const fb         = document.getElementById('senhaFeedback');

  if (!senhaAtual || !senhaNova) {
    if (fb) { fb.textContent = 'Preencha todos os campos.'; fb.className = 'modal-feedback erro'; }
    return;
  }
  if (senhaNova.length < 8) {
    if (fb) { fb.textContent = 'A nova senha deve ter pelo menos 8 caracteres.'; fb.className = 'modal-feedback erro'; }
    return;
  }
  if (senhaNova !== senhaConf) {
    if (fb) { fb.textContent = 'As senhas não coincidem.'; fb.className = 'modal-feedback erro'; }
    return;
  }

  try {
    const res  = await fetch(`${API}/clientes/${cliente.id}/senha`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ senhaAtual, senhaNova })
    });
    const data = await res.json();
    if (res.ok) {
      if (fb) { fb.textContent = '✓ Senha alterada com sucesso!'; fb.className = 'modal-feedback ok'; }
      document.getElementById('senhaAtual').value = '';
      document.getElementById('senhaNova').value  = '';
      document.getElementById('senhaConf').value  = '';
    } else {
      if (fb) { fb.textContent = data.erro; fb.className = 'modal-feedback erro'; }
    }
  } catch {
    if (fb) { fb.textContent = 'Erro de conexão.'; fb.className = 'modal-feedback erro'; }
  }
};

// ── Força da senha (painel minha-conta) ──
window.avaliarForca = function (senha) {
  let score = 0;
  if (senha.length >= 8)             score++;
  if (/[A-Z]/.test(senha))           score++;
  if (/[0-9]/.test(senha))           score++;
  if (/[^A-Za-z0-9]/.test(senha))   score++;

  ['fb1','fb2','fb3','fb4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'forca-barra' + (i < score ? ` f${score}` : '');
  });
};

// ============================================================
//  CADASTRO (página cadastro.html)
// ============================================================

window.irParaEtapa = function (num) {
  // Valida etapa atual antes de avançar
  if (num === 2 && !validarEtapa1()) return;
  if (num === 3 && !validarEtapa2()) return;

  document.querySelectorAll('.cad-secao').forEach(s => s.classList.remove('visivel'));
  document.querySelectorAll('.etapa').forEach(e => e.classList.remove('ativa', 'concluida'));

  const secao = document.getElementById(`secao${num}`);
  if (secao) secao.classList.add('visivel');

  for (let i = 1; i <= 3; i++) {
    const etapa = document.getElementById(`etapa${i}`);
    if (!etapa) continue;
    if (i < num)  etapa.classList.add('concluida');
    if (i === num) etapa.classList.add('ativa');
  }
};

function validarEtapa1() {
  let ok = true;
  const nome  = document.getElementById('cadNome')?.value.trim();
  const email = document.getElementById('cadEmail')?.value.trim();
  const tel   = document.getElementById('cadTelefone')?.value.trim();

  const erroNome  = document.getElementById('erroNome');
  const erroEmail = document.getElementById('erroEmail');
  const erroTel   = document.getElementById('erroTelefone');

  if (!nome || nome.length < 3) {
    if (erroNome) erroNome.textContent = 'Informe seu nome completo.'; ok = false;
  } else { if (erroNome) erroNome.textContent = ''; }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (erroEmail) erroEmail.textContent = 'Informe um e-mail válido.'; ok = false;
  } else { if (erroEmail) erroEmail.textContent = ''; }

  if (!tel || tel.length < 14) {
    if (erroTel) erroTel.textContent = 'Informe um telefone válido.'; ok = false;
  } else { if (erroTel) erroTel.textContent = ''; }

  return ok;
}

function validarEtapa2() {
  let ok = true;
  const campos = [
    ['cadCep',    'erroCep',    'Informe o CEP.'],
    ['cadEstado', 'erroEstado', 'Selecione o estado.'],
    ['cadCidade', 'erroCidade', 'Informe a cidade.'],
    ['cadRua',    'erroRua',    'Informe a rua.'],
    ['cadNumero', 'erroNumero', 'Informe o número.']
  ];
  campos.forEach(([inputId, erroId, msg]) => {
    const val  = document.getElementById(inputId)?.value.trim();
    const erro = document.getElementById(erroId);
    if (!val) { if (erro) erro.textContent = msg; ok = false; }
    else       { if (erro) erro.textContent = ''; }
  });
  return ok;
}

// Força de senha no cadastro
window.avaliarSenha = function (senha) {
  let score = 0;
  if (senha.length >= 8)           score++;
  if (/[A-Z]/.test(senha))         score++;
  if (/[0-9]/.test(senha))         score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;

  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const cores   = ['', '#c0392b', '#e67e22', '#f1c40f', '#4a7c59'];

  ['b1','b2','b3','b4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.background = i < score ? cores[score] : '#e0d5c5';
  });

  const label = document.getElementById('forcaLabel');
  if (label) label.textContent = senha.length === 0 ? 'Digite uma senha' : (labels[score] || 'Forte');
};

// Toggle visibilidade senha
window.toggleSenha = function (inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else                           { input.type = 'password'; btn.textContent = '👁'; }
};

// Máscara CEP
window.mascaraCep = function (input) {
  let v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  input.value = v;
};

// Máscara CEP painel
window.mascaraCepP = window.mascaraCep;

// Busca CEP via ViaCEP
async function _buscarCep(cep, campos) {
  const limpo = cep.replace(/\D/g, '');
  if (limpo.length !== 8) return;
  try {
    const res  = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const data = await res.json();
    if (data.erro) return;
    Object.entries(campos).forEach(([id, campo]) => {
      const el = document.getElementById(id);
      if (el && data[campo]) el.value = data[campo];
    });
  } catch { /* sem internet, ignora */ }
}

window.buscarCep = function (cep) {
  _buscarCep(cep, {
    cadEstado:  'uf',
    cadCidade:  'localidade',
    cadRua:     'logradouro'
  });
};

window.buscarCepP = function (cep) {
  _buscarCep(cep, {
    pfEstado: 'uf',
    pfCidade: 'localidade',
    pfRua:    'logradouro'
  });
};

// Máscara telefone
window.mascaraTelefone = function (input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 6)  v = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  else if (v.length > 2)  v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length > 0)  v = `(${v}`;
  input.value = v;
};

// Submit do formulário de cadastro
document.addEventListener('DOMContentLoaded', () => {

  // Máscara de telefone no cadastro
  const telInput = document.getElementById('cadTelefone');
  if (telInput) telInput.addEventListener('input', () => mascaraTelefone(telInput));

  // Submit cadastro
  const formCad = document.getElementById('formCadastro');
  if (formCad) {
    formCad.addEventListener('submit', async function (e) {
      e.preventDefault();

      const senha  = document.getElementById('cadSenha')?.value;
      const senha2 = document.getElementById('cadSenha2')?.value;
      const erroS  = document.getElementById('erroSenha');
      const erroS2 = document.getElementById('erroSenha2');

      if (!senha || senha.length < 8) {
        if (erroS) erroS.textContent = 'A senha deve ter pelo menos 8 caracteres.';
        return;
      } else { if (erroS) erroS.textContent = ''; }

      if (senha !== senha2) {
        if (erroS2) erroS2.textContent = 'As senhas não coincidem.';
        return;
      } else { if (erroS2) erroS2.textContent = ''; }

      const btn = document.getElementById('btnCadastrar');
      if (btn) { btn.disabled = true; btn.textContent = 'Criando conta...'; }

      const body = {
        nome:     document.getElementById('cadNome')?.value.trim(),
        email:    document.getElementById('cadEmail')?.value.trim(),
        telefone: document.getElementById('cadTelefone')?.value.trim(),
        senha:    senha,
        endereco: {
          cep:         document.getElementById('cadCep')?.value.trim(),
          estado:      document.getElementById('cadEstado')?.value,
          cidade:      document.getElementById('cadCidade')?.value.trim(),
          rua:         document.getElementById('cadRua')?.value.trim(),
          numero:      document.getElementById('cadNumero')?.value.trim(),
          complemento: document.getElementById('cadComp')?.value.trim()
        }
      };

      try {
        const res  = await fetch(`${API}/clientes`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body)
        });
        const data = await res.json();

        if (res.ok) {
          formCad.style.display = 'none';
          const sucesso = document.getElementById('cadSucesso');
          if (sucesso) sucesso.style.display = 'block';
          const linkLogin = document.getElementById('linkLogin');
          if (linkLogin) linkLogin.style.display = 'none';
        } else {
          const erroNome = document.getElementById('erroNome');
          if (erroNome) { erroNome.textContent = data.erro || 'Erro ao criar conta.'; }
          irParaEtapa(1);
        }
      } catch {
        alert('Sem conexão com o servidor. Tente novamente.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Criar conta'; }
      }
    });
  }

  // Submit contato
  const formContato = document.getElementById('formEcommerce');
  if (formContato) {
    formContato.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nome    = document.getElementById('nomeCliente')?.value.trim();
      const email   = document.getElementById('emailCliente')?.value.trim();
      const assunto = document.getElementById('assuntoHidden')?.value;
      const msg     = document.getElementById('mensagem')?.value.trim();
      const status  = document.getElementById('resultadoValidacao');
      const btn     = document.querySelector('.btn-enviar');

      if (status) status.className = '';

      if (!nome || nome.length < 3) {
        if (status) { status.textContent = 'Informe seu nome completo.'; status.className = 'erro'; }
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (status) { status.textContent = 'Informe um e-mail válido.'; status.className = 'erro'; }
        return;
      }
      if (!assunto) {
        if (status) { status.textContent = 'Selecione um assunto.'; status.className = 'erro'; }
        return;
      }
      if (!msg || msg.length < 10) {
        if (status) { status.textContent = 'A mensagem deve ter pelo menos 10 caracteres.'; status.className = 'erro'; }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

      try {
        const res  = await fetch(`${API}/contato`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ nome, email, assunto, mensagem: msg })
        });
        const data = await res.json();
        if (res.ok) {
          if (status) { status.textContent = '✓ Mensagem enviada! Retornaremos em breve.'; status.className = 'sucesso'; }
          this.reset();
          document.querySelectorAll('.chip').forEach(c => c.classList.remove('ativo'));
        } else {
          if (status) { status.textContent = data.erro || 'Erro ao enviar.'; status.className = 'erro'; }
        }
      } catch {
        // Fallback sem servidor
        if (status) { status.textContent = '✓ Mensagem recebida! (modo offline)'; status.className = 'sucesso'; }
        this.reset();
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('ativo'));
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Enviar Mensagem'; }
      }
    });
  }

  // ── CARREGAR DESTAQUES (HOME) ──────────
  const gridHome = document.querySelector('.grid-produtos');
  if (gridHome) {
    fetch(`${API}/produtos?destaque=1`)
      .then(r => r.json())
      .then(produtos => {
        if (!produtos.length) return;
        gridHome.innerHTML = produtos.map(p => `
          <div class="card">
            <img src="${p.imagem_url}" alt="${p.nome}">
            <h3>${p.nome}</h3>
            <p>${fmt(p.preco)}</p>
            <button class="btn-add-carrinho"
              onclick="adicionarAoCarrinho(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.preco}, '${p.imagem_url}', this)">
              + ADICIONAR
            </button>
          </div>`).join('');
      })
      .catch(() => { /* mantém HTML estático */ });
  }

  // ── CARREGAR COLEÇÃO ───────────────────
  const galeriaColecao = document.getElementById('galeria-colecao-exclusiva');
  if (galeriaColecao) {
    fetch(`${API}/produtos`)
      .then(r => r.json())
      .then(produtos => {
        galeriaColecao.innerHTML = produtos.map(p => `
          <div class="card-produto">
            <img src="${p.imagem_url}" alt="${p.nome}">
            <h3>${p.nome}</h3>
            <p class="preco">${fmt(p.preco)}</p>
            <button class="btn-add-carrinho"
              onclick="adicionarAoCarrinho(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.preco}, '${p.imagem_url}', this)">
              + ADICIONAR
            </button>
          </div>`).join('');
      })
      .catch(() => { /* mantém HTML estático */ });
  }

  // ── CARREGAR OUTLET ────────────────────
  const galeriaOutlet = document.getElementById('galeriaOutlet');
  if (galeriaOutlet) {
    fetch(`${API}/outlet`)
      .then(r => r.json())
      .then(produtos => {
        const totalEl = document.getElementById('totalOutlet');
        if (totalEl) totalEl.textContent = `${produtos.length} produto(s) em promoção`;

        if (!produtos.length) {
          galeriaOutlet.innerHTML = '<p class="outlet-loading">Nenhum produto em outlet no momento.</p>';
          return;
        }

        galeriaOutlet.innerHTML = produtos.map(p => {
          const precoOriginal = (p.preco / 0.7).toFixed(2);
          const economia      = (p.preco / 0.7 * 0.3).toFixed(2);
          return `
            <div class="outlet-card">
              <div class="outlet-card-img">
                <span class="outlet-desconto-badge">−30%</span>
                <img src="${p.imagem_url}" alt="${p.nome}">
              </div>
              <div class="outlet-card-body">
                <p class="outlet-card-nome">${p.nome}</p>
                <div class="outlet-precos">
                  <span class="preco-original">R$ ${precoOriginal.replace('.',',')}</span>
                  <span class="preco-outlet">R$ ${Number(p.preco).toFixed(2).replace('.',',')}</span>
                </div>
                <span class="economia-tag">Você economiza R$ ${economia.replace('.',',')}</span>
                <button class="btn-add-carrinho" style="margin-top:12px;width:100%"
                  onclick="adicionarAoCarrinho(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.preco}, '${p.imagem_url}', this)">
                  + ADICIONAR
                </button>
              </div>
            </div>`;
        }).join('');
      })
      .catch(() => {
        const totalEl = document.getElementById('totalOutlet');
        if (totalEl) totalEl.textContent = '';
        galeriaOutlet.innerHTML = '<p class="outlet-loading">Erro ao carregar produtos. Tente novamente.</p>';
      });
  }

  // ── CRONÔMETRO OUTLET ──────────────────
  const cronH = document.getElementById('cronH');
  if (cronH) {
    // Define um prazo fixo de 23h59 a partir da meia-noite de hoje
    const agora   = new Date();
    const fim     = new Date(agora);
    fim.setHours(23, 59, 59, 0);

    function tickCron() {
      const diff = Math.max(0, fim - new Date());
      const h    = Math.floor(diff / 3600000);
      const m    = Math.floor((diff % 3600000) / 60000);
      const s    = Math.floor((diff % 60000) / 1000);
      document.getElementById('cronH').textContent = String(h).padStart(2, '0');
      document.getElementById('cronM').textContent = String(m).padStart(2, '0');
      document.getElementById('cronS').textContent = String(s).padStart(2, '0');
    }
    tickCron();
    setInterval(tickCron, 1000);
  }

  // ── CARREGAR UNIDADES ──────────────────
  const boxLojas = document.getElementById('boxLojas');
  if (boxLojas) {
    fetch(`${API}/unidades`)
      .then(r => r.json())
      .then(unidades => {
        if (!unidades.length) return;
        const lista = unidades.map(u =>
          `<div class="card-loja">
             <h3>${u.cidade} — ${u.estado}</h3>
             <p>${u.endereco}</p>
             <p>📞 ${u.telefone}</p>
           </div>`
        ).join('');
        boxLojas.innerHTML = `<h2>Onde nos encontrar</h2>${lista}`;
      })
      .catch(() => { /* mantém HTML estático */ });
  }

  // ── MINHA CONTA ────────────────────────
  const cliente = getCliente();
  if (cliente) {
    exibirPainel(cliente);
  }

  // ── INICIALIZA BADGE E CARRINHO ────────
  atualizarBadge();
  renderCarrinho();
  atualizarNav();

});

// ============================================================
//  ACESSIBILIDADE
// ============================================================

window.toggleAcessibilidade = function () {
  const painel = document.getElementById('painelAcessibilidade');
  if (painel) painel.style.display = painel.style.display === 'flex' ? 'none' : 'flex';
};

window.estiloAcessivel = function (tipo) {
  if (tipo === 'escuro') {
    document.body.classList.add('modo-escuro');
    document.body.classList.remove('fonte-grande');
    localStorage.setItem('unne_acessibilidade', 'escuro');
  } else if (tipo === 'claro') {
    document.body.classList.remove('modo-escuro', 'fonte-grande');
    localStorage.removeItem('unne_acessibilidade');
  } else if (tipo === 'fonte') {
    document.body.classList.toggle('fonte-grande');
  }
};

// Restaura preferência de acessibilidade salva
(function () {
  const pref = localStorage.getItem('unne_acessibilidade');
  if (pref === 'escuro') document.body.classList.add('modo-escuro');
})();

// ============================================================
//  FILTROS (página coleção)
// ============================================================

window.toggleFiltros = function () {
  const area = document.getElementById('areaFiltros');
  if (area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
};

// ============================================================
//  BANNER / CAROUSEL (home)
// ============================================================

const banners = ['images/banner1.jpg', 'images/banner2.jpg', 'images/banner3.jpg'];
let bannerIdx = 0;

window.mudarBanner = function (dir) {
  bannerIdx = (bannerIdx + dir + banners.length) % banners.length;
  const img = document.getElementById('bannerImg');
  if (img) img.src = banners[bannerIdx];
};
