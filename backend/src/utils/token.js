// Token de sessão assinado com HMAC-SHA256 (formato: payload.assinatura)
// Importa módulo nativo para operações criptográficas.
const crypto = require('crypto');
// Importa módulo de leitura e escrita de arquivos.
const fs = require('fs');
// Importa módulo que ajuda a montar caminhos de arquivos.
const path = require('path');

const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas

// O segredo vem da variável SEGREDO_TOKEN ou é gerado uma vez e salvo em backend/.segredo
// Lê ou cria o segredo usado para assinar os tokens.
function carregarSegredo() {
  // Confere a condição antes de executar o trecho seguinte.
  if (process.env.SEGREDO_TOKEN) return process.env.SEGREDO_TOKEN;
  // Monta o caminho do arquivo em que o segredo pode ser salvo.
  const arquivo = path.resolve(__dirname, '../../.segredo');
  // Confere a condição antes de executar o trecho seguinte.
  if (fs.existsSync(arquivo)) return fs.readFileSync(arquivo, 'utf8').trim();
  // Gera um segredo aleatório caso ainda não exista um arquivo ou variável com segredo.
  const novo = crypto.randomBytes(32).toString('hex');
  // Chama writeFileSync para concluir esta etapa.
  fs.writeFileSync(arquivo, novo, { mode: 0o600 });
  // Devolve o valor calculado para quem chamou a função.
  return novo;
}

// Carrega o segredo que assina os tokens de sessão.
const SEGREDO = carregarSegredo();

// Cria a assinatura criptográfica usada para conferir o token.
const assinar = (texto) => crypto.createHmac('sha256', SEGREDO).update(texto).digest('base64url');

// Gera um token de sessão assinado para o usuário.
function gerar(usuarioId) {
  // Guarda a parte do token que contém os dados da sessão.
  const payload = Buffer.from(JSON.stringify({ sub: usuarioId, exp: Date.now() + DURACAO_MS })).toString('base64url');
  // Monta e devolve o texto com os valores calculados acima.
  return `${payload}.${assinar(payload)}`;
}

// Retorna o id do usuário ou null se o token for inválido/expirado
// Confere a assinatura e o prazo do token antes de aceitar a sessão.
function verificar(token) {
  // Confere a condição antes de executar o trecho seguinte.
  if (typeof token !== 'string') return null;
  // Separa o conteúdo e a assinatura do token usando o ponto como divisor.
  const [payload, assinatura] = token.split('.');
  // Confere a condição antes de executar o trecho seguinte.
  if (!payload || !assinatura) return null;

  // Calcula a assinatura correta para comparar com a recebida.
  const esperada = Buffer.from(assinar(payload));
  // Converte a assinatura enviada para poder compará-la.
  const recebida = Buffer.from(assinatura);
  // Rejeita assinaturas de tamanhos diferentes antes da comparação segura.
  if (esperada.length !== recebida.length || !crypto.timingSafeEqual(esperada, recebida)) return null;

  // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
  try {
    // Converte o conteúdo do token em objeto para consultar o id e a validade da sessão.
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    // Rejeita o token se ele já passou do horário de validade.
    if (!dados.exp || dados.exp < Date.now()) return null;
    // Devolve o valor calculado para quem chamou a função.
    return dados.sub;
  } catch {
    // Retorna null para indicar que não há um resultado válido.
    return null;
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = { gerar, verificar };
