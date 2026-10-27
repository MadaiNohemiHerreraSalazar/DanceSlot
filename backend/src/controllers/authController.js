// Login dos funcionários (professores da companhia)
// Importa o módulo usuarioModel para usar as funções definidas nele.
const UsuarioModel = require('../models/usuarioModel');
// Importa o módulo senha para usar as funções definidas nele.
const Senha = require('../utils/senha');
// Importa o módulo token para usar as funções definidas nele.
const Token = require('../utils/token');

// Limite simples de tentativas: 5 erros seguidos bloqueiam o par IP + e-mail por 1 minuto
// Limita quantas falhas de login podem ocorrer antes do bloqueio.
const MAX_TENTATIVAS = 5;
// Define por quanto tempo novas tentativas de login ficam bloqueadas.
const BLOQUEIO_MS = 60 * 1000;
// Guarda em tentativas o resultado necessário para as próximas operações.
const tentativas = new Map();

// Hash usado só para gastar o mesmo tempo quando o e-mail não existe
// Valor usado para que um e-mail inexistente também passe pelo cálculo de senha.
const HASH_FALSO = 'a'.repeat(32) + ':' + 'b'.repeat(128);

// Agrupa os métodos de AuthController em uma mesma classe.
class AuthController {
  // POST /api/auth/login
  // Confere as credenciais e cria a sessão do usuário.
  static async login(req, res, next) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Guarda em email o resultado necessário para as próximas operações.
      const email = String((req.body && req.body.email) || '').trim().toLowerCase();
      // Guarda em senha o resultado necessário para as próximas operações.
      const senha = String((req.body && req.body.senha) || '');

      // Exige que e-mail e senha tenham sido preenchidos.
      if (!email || !senha) {
        // Responde com HTTP 400 para indicar que os dados enviados são inválidos.
        return res.status(400).json({ erro: 'Informe e-mail e senha.' });
      }

      // Combina IP e e-mail para controlar as tentativas de login.
      const chave = `${req.ip}|${email}`;
      // Recupera as falhas de login já registradas para essa combinação.
      const registro = tentativas.get(chave);
      // Confere se o período de bloqueio de tentativas ainda está valendo.
      if (registro && registro.bloqueadoAte > Date.now()) {
        // Guarda em segundos o resultado necessário para as próximas operações.
        const segundos = Math.ceil((registro.bloqueadoAte - Date.now()) / 1000);
        // Envia a resposta HTTP e encerra este caminho da função.
        return res.status(429).json({ erro: `Muitas tentativas. Tente novamente em ${segundos}s.` });
      }

      // Guarda os dados do usuário encontrado no banco.
      const usuario = await UsuarioModel.buscarPorEmail(email);
      // Guarda o resultado da comparação entre a senha informada e o hash armazenado.
      const senhaCorreta = await Senha.verificar(senha, usuario ? usuario.senha_hash : HASH_FALSO);

      // Recusa o login se a conta não existe, está inativa ou a senha não confere.
      if (!usuario || !usuario.ativo || !senhaCorreta) {
        // Guarda o contador de falhas que será atualizado.
        let atual = registro;
        // Confere a condição antes de executar o trecho seguinte.
        if (!atual || (atual.bloqueadoAte && atual.bloqueadoAte <= Date.now())) {
          atual = { falhas: 0, bloqueadoAte: 0 }; // primeira falha ou bloqueio anterior já expirou
        }
        // Executa esta instrução para concluir a etapa atual.
        atual.falhas += 1;
        // Confere a condição antes de executar o trecho seguinte.
        if (atual.falhas >= MAX_TENTATIVAS) {
          // Define o momento em que o usuário poderá tentar entrar novamente.
          atual.bloqueadoAte = Date.now() + BLOQUEIO_MS;
          // Incrementa o controle de tentativas de login que deram errado.
          atual.falhas = 0;
        }
        // Chama set para concluir esta etapa.
        tentativas.set(chave, atual);
        // Responde com HTTP 401 porque o acesso não foi autorizado.
        return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
      }

      // Remove a informação indicada do armazenamento local.
      tentativas.delete(chave);
      // Define o código HTTP e envia o resultado ao navegador.
      res.status(200).json({
        // Define o campo token, usado para guardar token necessário para manter a sessão.
        token: Token.gerar(usuario.id),
        // Define o campo usuario, usado para guardar dados básicos do usuário conectado.
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      });
    } catch (err) {
      // Entrega o erro ao middleware central do Express.
      next(err);
    }
  }

  // GET /api/auth/me
  // Retorna os dados do usuário autenticado.
  static me(req, res) {
    // Define o código HTTP e envia o resultado ao navegador.
    res.status(200).json({ usuario: req.usuario });
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = AuthController;
