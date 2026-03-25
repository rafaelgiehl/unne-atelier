// ============================================================
//  UNNE Atelier — script.js (Versão Final com Botões e Deploy)
// ============================================================

// CONFIGURAÇÃO DE AMBIENTE: Detecta se está no PC ou no Servidor Render
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : '/api';

// ── VARIÁVEIS GLOBAIS ─────────────────────
let usuarioLogado = null;
let carrinho = JSON.parse(localStorage.getItem('unne_carrinho') || '[]');
let cupomAtivo = null;

const statusLabel = {
  'aguardando_pagamento': 'Aguardando pagamento',
  'pago': 'Pago',
  'em_separacao': 'Em separação',
  'enviado': 'Enviado',
  'entregue': 'Entregue',
  'cancelado': 'Cancelado',
};

const statusClasse = {
  'aguardando_pagamento': 'bs-aguardando',
  'pago': 'bs-pago',
  'em_separacao': 'bs-separacao',
  'enviado': 'bs-enviado',
  'entregue': 'bs-entregue',
  'cancelado': 'bs-cancelado',
};

// ── UTILITÁRIOS ───────────────────────────
window.toast = function (msg, tipo = 'ok') {
  const t = document.getElementById('toastU');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast-u ${tipo} visivel`;
  setTimeout(() => t.classList.remove('visivel'), 3000);
};

function fmt(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

// ── CARRINHO - LÓGICA CENTRAL ────────────────
function salvarCarrinho() {
  localStorage.setItem('unne_carrinho', JSON.stringify(carrinho));
  atualizarBadge();
  renderCarrinho();
}

function atualizarBadge() {
  const totalItems = carrinho.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.nav-carrinho-count').forEach(el => {
    el.textContent = totalItems;
    el.classList.toggle('visivel', totalItems > 0);
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
    const originalText = btn.innerHTML;
    btn.innerHTML = '✓ ADICIONADO';
    btn.classList.add('adicionado');
    setTimeout(() => { 
      btn.innerHTML = originalText; 
      btn.classList.remove('adicionado'); 
    }, 1500);
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

function renderCarrinho() {
  const lista = document.getElementById('carrItens');
  const footer = document.getElementById('carrFooter');
  if (!lista) return;

  if (!carrinho.length) {
    lista.innerHTML = `<div class="carr-vazio"><span class="carr-vazio-icone">🛍</span><p>Seu carrinho está vazio</p></div>`;
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

  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qty), 0);
  const desconto = cupomAtivo ? subtotal * (cupomAtivo.desconto / 100) : 0;
  const total = subtotal - desconto;

  document.getElementById('carrSubtotal').textContent = fmt(subtotal);
  document.getElementById('carrTotal').textContent = fmt(total);

  const linhaDesc = document.getElementById('carrLinhaDesconto');
  if (cupomAtivo && linhaDesc) {
    linhaDesc.style.display = 'flex';
    document.getElementById('carrDescontoLabel').textContent = `Cupom ${cupomAtivo.codigo}`;
    document.getElementById('carrDescontoValor').textContent = `− ${fmt(desconto)}`;
  } else if (linhaDesc) {
    linhaDesc.style.display = 'none';
  }

  if (footer) footer.style.display = 'block';
}

// ── DOM CONTENT LOADED ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. CARREGAR DESTAQUES (HOME)
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
            <button class="btn-add-carrinho" onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${p.preco}, '${p.imagem_url}', this)">
              + ADICIONAR
            </button>
          </div>`).join('');
      }).catch(err => console.error("Erro Destaques:", err));
  }

  // 2. CARREGAR COLEÇÃO COMPLETA
  const galeriaColecao = document.getElementById('galeria-colecao-exclusiva');
  if (galeriaColecao) {
    galeriaColecao.innerHTML = '<p style="grid-column:1/-1;text-align:center">Carregando coleção...</p>';
    fetch(`${API}/produtos`)
      .then(r => r.json())
      .then(produtos => {
        if (!produtos.length) { galeriaColecao.innerHTML = '<p>Nenhum produto encontrado.</p>'; return; }
        galeriaColecao.innerHTML = produtos.map(p => `
          <div class="card-produto">
            <img src="${p.imagem_url}" alt="${p.nome}">
            <h3>${p.nome}</h3>
            <p class="preco">${fmt(p.preco)}</p>
            <button class="btn-add-carrinho" onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${p.preco}, '${p.imagem_url}', this)">
              + ADICIONAR
            </button>
          </div>`).join('');
      }).catch(() => { galeriaColecao.innerHTML = '<p>Erro ao carregar produtos.</p>'; });
  }

  // 3. CARREGAR OUTLET
  const galeriaOutlet = document.getElementById('galeriaOutlet');
  if (galeriaOutlet) {
    const DESCONTO_OUTLET = 30;
    fetch(`${API}/outlet`)
      .then(r => r.json())
      .then(produtos => {
        if (!produtos.length) {
          galeriaOutlet.innerHTML = '<p>Nenhum produto no outlet hoje.</p>';
          return;
        }
        galeriaOutlet.innerHTML = produtos.map(p => {
          const precoOriginal = Number(p.preco);
          const precoOutlet = precoOriginal * (1 - (DESCONTO_OUTLET / 100));
          return `
            <div class="outlet-card">
              <div class="outlet-card-img">
                <span class="outlet-desconto-badge">-${DESCONTO_OUTLET}%</span>
                <img src="${p.imagem_url}" alt="${p.nome}">
              </div>
              <div class="outlet-card-body">
                <p class="outlet-card-nome">${p.nome}</p>
                <div class="outlet-precos">
                  <span class="preco-original">${fmt(precoOriginal)}</span>
                  <span class="preco-outlet">${fmt(precoOutlet)}</span>
                </div>
                <button class="btn-add-carrinho" style="width:100%; margin-top:10px" 
                        onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${precoOutlet}, '${p.imagem_url}', this)">
                  + ADICIONAR
                </button>
              </div>
            </div>`;
        }).join('');
      });
  }

  // 4. UNIDADES / LOJAS
  const boxLojas = document.getElementById('boxLojas');
  if (boxLojas) {
    fetch(`${API}/unidades`).then(r => r.json()).then(lojas => {
      const lista = lojas.map(l => `
        <div class="card-loja"><h3>📍 ${l.cidade} — ${l.estado}</h3>
        ${l.endereco ? `<p>${l.endereco}</p>` : ''}${l.telefone ? `<p>📞 ${l.telefone}</p>` : ''}</div>`).join('');
      const titulo = boxLojas.querySelector('h2');
      if (titulo) titulo.insertAdjacentHTML('afterend', lista);
    });
  }

  // Inicializa visual do carrinho
  atualizarBadge();
  renderCarrinho();
});

