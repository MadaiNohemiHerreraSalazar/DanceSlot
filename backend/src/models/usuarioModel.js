// Extrai do objeto somente os campos necessários para esta etapa.
const { run, get, all } = require('../config/database');

// Agrupa os métodos de UsuarioModel em uma mesma classe.
class UsuarioModel {
  // Busca um registro pelo seu identificador.
  static buscarPorId(id) {
    // Devolve o valor calculado para quem chamou a função.
    return get('SELECT id, nome, email, ativo FROM usuarios WHERE id = ?', [id]);
  }

  // Procura o usuário pelo e-mail informado.
  static buscarPorEmail(email) {
    // Devolve o valor calculado para quem chamou a função.
    return get('SELECT * FROM usuarios WHERE email = ?', [email]);
  }

  // Grava uma nova reserva no banco, desde que o horário esteja livre.
  static async criar({ nome, email, senhaHash }) {
    // Espera a operação assíncrona terminar antes de continuar.
    const { lastID } = await run('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', [
      nome,
      email,
      senhaHash,
    ]);
    // Devolve o valor calculado para quem chamou a função.
    return UsuarioModel.buscarPorId(lastID);
  }

  // Ativa ou desativa o acesso de um usuário.
  static async definirAtivo(email, ativo) {
    // Espera a operação assíncrona terminar antes de continuar.
    const { changes } = await run('UPDATE usuarios SET ativo = ? WHERE email = ?', [ativo ? 1 : 0, email]);
    // Devolve o valor calculado para quem chamou a função.
    return changes > 0;
  }

  // Busca os registros que precisam aparecer na resposta.
  static listar() {
    // Devolve o valor calculado para quem chamou a função.
    return all('SELECT id, nome, email, ativo FROM usuarios ORDER BY nome');
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = UsuarioModel;
