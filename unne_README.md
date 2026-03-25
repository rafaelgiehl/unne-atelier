# UNNE Atelier — Integração com Banco de Dados

## Estrutura de arquivos

```
unne/
├── index.html
├── produtos.html
├── personalizar.html
├── contato.html
├── unidades.html
├── style.css          ← atualizado (adicionado .card-loja)
├── script.js          ← atualizado (integrado com a API)
├── images/
│   └── ...
└── api/
    ├── db.sql         ← rode no MySQL primeiro
    └── server.js      ← backend Node.js
```

---

## Passo a passo para rodar

### 1. Banco de dados
Abra o MySQL e execute:
```sql
source /caminho/para/api/db.sql
```
Isso cria o banco `unne_db` com todas as tabelas e dados iniciais.

### 2. Backend (API)
```bash
cd api
npm install express mysql2 cors
```
Edite a senha do banco em `server.js` (linha com `'sua_senha'`), depois:
```bash
node server.js
```
A API estará rodando em `http://localhost:3000`.

### 3. Site
Abra `index.html` diretamente no navegador **ou** acesse via `http://localhost:3000`.

---

## O que foi integrado

| Página | O que mudou |
|---|---|
| `index.html` | Cards de destaques carregados do banco (`/api/produtos?destaque=1`) |
| `produtos.html` | Galeria completa carregada do banco (`/api/produtos`) |
| `unidades.html` | Lojas carregadas do banco (`/api/unidades`) |
| `contato.html` | Formulário salva mensagem no banco (`POST /api/contato`) |
| `index.html` | Cupom validado no banco (`/api/cupom/COURO2026`) |

---

## Fallback offline
Todos os dados têm fallback: se a API não estiver rodando, o site exibe os conteúdos estáticos originais do HTML (produtos da home, texto das lojas, etc).

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/produtos` | Lista todos os produtos |
| GET | `/api/produtos?destaque=1` | Só os destaques da home |
| GET | `/api/cupom/:codigo` | Valida um cupom |
| GET | `/api/unidades` | Lista as lojas |
| POST | `/api/contato` | Salva mensagem de contato |
