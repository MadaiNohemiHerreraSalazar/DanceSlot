// Exige que a requisição venha de um funcionário autenticado
// Importa o módulo token para usar as funções definidas nele.
const Token = require('../utils/token');
// Importa o módulo usuarioModel para usar as funções definidas nele.
const UsuarioModel = require('../models/usuarioModel');

// Verifica o token antes de liberar uma rota protegida.
async function exigirLogin(req, res, next) {
  // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
  try {
    // Lê o cabeçalho de autorização enviado pelo navegador.
    const cabecalho = req.headers.authorization || '';
    // Extrai o token de sessão enviado no cabeçalho HTTP.
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    // Guarda o id do usuário identificado pelo token.
    const usuarioId = Token.verificar(token);
    // Rejeita a requisição quando o token não identifica uma sessão válida.
    if (!usuarioId) return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });

    // Guarda os dados do usuário encontrado no banco.
    const usuario = await UsuarioModel.buscarPorId(usuarioId);
    // Impede o acesso se o usuário foi removido ou desativado.
    if (!usuario || !usuario.ativo) {
      // Responde com HTTP 401 porque o acesso não foi autorizado.
      return res.status(401).json({ erro: 'Acesso não autorizado.' });
    }

    // Atualiza req.usuario com o valor necessário para a próxima renderização.
    req.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email };
    // Entrega o erro ao middleware central do Express.
    next();
  } catch (err) {
    // Entrega o erro ao middleware central do Express.
    next(err);
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = { exigirLogin };
