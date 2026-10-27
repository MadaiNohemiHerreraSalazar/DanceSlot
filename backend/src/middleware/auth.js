// Exige que a requisição venha de um funcionário autenticado
const Token = require('../utils/token');
const UsuarioModel = require('../models/usuarioModel');

async function exigirLogin(req, res, next) {
  try {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    const usuarioId = Token.verificar(token);
    if (!usuarioId) return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });

    const usuario = await UsuarioModel.buscarPorId(usuarioId);
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Acesso não autorizado.' });
    }

    req.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { exigirLogin };
