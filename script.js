// ============================================================
//  UNNE Atelier — script.js (VERSÃO FINAL PARA SEU HTML)
// ============================================================

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : '/api';

let carrinho = JSON.parse(localStorage.getItem('unne_carrinho') || '[]');
let cupomAtivo = null;

// ── UTILITÁRIOS ───────────────────────────
function fmt(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }

// ── ACESSIBILIDADE (Conforme seu HTML) ─────
window.toggleAcessibilidade = function() {
    const painel = document.getElementById('painelAcessibilidade');
    if (painel) painel.classList.toggle('aberto');
};

window.estiloAcessivel = function(tipo) {
    if (tipo === 'escuro') {
        document.body.classList.add('modo-escuro');
        localStorage.setItem('tema', 'escuro');
    } else if (tipo === 'claro') {
        document.body.classList.remove('modo-escuro');
        localStorage.setItem('tema', 'claro');
    } else if (tipo === 'fonte') {
        const size = window.getComputedStyle(document.body).getPropertyValue('font-size');
        const currentSize = parseFloat(size);
        document.body.style.fontSize = (currentSize + 2) + 'px';
    }
};

// ── CRONÔMETRO DO OUTLET ──────────────────
function iniciarCronometro() {
    let h = 24, m = 0, s = 0;
    const elH = document.getElementById('cronH');
    const elM = document.getElementById('cronM');
    const elS = document.getElementById('cronS');

    if (!elH) return;

    setInterval(() => {
        if (s > 0) s--;
        else {
            s = 59;
            if (m > 0) m--;
            else { m = 59; if (h > 0) h--; }
        }
        elH.innerText = h.toString().padStart(2, '0');
        elM.innerText = m.toString().padStart(2, '0');
        elS.innerText = s.toString().padStart(2, '0');
    }, 1000);
}

// ── LÓGICA DO CARRINHO ────────────────────
function salvarCarrinho() {
    localStorage.setItem('unne_carrinho', JSON.stringify(carrinho));
    atualizarBadge();
    renderCarrinho();
}

function atualizarBadge() {
    const total = carrinho.reduce((s, i) => s + i.qty, 0);
    // Badge do nav
    const navCount = document.getElementById('navCarrinhoCount');
    if (navCount) navCount.textContent = total;
    // Badge do header do drawer
    const badgeHeader = document.getElementById('carrBadgeHeader');
    if (badgeHeader) badgeHeader.textContent = total;
}

window.abrirCarrinho = function() {
    document.getElementById('carrinhoOverlay')?.classList.add('aberto');
    document.getElementById('carrinhoDrawer')?.classList.add('aberto');
};

window.fecharCarrinho = function() {
    document.getElementById('carrinhoOverlay')?.classList.remove('aberto');
    document.getElementById('carrinhoDrawer')?.classList.remove('aberto');
};

window.adicionarAoCarrinho = function(id, nome, preco, imagem, btn) {
    const idx = carrinho.findIndex(i => i.id === id);
    if (idx >= 0) carrinho[idx].qty++;
    else carrinho.push({ id, nome, preco: Number(preco), imagem, qty: 1 });
    
    salvarCarrinho();
    if (btn) {
        const original = btn.innerText;
        btn.innerText = 'ADICIONADO ✓';
        setTimeout(() => btn.innerText = original, 1000);
    }
    window.abrirCarrinho();
};

window.alterarQty = (id, delta) => {
    const i = carrinho.findIndex(x => x.id === id);
    if (i > -1) {
        carrinho[i].qty += delta;
        if (carrinho[i].qty <= 0) carrinho.splice(i, 1);
        salvarCarrinho();
    }
};

window.aplicarCupomCarr = async function() {
    const input = document.getElementById('inputCupomCarr');
    const msg = document.getElementById('cupomMsg');
    if (!input || !input.value) return;

    try {
        const res = await fetch(`${API}/cupom/${input.value.trim().toUpperCase()}`);
        const data = await res.json();
        if (res.ok) {
            cupomAtivo = { codigo: data.codigo, desconto: data.desconto };
            msg.innerText = "Cupom aplicado!"; msg.style.color = "green";
            renderCarrinho();
        } else {
            msg.innerText = "Cupom inválido"; msg.style.color = "red";
        }
    } catch { msg.innerText = "Erro ao validar"; }
};

