// Login dos funcionários (professores da companhia)
const UsuarioModel = require('../models/usuarioModel');
const Senha = require('../utils/senha');
const Token = require('../utils/token');

// Limite simples de tentativas: 5 erros seguidos bloqueiam o par IP + e-mail por 1 minuto
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 60 * 1000;
const tentativas = new Map();

// Hash usado só para gastar o mesmo tempo quando o e-mail não existe
const HASH_FALSO = 'a'.repeat(32) + ':' + 'b'.repeat(128);

class AuthController {
  // POST /api/auth/login
  static async login(req, res, next) {
    try {
      const email = String((req.body && req.body.email) || '').trim().toLowerCase();
      const senha = String((req.body && req.body.senha) || '');

      if (!email || !senha) {
        return res.status(400).json({ erro: 'Informe e-mail e senha.' });
      }

      const chave = `${req.ip}|${email}`;
      const registro = tentativas.get(chave);
      if (registro && registro.bloqueadoAte > Date.now()) {
        const segundos = Math.ceil((registro.bloqueadoAte - Date.now()) / 1000);
        return res.status(429).json({ erro: `Muitas tentativas. Tente novamente em ${segundos}s.` });
      }

      const usuario = await UsuarioModel.buscarPorEmail(email);
      const senhaCorreta = await Senha.verificar(senha, usuario ? usuario.senha_hash : HASH_FALSO);

      if (!usuario || !usuario.ativo || !senhaCorreta) {
        let atual = registro;
        if (!atual || (atual.bloqueadoAte && atual.bloqueadoAte <= Date.now())) {
          atual = { falhas: 0, bloqueadoAte: 0 }; // primeira falha ou bloqueio anterior já expirou
        }
        atual.falhas += 1;
        if (atual.falhas >= MAX_TENTATIVAS) {
          atual.bloqueadoAte = Date.now() + BLOQUEIO_MS;
          atual.falhas = 0;
        }
        tentativas.set(chave, atual);
        return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
      }

      tentativas.delete(chave);
      res.status(200).json({
        token: Token.gerar(usuario.id),
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/me
  static me(req, res) {
    res.status(200).json({ usuario: req.usuario });
  }
}

module.exports = AuthController;
