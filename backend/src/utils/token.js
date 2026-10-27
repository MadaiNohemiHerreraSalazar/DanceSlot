// Token de sessão assinado com HMAC-SHA256 (formato: payload.assinatura)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas

// O segredo vem da variável SEGREDO_TOKEN ou é gerado uma vez e salvo em backend/.segredo
function carregarSegredo() {
  if (process.env.SEGREDO_TOKEN) return process.env.SEGREDO_TOKEN;
  const arquivo = path.resolve(__dirname, '../../.segredo');
  if (fs.existsSync(arquivo)) return fs.readFileSync(arquivo, 'utf8').trim();
  const novo = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(arquivo, novo, { mode: 0o600 });
  return novo;
}

const SEGREDO = carregarSegredo();

const assinar = (texto) => crypto.createHmac('sha256', SEGREDO).update(texto).digest('base64url');

function gerar(usuarioId) {
  const payload = Buffer.from(JSON.stringify({ sub: usuarioId, exp: Date.now() + DURACAO_MS })).toString('base64url');
  return `${payload}.${assinar(payload)}`;
}

// Retorna o id do usuário ou null se o token for inválido/expirado
function verificar(token) {
  if (typeof token !== 'string') return null;
  const [payload, assinatura] = token.split('.');
  if (!payload || !assinatura) return null;

  const esperada = Buffer.from(assinar(payload));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !crypto.timingSafeEqual(esperada, recebida)) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!dados.exp || dados.exp < Date.now()) return null;
    return dados.sub;
  } catch {
    return null;
  }
}

module.exports = { gerar, verificar };