function renderCarrinho() {
    const lista = document.getElementById('carrItens');
    const footer = document.getElementById('carrFooter');
    if (!lista) return;

    if (carrinho.length === 0) {
        lista.innerHTML = '<div class="carr-vazio"><p>Seu carrinho está vazio</p></div>';
        if (footer) footer.style.display = 'none';
        return;
    }

    lista.innerHTML = carrinho.map(item => `
        <div class="carr-item" style="display:flex; gap:10px; margin-bottom:15px; align-items:center;">
            <img src="${item.imagem}" width="50" height="50" style="object-fit:cover;">
            <div style="flex:1">
                <p style="margin:0; font-size:0.9rem;">${item.nome}</p>
                <p style="margin:0; font-size:0.8rem; color:#888;">${fmt(item.preco)}</p>
                <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                    <button onclick="alterarQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="alterarQty(${item.id}, 1)">+</button>
                </div>
            </div>
        </div>
    `).join('');

    const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qty), 0);
    let total = subtotal;

    if (cupomAtivo) {
        const desc = subtotal * (cupomAtivo.desconto / 100);
        total = subtotal - desc;
        document.getElementById('carrLinhaDesconto').style.display = 'flex';
        document.getElementById('carrDescontoValor').textContent = `- ${fmt(desc)}`;
        document.getElementById('carrDescontoLabel').textContent = `Cupom ${cupomAtivo.codigo}`;
    } else {
        document.getElementById('carrLinhaDesconto').style.display = 'none';
    }

    document.getElementById('carrSubtotal').textContent = fmt(subtotal);
    document.getElementById('carrTotal').textContent = fmt(total);
    if (footer) footer.style.display = 'block';
}

// ── CARREGAMENTO INICIAL ──────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('tema') === 'escuro') document.body.classList.add('modo-escuro');
    
    // CARREGAR OUTLET (Com os IDs do seu HTML)
    const galeriaOutlet = document.getElementById('galeriaOutlet');
    const totalOutletTxt = document.getElementById('totalOutlet');

    if (galeriaOutlet) {
        fetch(`${API}/outlet`).then(r => r.json()).then(produtos => {
            if (totalOutletTxt) totalOutletTxt.innerText = `${produtos.length} itens encontrados`;
            
            if (!produtos.length) {
                galeriaOutlet.innerHTML = '<p class="outlet-loading">Nenhum produto em oferta no momento.</p>';
                return;
            }

            galeriaOutlet.innerHTML = produtos.map(p => {
                const precoOriginal = Number(p.preco);
                const precoPromo = precoOriginal * 0.7; // 30% desconto
                const economia = precoOriginal - precoPromo;

                return `
                <div class="outlet-card">
                    <div class="outlet-card-img">
                        <span class="outlet-desconto-badge">-30%</span>
                        <img src="${p.imagem_url}" alt="${p.nome}">
                    </div>
                    <div class="outlet-card-body">
                        <p class="outlet-card-nome">${p.nome}</p>
                        <div class="outlet-precos">
                            <span class="preco-original">${fmt(precoOriginal)}</span>
                            <span class="preco-outlet">${fmt(precoPromo)}</span>
                        </div>
                        <span class="economia-tag">Você economiza ${fmt(economia)}</span>
                        <button class="btn-add-carrinho" style="width:100%; margin-top:15px; background:#3d2b1f; color:#fff; border:none; padding:10px; cursor:pointer;" 
                                onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${precoPromo}, '${p.imagem_url}', this)">
                            + ADICIONAR
                        </button>
                    </div>
                </div>`;
            }).join('');
        }).catch(() => {
            galeriaOutlet.innerHTML = '<p class="outlet-loading">Erro ao carregar ofertas.</p>';
        });
        iniciarCronometro();
    }

    // CARREGAR HOME
    const gridHome = document.querySelector('.grid-produtos');
    if (gridHome) {
        fetch(`${API}/produtos?destaque=1`).then(r => r.json()).then(produtos => {
            gridHome.innerHTML = produtos.map(p => `
                <div class="card">
                    <img src="${p.imagem_url}" alt="${p.nome}">
                    <h3>${p.nome}</h3>
                    <p>${fmt(p.preco)}</p>
                    <button class="btn-add-carrinho" onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${p.preco}, '${p.imagem_url}', this)">+ ADICIONAR</button>
                </div>`).join('');
        });
    }

    atualizarBadge();
    renderCarrinho();
});
