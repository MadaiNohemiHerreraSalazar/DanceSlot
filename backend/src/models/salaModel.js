// Extrai do objeto somente os campos necessários para esta etapa.
const { get, all } = require('../config/database');

// Agrupa os métodos de SalaModel em uma mesma classe.
class SalaModel {
  // Busca os registros que precisam aparecer na resposta.
  static listar() {
    // Devolve o valor calculado para quem chamou a função.
    return all('SELECT id, nome, descricao, capacidade FROM salas ORDER BY id');
  }

  // Busca um registro pelo seu identificador.
  static buscarPorId(id) {
    // Devolve o valor calculado para quem chamou a função.
    return get('SELECT id, nome, descricao, capacidade FROM salas WHERE id = ?', [id]);
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = SalaModel;