// ── SISTEMA DE LOGIN / MODAL ────────────────
window.abrirLogin = function (e) {
  if (e) e.preventDefault();
  document.getElementById('modalLoginOverlay')?.classList.add('aberto');
};

window.fecharLogin = function () {
  document.getElementById('modalLoginOverlay')?.classList.remove('aberto');
};

window.fazerLogin = async function () {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const fb = document.getElementById('loginFeedback');
  
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (res.ok) {
      usuarioLogado = data.cliente;
      window.fecharLogin();
      location.reload(); // Recarrega para aplicar estado de logado
    } else {
      fb.textContent = data.erro || 'Erro ao entrar.';
    }
  } catch (err) { fb.textContent = 'Erro de conexão.'; }
};

// ── FORMULÁRIO DE CONTATO ──────────────────
const formContato = document.getElementById('formEcommerce');
if (formContato) {
  formContato.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('resultadoValidacao');
    const payload = {
      nome: document.getElementById('nomeCliente').value,
      assunto: document.getElementById('assunto').value,
      mensagem: document.getElementById('mensagem').value
    };
    
    status.innerText = 'Enviando...';
    try {
      const res = await fetch(`${API}/contato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        status.innerText = 'Mensagem enviada com sucesso!';
        formContato.reset();
      } else { status.innerText = 'Erro ao enviar.'; }
    } catch { status.innerText = 'Erro de conexão.'; }
  });
}
