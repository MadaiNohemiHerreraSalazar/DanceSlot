const { get, all } = require('../config/database');

class SalaModel {
  static listar() {
    return all('SELECT id, nome, descricao, capacidade FROM salas ORDER BY id');
  }

  static buscarPorId(id) {
    return get('SELECT id, nome, descricao, capacidade FROM salas WHERE id = ?', [id]);
  }
}

module.exports = SalaModel;
