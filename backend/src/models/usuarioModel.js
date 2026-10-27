const { run, get, all } = require('../config/database');

class UsuarioModel {
  static buscarPorId(id) {
    return get('SELECT id, nome, email, ativo FROM usuarios WHERE id = ?', [id]);
  }

  static buscarPorEmail(email) {
    return get('SELECT * FROM usuarios WHERE email = ?', [email]);
  }

  static async criar({ nome, email, senhaHash }) {
    const { lastID } = await run('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', [
      nome,
      email,
      senhaHash,
    ]);
    return UsuarioModel.buscarPorId(lastID);
  }

  static async definirAtivo(email, ativo) {
    const { changes } = await run('UPDATE usuarios SET ativo = ? WHERE email = ?', [ativo ? 1 : 0, email]);
    return changes > 0;
  }

  static listar() {
    return all('SELECT id, nome, email, ativo FROM usuarios ORDER BY nome');
  }
}

module.exports = UsuarioModel;
