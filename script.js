// ============================================================
//  UNNE Atelier — script.js (VERSÃO FINAL UNIFICADA)
// ============================================================

// CONFIGURAÇÃO DE AMBIENTE
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : '/api';

// ── VARIÁVEIS GLOBAIS ─────────────────────
let carrinho = JSON.parse(localStorage.getItem('unne_carrinho') || '[]');
let cupomAtivo = null;

// ── UTILITÁRIOS ───────────────────────────
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

// ── LÓGICA DO CARRINHO ────────────────────
function salvarCarrinho() {
  localStorage.setItem('unne_carrinho', JSON.stringify(carrinho));
  atualizarBadge();
  renderCarrinho();
}

function atualizarBadge() {
  const totalItems = carrinho.reduce((s, i) => s + i.qty, 0);
  
  // Atualiza o contador do Header do Carrinho (id="carrBadgeHeader")
  const badgeHeader = document.getElementById('carrBadgeHeader');
  if (badgeHeader) {
    badgeHeader.textContent = totalItems;
  }

  // Atualiza ícones globais (se houver no nav)
  document.querySelectorAll('.nav-carrinho-count, .cart-count').forEach(el => {
    el.textContent = totalItems;
    el.style.display = totalItems > 0 ? 'flex' : 'none';
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
    setTimeout(() => { btn.innerHTML = originalText; }, 1000);
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

// ── CUPONS ────────────────────────────────

// 1. Revelar Cupom na Home
window.liberarCupom = async function () {
  const p = document.getElementById('promoTexto');
  const b = document.getElementById('btnCupom');
  if (!b) return;

  b.innerText = 'Aguarde...';
  try {
    const res = await fetch(`${API}/cupom/COURO2026`);
    const data = await res.json();
    if (res.ok) {
      if(p) p.innerHTML = `Cupom Liberado: <strong>${data.codigo}</strong> — ${data.desconto}% OFF`;
      b.innerText = 'LIBERADO';
      b.disabled = true;
    }
  } catch {
    if(p) p.innerHTML = 'Cupom de Boas-vindas: <strong>BEMVINDO10</strong>';
    b.innerText = 'LIBERADO';
  }
};

// 2. Aplicar Cupom no Drawer do Carrinho (id="aplicarCupomCarr")
window.aplicarCupomCarr = async function() {
  const input = document.getElementById('inputCupomCarr');
  const msg = document.getElementById('cupomMsg');
  if (!input) return;

  const codigo = input.value.trim().toUpperCase();
  if (!codigo) return;

  try {
    const res = await fetch(`${API}/cupom/${codigo}`);
    const data = await res.json();

    if (res.ok) {
      cupomAtivo = { codigo: data.codigo, desconto: data.desconto };
      if(msg) { msg.innerText = "Cupom aplicado!"; msg.style.color = "green"; }
      renderCarrinho();
    } else {
      if(msg) { msg.innerText = data.erro || "Inválido"; msg.style.color = "red"; }
      cupomAtivo = null;
      renderCarrinho();
    }
  } catch (err) {
    if(msg) msg.innerText = "Erro ao validar";
  }
};

// ── RENDERIZAÇÃO DO CARRINHO ──────────────
function renderCarrinho() {
  const lista = document.getElementById('carrItens');
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

  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qty), 0);
  let totalFinal = subtotal;

  const linhaDesc = document.getElementById('carrLinhaDesconto');
  const valorDesc = document.getElementById('carrDescontoValor');
  const labelDesc = document.getElementById('carrDescontoLabel');

  if (cupomAtivo) {
    const descReal = subtotal * (cupomAtivo.desconto / 100);
    totalFinal = subtotal - descReal;
    if (linhaDesc) linhaDesc.style.display = 'flex';
    if (valorDesc) valorDesc.textContent = `- ${fmt(descReal)}`;
    if (labelDesc) labelDesc.textContent = `Cupom ${cupomAtivo.codigo}`;
  } else {
    if (linhaDesc) linhaDesc.style.display = 'none';
  }

  document.getElementById('carrSubtotal').textContent = fmt(subtotal);
  document.getElementById('carrTotal').textContent = fmt(totalFinal);
  if (footer) footer.style.display = 'block';
}

// ── INICIALIZAÇÃO E BUSCA DE PRODUTOS ─────
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. CARREGAR DESTAQUES (HOME)
  const gridHome = document.querySelector('.grid-produtos');
  if (gridHome) {
    fetch(`${API}/produtos?destaque=1`).then(r => r.json()).then(produtos => {
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
    });
  }

  // 2. CARREGAR COLEÇÃO (PÁGINA COLEÇÃO)
  const galeriaColecao = document.getElementById('galeria-colecao-exclusiva');
  if (galeriaColecao) {
    fetch(`${API}/produtos`).then(r => r.json()).then(produtos => {
      galeriaColecao.innerHTML = produtos.map(p => `
        <div class="card-produto">
          <img src="${p.imagem_url}" alt="${p.nome}">
          <h3>${p.nome}</h3>
          <p class="preco">${fmt(p.preco)}</p>
          <button class="btn-add-carrinho" onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${p.preco}, '${p.imagem_url}', this)">
            + ADICIONAR
          </button>
        </div>`).join('');
    });
  }

  atualizarBadge();
  renderCarrinho();
});
