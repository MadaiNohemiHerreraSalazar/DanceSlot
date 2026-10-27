// Hash de senhas com scrypt (nativo do Node, sem dependências extras)
// Importa módulo nativo para operações criptográficas.
const crypto = require('crypto');
// Extrai do objeto somente os campos necessários para esta etapa.
const { promisify } = require('util');

// Adapta o cálculo de hash para funcionar com async/await.
const scrypt = promisify(crypto.scrypt);

// Transforma a senha em um hash para não guardar a senha original.
async function gerarHash(senha) {
  // Gera o valor aleatório que será combinado com a senha no hash.
  const salt = crypto.randomBytes(16).toString('hex');
  // Guarda o hash da senha, sem precisar armazenar a senha original.
  const hash = (await scrypt(senha, salt, 64)).toString('hex');
  // Monta e devolve o texto com os valores calculados acima.
  return `${salt}:${hash}`;
}

// Compara a senha informada com o hash guardado no banco.
async function verificar(senha, armazenado) {
  // Separa os valores da lista para usar cada um individualmente.
  const [salt, hash] = String(armazenado).split(':');
  // Confere a condição antes de executar o trecho seguinte.
  if (!salt || !hash) return false;
  // Guarda em calculado o resultado necessário para as próximas operações.
  const calculado = await scrypt(senha, salt, 64);
  // Guarda em esperado o resultado necessário para as próximas operações.
  const esperado = Buffer.from(hash, 'hex');
  // Devolve o valor calculado para quem chamou a função.
  return esperado.length === calculado.length && crypto.timingSafeEqual(calculado, esperado);
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = { gerarHash, verificar };
