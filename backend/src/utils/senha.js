// Hash de senhas com scrypt (nativo do Node, sem dependências extras)
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function gerarHash(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(senha, salt, 64)).toString('hex');
  return `${salt}:${hash}`;
}

async function verificar(senha, armazenado) {
  const [salt, hash] = String(armazenado).split(':');
  if (!salt || !hash) return false;
  const calculado = await scrypt(senha, salt, 64);
  const esperado = Buffer.from(hash, 'hex');
  return esperado.length === calculado.length && crypto.timingSafeEqual(calculado, esperado);
}

module.exports = { gerarHash, verificar };
