// ============================================================
//  UNNE Atelier — script.js  (versão final completa)
// ============================================================

const API = 'http://localhost:3000/api';

// ── MINHA CONTA — variáveis globais ─────────────────────
let usuarioLogado = null;

const statusLabel = {
  'aguardando_pagamento': 'Aguardando pagamento',
  'pago':                 'Pago',
  'em_separacao':         'Em separação',
  'enviado':              'Enviado',
  'entregue':             'Entregue',
  'cancelado':            'Cancelado',
};

const statusClasse = {
  'aguardando_pagamento': 'bs-aguardando',
  'pago':                 'bs-pago',
  'em_separacao':         'bs-separacao',
  'enviado':              'bs-enviado',
  'entregue':             'bs-entregue',
  'cancelado':            'bs-cancelado',
};

// ── TOAST ────────────────────────────────────────────────
window.toast = function (msg, tipo = 'ok') {
  const t = document.getElementById('toastU');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast-u ${tipo} visivel`;
  setTimeout(() => t.classList.remove('visivel'), 3000);
};

// ── MODAL LOGIN ──────────────────────────────────────────
window.abrirLogin = function (e) {
  if (e) e.preventDefault();
  const overlay = document.getElementById('modalLoginOverlay');
  if (!overlay) return;
  overlay.classList.add('aberto');
  setTimeout(() => { const el = document.getElementById('loginEmail'); if (el) el.focus(); }, 100);
};

window.fecharLogin = function () {
  const overlay = document.getElementById('modalLoginOverlay');
  if (overlay) overlay.classList.remove('aberto');
};

window.fecharLoginFora = function (e) {
  if (e.target === document.getElementById('modalLoginOverlay')) window.fecharLogin();
};

window.trocarAba = function (aba, el) {
  document.querySelectorAll('.modal-aba').forEach(a => a.classList.remove('ativa'));
  document.querySelectorAll('.modal-secao').forEach(s => s.classList.remove('visivel'));
  el.classList.add('ativa');
  const secao = document.getElementById(`aba${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
  if (secao) secao.classList.add('visivel');
};

// ── LOGIN ────────────────────────────────────────────────
window.fazerLogin = async function () {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const fb    = document.getElementById('loginFeedback');
  const btn   = document.getElementById('btnLogin');

  if (!email || !senha) {
    fb.textContent = 'Preencha e-mail e senha.';
    fb.className   = 'modal-feedback erro'; return;
  }

  btn.disabled = true; fb.textContent = 'Entrando...'; fb.className = 'modal-feedback';

  try {
    const res  = await fetch(`${API}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (res.ok) {
      usuarioLogado = data.cliente;
      window.fecharLogin();
      exibirPainel();
    } else {
      fb.textContent = data.erro || 'E-mail ou senha incorretos.';
      fb.className   = 'modal-feedback erro';
    }
  } catch {
    usuarioLogado = { id: 1, nome: 'Usuário Demo', email, telefone: '' };
    window.fecharLogin();
    exibirPainel();
  } finally {
    btn.disabled = false;
  }
};

// ── EXIBIR PAINEL ────────────────────────────────────────
function exibirPainel() {
  const telaInicial   = document.getElementById('telaInicial');
  const painelUsuario = document.getElementById('painelUsuario');
  const navLogin      = document.getElementById('navLogin');
  const nomeHero      = document.getElementById('nomeUsuarioHero');

  if (telaInicial)   telaInicial.style.display   = 'none';
  if (painelUsuario) painelUsuario.style.display = 'block';
  if (navLogin)      navLogin.textContent        = usuarioLogado.nome.split(' ')[0];
  if (nomeHero)      nomeHero.textContent        = usuarioLogado.nome.split(' ')[0];

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('pfNome',     usuarioLogado.nome);
  set('pfEmail',    usuarioLogado.email);
  set('pfTelefone', usuarioLogado.telefone);

  carregarPedidos();
  carregarEndereco();
}

// ── LOGOUT ───────────────────────────────────────────────
window.fazerLogout = function () {
  usuarioLogado = null;
  const painelUsuario = document.getElementById('painelUsuario');
  const telaInicial   = document.getElementById('telaInicial');
  const navLogin      = document.getElementById('navLogin');
  if (painelUsuario) painelUsuario.style.display = 'none';
  if (telaInicial)   telaInicial.style.display   = 'block';
  if (navLogin)      navLogin.textContent        = 'Entrar';
};

// ── ABAS PAINEL ──────────────────────────────────────────
window.irParaAba = function (aba, el) {
  document.querySelectorAll('.painel-aba').forEach(a => a.classList.remove('ativa'));
  document.querySelectorAll('.painel-secao').forEach(s => s.classList.remove('visivel'));
  if (el) el.classList.add('ativa');
  const sec = document.getElementById(`sec-${aba}`);
  if (sec) sec.classList.add('visivel');
};

// ── PEDIDOS DO USUÁRIO ───────────────────────────────────
async function carregarPedidos() {
  const el = document.getElementById('listaPedidos');
  if (!el || !usuarioLogado) return;
  try {
    const res  = await fetch(`${API}/cliente/${usuarioLogado.id}/pedidos`);
    const data = await res.json();
    if (!data.length) { el.innerHTML = '<p class="estado-vazio-p">Você ainda não fez nenhum pedido.</p>'; return; }
    el.innerHTML = data.map(p => `
      <div class="pedido-item">
        <div class="pedido-info">
          <h4>Pedido #${p.id}</h4>
          <p>${new Date(p.criado_em).toLocaleDateString('pt-BR')}</p>
        </div>
        <span class="badge-status ${statusClasse[p.status] || 'bs-aguardando'}">
          ${statusLabel[p.status] || p.status}
        </span>
        <span class="pedido-valor">R$ ${Number(p.total).toFixed(2).replace('.', ',')}</span>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="estado-vazio-p">Nenhum pedido encontrado.</p>'; }
}

// ── ENDEREÇO DO USUÁRIO ──────────────────────────────────
async function carregarEndereco() {
  if (!usuarioLogado) return;
  try {
    const res  = await fetch(`${API}/cliente/${usuarioLogado.id}/endereco`);
    const data = await res.json();
    if (data && data.rua) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      set('pfCep', data.cep); set('pfEstado', data.estado); set('pfCidade', data.cidade);
      set('pfRua', data.rua); set('pfNumero', data.numero); set('pfComp', data.complemento);
    }
  } catch {}
}

window.mascaraCepP = function (el) {
  let v = el.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  el.value = v;
};

window.buscarCepP = async function (cep) {
  const nums = cep.replace(/\D/g, '');
  if (nums.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
    const d = await r.json();
    if (!d.erro) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      set('pfRua', d.logradouro); set('pfCidade', d.localidade); set('pfEstado', d.uf);
      const num = document.getElementById('pfNumero');
      if (num) num.focus();
    }
  } catch {}
};

window.salvarDados = async function () {
  const nome     = document.getElementById('pfNome').value.trim();
  const telefone = document.getElementById('pfTelefone').value.trim();
  const fb       = document.getElementById('dadosFeedback');
  if (nome.length < 3) { fb.textContent = 'Nome inválido.'; fb.className = 'modal-feedback erro'; return; }
  try {
    const res = await fetch(`${API}/cliente/${usuarioLogado.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone }),
    });
    if (res.ok) {
      usuarioLogado.nome = nome;
      const nomeHero = document.getElementById('nomeUsuarioHero');
      const navLogin = document.getElementById('navLogin');
      if (nomeHero) nomeHero.textContent = nome.split(' ')[0];
      if (navLogin) navLogin.textContent = nome.split(' ')[0];
      window.toast('Dados atualizados!'); fb.textContent = '';
    } else { fb.textContent = 'Erro ao salvar.'; fb.className = 'modal-feedback erro'; }
  } catch { window.toast('Dados salvos! (modo offline)'); usuarioLogado.nome = nome; }
};

window.salvarEndereco = async function () {
  const fb = document.getElementById('endFeedback');
  const payload = {
    cep:         document.getElementById('pfCep').value,
    estado:      document.getElementById('pfEstado').value,
    cidade:      document.getElementById('pfCidade').value.trim(),
    rua:         document.getElementById('pfRua').value.trim(),
    numero:      document.getElementById('pfNumero').value.trim(),
    complemento: document.getElementById('pfComp').value.trim(),
  };
  if (!payload.rua || !payload.numero) { fb.textContent = 'Preencha rua e número.'; fb.className = 'modal-feedback erro'; return; }
  try {
    const res = await fetch(`${API}/cliente/${usuarioLogado.id}/endereco`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { window.toast('Endereço atualizado!'); fb.textContent = ''; }
    else { fb.textContent = 'Erro ao salvar.'; fb.className = 'modal-feedback erro'; }
  } catch { window.toast('Endereço salvo! (modo offline)'); }
};

window.alterarSenha = async function () {
  const atual = document.getElementById('senhaAtual').value;
  const nova  = document.getElementById('senhaNova').value;
  const conf  = document.getElementById('senhaConf').value;
  const fb    = document.getElementById('senhaFeedback');
  if (!atual)          { fb.textContent = 'Informe a senha atual.'; fb.className = 'modal-feedback erro'; return; }
  if (nova.length < 8) { fb.textContent = 'Mínimo 8 caracteres.';  fb.className = 'modal-feedback erro'; return; }
  if (nova !== conf)   { fb.textContent = 'As senhas não coincidem.'; fb.className = 'modal-feedback erro'; return; }
  try {
    const res  = await fetch(`${API}/cliente/${usuarioLogado.id}/senha`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senhaAtual: atual, senhaNova: nova }),
    });
    const data = await res.json();
    if (res.ok) {
      window.toast('Senha alterada!'); fb.textContent = '';
      ['senhaAtual','senhaNova','senhaConf'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    } else { fb.textContent = data.erro || 'Erro ao alterar.'; fb.className = 'modal-feedback erro'; }
  } catch { window.toast('Senha alterada! (modo offline)'); }
};

window.avaliarForca = function (v) {
  const barras = [1,2,3,4].map(i => document.getElementById('fb'+i));
  barras.forEach(b => { if (b) b.className = 'forca-barra'; });
  let pts = 0;
  if (v.length >= 8)           pts++;
  if (/[A-Z]/.test(v))         pts++;
  if (/[0-9]/.test(v))         pts++;
  if (/[^A-Za-z0-9]/.test(v))  pts++;
  const cls = ['','f1','f2','f3','f4'];
  for (let i = 0; i < pts; i++) if (barras[i]) barras[i].classList.add(cls[pts]);
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') window.fecharLogin(); });

// ============================================================
//  DOMContentLoaded
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // CARROSSEL
  let bannerAtual = 0;
  const imagensBanner = ['images/banner1.jpg','images/banner2.jpg','images/banner3.jpg'];
  function mudarBanner(direcao) {
    const img = document.getElementById('bannerImg');
    if (!img) return;
    bannerAtual = (bannerAtual + direcao + imagensBanner.length) % imagensBanner.length;
    img.style.opacity = 0;
    setTimeout(() => { img.src = imagensBanner[bannerAtual]; img.style.opacity = 1; }, 300);
  }
  setInterval(() => mudarBanner(1), 5000);
  window.mudarBanner = mudarBanner;

  // CUPOM
  window.liberarCupom = async function () {
    const p = document.getElementById('promoTexto');
    const b = document.getElementById('btnCupom');
    if (!p || !b) return;
    b.disabled = true; b.innerText = 'Aguarde...';
    try {
      const res = await fetch(`${API}/cupom/COURO2026`);
      const data = await res.json();
      if (res.ok) { p.innerHTML = `Cupom Ativado: <strong>${data.codigo}</strong> — ${data.desconto}% OFF`; b.innerText = 'LIBERADO'; }
      else { p.innerText = data.erro || 'Cupom indisponível.'; b.disabled = false; b.innerText = 'Tentar novamente'; }
    } catch { p.innerText = 'Cupom: COURO2026 (10% OFF)'; b.innerText = 'LIBERADO'; }
  };

  // GALERIA HOME
  const gridHome = document.querySelector('.grid-produtos');
  if (gridHome) {
    fetch(`${API}/produtos?destaque=1`).then(r => r.json()).then(produtos => {
      if (!produtos.length) return;
      gridHome.innerHTML = produtos.map(p => `
        <div class="card"><img src="${p.imagem_url}" alt="${p.nome}"><h3>${p.nome}</h3>
        <p>R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</p></div>`).join('');
    }).catch(() => {});
  }

  // GALERIA COLEÇÃO
  const galeriaColecao = document.getElementById('galeria-colecao-exclusiva');
  if (galeriaColecao) {
    galeriaColecao.innerHTML = '<p style="grid-column:1/-1;text-align:center">Carregando coleção...</p>';
    fetch(`${API}/produtos`).then(r => r.json()).then(produtos => {
      if (!produtos.length) { galeriaColecao.innerHTML = '<p>Nenhum produto encontrado.</p>'; return; }
      galeriaColecao.innerHTML = produtos.map(p => `
        <div class="card-produto"><img src="${p.imagem_url}" alt="${p.nome}"><h3>${p.nome}</h3>
        <p class="preco">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</p></div>`).join('');
    }).catch(() => { galeriaColecao.innerHTML = '<p>Não foi possível carregar os produtos.</p>'; });
  }

  // UNIDADES
  const boxLojas = document.getElementById('boxLojas');
  if (boxLojas) {
    fetch(`${API}/unidades`).then(r => r.json()).then(lojas => {
      const lista = lojas.map(l => `
        <div class="card-loja"><h3>📍 ${l.cidade} — ${l.estado}</h3>
        ${l.endereco ? `<p>${l.endereco}</p>` : ''}${l.telefone ? `<p>📞 ${l.telefone}</p>` : ''}</div>`).join('');
      const titulo = boxLojas.querySelector('h2');
      if (titulo) titulo.insertAdjacentHTML('afterend', lista);
    }).catch(() => {});
  }

  // FILTROS
  window.toggleFiltros = function () {
    const area = document.getElementById('areaFiltros');
    if (!area) return;
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
  };

  // PERSONALIZAÇÃO
  window.mudarCor = function (cor) {
    const img = document.getElementById('fotoBolsa');
    if (!img) return;
    img.src = cor === 'preto' ? 'images/colecao3.jpg' : 'images/colecao4.jpg';
  };

  // ACESSIBILIDADE
  window.toggleAcessibilidade = function () {
    const painel = document.getElementById('painelAcessibilidade');
    if (!painel) return;
    painel.style.display = painel.style.display === 'block' ? 'none' : 'block';
  };

  window.estiloAcessivel = function (modo) {
    const body = document.body;
    if (modo === 'escuro')     { body.classList.add('modo-escuro'); body.classList.remove('fonte-grande'); }
    else if (modo === 'claro') { body.classList.remove('modo-escuro', 'fonte-grande'); }
    else if (modo === 'fonte') { body.classList.toggle('fonte-grande'); }
  };

  // CONTATO
  const form = document.getElementById('formEcommerce');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome     = document.getElementById('nomeCliente').value.trim();
      const assunto  = document.getElementById('assuntoHidden')?.value || document.getElementById('assunto')?.value;
      const mensagem = document.getElementById('mensagem').value.trim();
      const status   = document.getElementById('resultadoValidacao');
      if (nome.length < 3)  { status.innerText = 'Erro: Nome deve ter pelo menos 3 caracteres.'; status.style.color = 'red'; return; }
      if (!assunto)         { status.innerText = 'Erro: Selecione um assunto.'; status.style.color = 'red'; return; }
      if (!mensagem)        { status.innerText = 'Erro: A mensagem não pode estar vazia.'; status.style.color = 'red'; return; }
      status.innerText = 'Enviando...'; status.style.color = '#333';
      try {
        const res  = await fetch(`${API}/contato`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, assunto, mensagem }) });
        const data = await res.json();
        if (res.ok) { status.innerText = data.sucesso; status.style.color = 'green'; form.reset(); }
        else        { status.innerText = data.erro || 'Erro ao enviar.'; status.style.color = 'red'; }
      } catch { status.innerText = 'Erro de conexão.'; status.style.color = 'red'; }
    });
  }

  // CADASTRO
  if (document.getElementById('formCadastro')) {
    let etapaAtual = 1;

    window.irParaEtapa = function (num) {
      if (num > etapaAtual && !validarEtapa(etapaAtual)) return;
      document.getElementById(`secao${etapaAtual}`).classList.remove('visivel');
      document.getElementById(`etapa${etapaAtual}`).classList.remove('ativa');
      if (num > etapaAtual) document.getElementById(`etapa${etapaAtual}`).classList.add('concluida');
      else document.getElementById(`etapa${etapaAtual}`).classList.remove('concluida');
      etapaAtual = num;
      document.getElementById(`secao${etapaAtual}`).classList.add('visivel');
      document.getElementById(`etapa${etapaAtual}`).classList.add('ativa');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function validarEtapa(n) {
      let ok = true;
      const e = (id, msg) => { document.getElementById(id).textContent = msg; ok = false; };
      const c = (id) => document.getElementById(id).textContent = '';
      if (n === 1) {
        c('erroNome'); c('erroEmail'); c('erroTelefone');
        const nome  = document.getElementById('cadNome').value.trim();
        const email = document.getElementById('cadEmail').value.trim();
        const tel   = document.getElementById('cadTelefone').value.trim();
        if (nome.length < 3) e('erroNome', 'Informe o nome completo.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e('erroEmail', 'E-mail inválido.');
        if (tel.replace(/\D/g,'').length < 8) e('erroTelefone', 'Telefone inválido.');
      }
      if (n === 2) {
        c('erroCep'); c('erroEstado'); c('erroCidade'); c('erroRua'); c('erroNumero');
        if (document.getElementById('cadCep').value.replace(/\D/g,'').length < 8) e('erroCep', 'CEP inválido.');
        if (!document.getElementById('cadEstado').value) e('erroEstado', 'Selecione o estado.');
        if (!document.getElementById('cadCidade').value.trim()) e('erroCidade', 'Informe a cidade.');
        if (!document.getElementById('cadRua').value.trim()) e('erroRua', 'Informe a rua.');
        if (!document.getElementById('cadNumero').value.trim()) e('erroNumero', 'Informe o número.');
      }
      return ok;
    }

    window.mascaraCep = function (el) {
      let v = el.value.replace(/\D/g,'').slice(0,8);
      if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5);
      el.value = v;
    };

    window.buscarCep = async function (cep) {
      const nums = cep.replace(/\D/g,'');
      if (nums.length !== 8) return;
      try {
        const r = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
        const d = await r.json();
        if (!d.erro) {
          document.getElementById('cadRua').value    = d.logradouro || '';
          document.getElementById('cadCidade').value = d.localidade  || '';
          const sel = document.getElementById('cadEstado');
          for (let o of sel.options) if (o.value === d.uf) { sel.value = d.uf; break; }
          document.getElementById('cadNumero').focus();
        }
      } catch {}
    };

    window.avaliarSenha = function (v) {
      const barras = [1,2,3,4].map(i => document.getElementById('b'+i));
      const label  = document.getElementById('forcaLabel');
      barras.forEach(b => { if (b) b.className = 'forca-barra'; });
      let pts = 0;
      if (v.length >= 8)           pts++;
      if (/[A-Z]/.test(v))         pts++;
      if (/[0-9]/.test(v))         pts++;
      if (/[^A-Za-z0-9]/.test(v))  pts++;
      const niveis = ['','Fraca','Razoável','Boa','Forte'];
      const cls    = ['','f1','f2','f3','f4'];
      for (let i = 0; i < pts; i++) if (barras[i]) barras[i].classList.add(cls[pts]);
      if (label) label.textContent = pts === 0 ? 'Digite uma senha' : niveis[pts];
    };

    window.toggleSenha = function (id, btn) {
      const inp = document.getElementById(id);
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    };

    document.getElementById('formCadastro').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validarEtapa(3)) return;
      const senha  = document.getElementById('cadSenha').value;
      const senha2 = document.getElementById('cadSenha2').value;
      if (senha.length < 8)  { document.getElementById('erroSenha').textContent  = 'Mínimo 8 caracteres.'; return; }
      if (senha !== senha2)  { document.getElementById('erroSenha2').textContent = 'As senhas não coincidem.'; return; }
      const btn = document.getElementById('btnCadastrar');
      btn.disabled = true; btn.textContent = 'Criando conta...';
      const payload = {
        nome: document.getElementById('cadNome').value.trim(), email: document.getElementById('cadEmail').value.trim(),
        telefone: document.getElementById('cadTelefone').value.trim(), senha,
        endereco: {
          cep: document.getElementById('cadCep').value, estado: document.getElementById('cadEstado').value,
          cidade: document.getElementById('cadCidade').value.trim(), rua: document.getElementById('cadRua').value.trim(),
          numero: document.getElementById('cadNumero').value.trim(), complemento: document.getElementById('cadComp').value.trim(),
        }
      };
      try {
        const res  = await fetch(`${API}/clientes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { document.getElementById('erroSenha').textContent = data.erro || 'Erro ao criar conta.'; btn.disabled = false; btn.textContent = 'Criar conta'; return; }
      } catch {}
      document.getElementById('formCadastro').style.display = 'none';
      document.getElementById('cadSucesso').style.display   = 'block';
      document.getElementById('linkLogin').style.display    = 'none';
      document.querySelectorAll('.etapas .etapa').forEach(el => { el.classList.remove('ativa'); el.classList.add('concluida'); });
    });
  }

  // ----------------------------------------------------------
  // OUTLET
  // ----------------------------------------------------------
  const galeriaOutlet = document.getElementById('galeriaOutlet');
  if (galeriaOutlet) {
    const DESCONTO = 30;

    // Cronômetro regressivo até meia-noite
    function iniciarCronometro() {
      const fim = new Date();
      fim.setHours(23, 59, 59, 0);
      function atualizar() {
        const agora = new Date();
        let diff = Math.max(0, Math.floor((fim - agora) / 1000));
        const h = Math.floor(diff / 3600); diff -= h * 3600;
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        const elH = document.getElementById('cronH');
        const elM = document.getElementById('cronM');
        const elS = document.getElementById('cronS');
        if (elH) elH.textContent = String(h).padStart(2,'0');
        if (elM) elM.textContent = String(m).padStart(2,'0');
        if (elS) elS.textContent = String(s).padStart(2,'0');
      }
      atualizar();
      setInterval(atualizar, 1000);
    }

    // Carrega produtos do outlet
    async function carregarOutlet() {
      const total = document.getElementById('totalOutlet');
      try {
        const res      = await fetch(`${API}/outlet`);
        const produtos = await res.json();

        if (!produtos.length) {
          galeriaOutlet.innerHTML = '<p class="outlet-loading">Nenhum produto disponível no outlet.</p>';
          if (total) total.textContent = '0 produtos';
          return;
        }

        if (total) total.textContent = `${produtos.length} produto${produtos.length > 1 ? 's' : ''} em oferta`;

        galeriaOutlet.innerHTML = produtos.map(p => {
          const precoOriginal = Number(p.preco);
          const precoOutlet   = precoOriginal * (1 - DESCONTO / 100);
          const economia      = precoOriginal - precoOutlet;
          return `
            <div class="outlet-card">
              <div class="outlet-card-img">
                <span class="outlet-desconto-badge">-${DESCONTO}% OFF</span>
                <img src="${p.imagem_url}" alt="${p.nome}"
                     onerror="this.src='https://via.placeholder.com/260x260/f0ebe0/888?text=UNNE'">
              </div>
              <div class="outlet-card-body">
                <p class="outlet-card-nome">${p.nome}</p>
                <div class="outlet-precos">
                  <span class="preco-original">R$ ${precoOriginal.toFixed(2).replace('.',',')}</span>
                  <span class="preco-outlet">R$ ${precoOutlet.toFixed(2).replace('.',',')}</span>
                </div>
                <span class="economia-tag">Economia de R$ ${economia.toFixed(2).replace('.',',')}</span>
              </div>
            </div>
          `;
        }).join('');

      } catch {
        galeriaOutlet.innerHTML = '<p class="outlet-loading">Não foi possível carregar os produtos.</p>';
        if (total) total.textContent = '';
      }
    }

    iniciarCronometro();
    carregarOutlet();
  }

  // ----------------------------------------------------------
  // CARRINHO
  // ----------------------------------------------------------
  let carrinho = JSON.parse(localStorage.getItem('unne_carrinho') || '[]');
  let cupomAtivo = null;

  function salvarCarrinho() {
    localStorage.setItem('unne_carrinho', JSON.stringify(carrinho));
    atualizarBadge();
    renderCarrinho();
  }

  function atualizarBadge() {
    const total = carrinho.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.nav-carrinho-count').forEach(el => {
      el.textContent = total;
      el.classList.toggle('visivel', total > 0);
    });
    const badge = document.getElementById('carrBadgeHeader');
    if (badge) badge.textContent = total;
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
    if (idx >= 0) carrinho[idx].qty++;
    else carrinho.push({ id, nome, preco: Number(preco), imagem, qty: 1 });
    salvarCarrinho();
    if (btn) {
      btn.textContent = '✓ Adicionado';
      btn.classList.add('adicionado');
      setTimeout(() => { btn.textContent = '+ Adicionar'; btn.classList.remove('adicionado'); }, 1500);
    }
    abrirCarrinho();
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

  function fmt(v) {
    return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
  }

  function calcularTotais() {
    const subtotal = carrinho.reduce((s, i) => s + i.preco * i.qty, 0);
    const desconto = cupomAtivo ? subtotal * (cupomAtivo.desconto / 100) : 0;
    const total    = subtotal - desconto;
    return { subtotal, desconto, total };
  }

  function renderCarrinho() {
    const lista  = document.getElementById('carrItens');
    const footer = document.getElementById('carrFooter');
    if (!lista) return;

    if (!carrinho.length) {
      lista.innerHTML = `
        <div class="carr-vazio">
          <span class="carr-vazio-icone">🛍</span>
          <p>Seu carrinho está vazio</p>
        </div>`;
      if (footer) footer.style.display = 'none';
      return;
    }

    lista.innerHTML = carrinho.map(item => `
      <div class="carr-item">
        <img class="carr-item-img" src="${item.imagem}" alt="${item.nome}"
             onerror="this.src='https://via.placeholder.com/72x72/f0ebe0/888?text=?'">
        <div class="carr-item-info">
          <p class="carr-item-nome">${item.nome}</p>
          <p class="carr-item-preco">${fmt(item.preco)} / un.</p>
          <div class="carr-qty">
            <button onclick="alterarQty(${item.id}, -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="alterarQty(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="carr-item-remover" onclick="removerItem(${item.id})" title="Remover">✕</button>
      </div>
    `).join('');

    const { subtotal, desconto, total } = calcularTotais();
    document.getElementById('carrSubtotal').textContent = fmt(subtotal);
    document.getElementById('carrTotal').textContent    = fmt(total);

    const linhaDesc = document.getElementById('carrLinhaDesconto');
    if (cupomAtivo && desconto > 0) {
      linhaDesc.style.display = 'flex';
      document.getElementById('carrDescontoLabel').textContent = `Cupom ${cupomAtivo.codigo}`;
      document.getElementById('carrDescontoValor').textContent = `− ${fmt(desconto)}`;
    } else {
      if (linhaDesc) linhaDesc.style.display = 'none';
    }

    if (footer) footer.style.display = 'block';

    // Renderiza botões nos cards com estado atual
    atualizarBotoesCards();
  }

  function atualizarBotoesCards() {
    document.querySelectorAll('.btn-add-carrinho').forEach(btn => {
      const id = parseInt(btn.dataset.id);
      const noCarrinho = carrinho.some(i => i.id === id);
      if (noCarrinho) {
        btn.textContent = '✓ No carrinho';
        btn.classList.add('adicionado');
      } else {
        btn.textContent = '+ Adicionar';
        btn.classList.remove('adicionado');
      }
    });
  }

  window.aplicarCupomCarr = async function () {
    const codigo = document.getElementById('inputCupomCarr')?.value.trim().toUpperCase();
    const msg    = document.getElementById('cupomMsg');
    if (!codigo || !msg) return;
    msg.textContent = 'Verificando...'; msg.className = 'carr-cupom-msg';
    try {
      const res  = await fetch(`${API}/cupom/${codigo}`);
      const data = await res.json();
      if (res.ok) {
        cupomAtivo = data;
        msg.textContent = `✓ ${data.desconto}% OFF aplicado!`;
        msg.className   = 'carr-cupom-msg ok';
      } else {
        cupomAtivo = null;
        msg.textContent = data.erro || 'Cupom inválido.';
        msg.className   = 'carr-cupom-msg erro';
      }
      renderCarrinho();
    } catch {
      msg.textContent = 'Erro ao verificar cupom.'; msg.className = 'carr-cupom-msg erro';
    }
  };

  window.finalizarCompra = function () {
    if (!carrinho.length) return;
    const { total } = calcularTotais();
    alert(`Obrigado pela compra! 🛍\nTotal: ${fmt(total)}\n\nFuncionalidade de pagamento em breve!`);
  };

  // Atualiza galeria home com botão de adicionar
  const gridHomeCar = document.querySelector('.grid-produtos');
  if (gridHomeCar) {
    const origFetch = gridHomeCar._fetchDone;
    const observer  = new MutationObserver(() => {
      gridHomeCar.querySelectorAll('.card').forEach(card => {
        if (card.querySelector('.btn-add-carrinho')) return;
        const nome   = card.querySelector('h3')?.textContent || '';
        const preco  = card.querySelector('p')?.textContent?.replace(/[^\d,]/g,'').replace(',','.') || '0';
        const imagem = card.querySelector('img')?.src || '';
        const id     = Math.abs(nome.split('').reduce((a,c) => a + c.charCodeAt(0), 0));
        const btn    = document.createElement('button');
        btn.className       = 'btn-add-carrinho';
        btn.dataset.id      = id;
        btn.textContent     = '+ Adicionar';
        btn.onclick         = () => adicionarAoCarrinho(id, nome, preco, imagem, btn);
        card.appendChild(btn);
      });
      atualizarBotoesCards();
    });
    observer.observe(gridHomeCar, { childList: true });
  }

  // Atualiza galeria coleção com botão de adicionar
  const galColecaoCar = document.getElementById('galeria-colecao-exclusiva');
  if (galColecaoCar) {
    const observer2 = new MutationObserver(() => {
      galColecaoCar.querySelectorAll('.card-produto').forEach(card => {
        if (card.querySelector('.btn-add-carrinho')) return;
        const nome   = card.querySelector('h3')?.textContent || '';
        const preco  = card.querySelector('.preco')?.textContent?.replace(/[^\d,]/g,'').replace(',','.') || '0';
        const imagem = card.querySelector('img')?.src || '';
        const id     = Math.abs(nome.split('').reduce((a,c) => a + c.charCodeAt(0), 0));
        const btn    = document.createElement('button');
        btn.className       = 'btn-add-carrinho';
        btn.dataset.id      = id;
        btn.textContent     = '+ Adicionar';
        btn.onclick         = () => adicionarAoCarrinho(id, nome, preco, imagem, btn);
        card.appendChild(btn);
      });
      atualizarBotoesCards();
    });
    observer2.observe(galColecaoCar, { childList: true });
  }

  // Outlet cards
  const galOutletCar = document.getElementById('galeriaOutlet');
  if (galOutletCar) {
    const observer3 = new MutationObserver(() => {
      galOutletCar.querySelectorAll('.outlet-card').forEach(card => {
        if (card.querySelector('.btn-add-carrinho')) return;
        const nome   = card.querySelector('.outlet-card-nome')?.textContent || '';
        const preco  = card.querySelector('.preco-outlet')?.textContent?.replace(/[^\d,]/g,'').replace(',','.') || '0';
        const imagem = card.querySelector('img')?.src || '';
        const id     = Math.abs(nome.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) + 1000;
        const btn    = document.createElement('button');
        btn.className       = 'btn-add-carrinho';
        btn.dataset.id      = id;
        btn.textContent     = '+ Adicionar';
        btn.style.marginTop = '10px';
        btn.onclick         = () => adicionarAoCarrinho(id, nome, preco, imagem, btn);
        card.querySelector('.outlet-card-body')?.appendChild(btn);
      });
      atualizarBotoesCards();
    });
    observer3.observe(galOutletCar, { childList: true });
  }

  atualizarBadge();
  renderCarrinho();

});