// Model responsável pelas validações de negócio e operações no Banco de Dados
const db = require('../config/database');

class AgendamentoModel {
  // Valida os dados de entrada do agendamento
  static validar(dados) {
    const erros = [];

    if (!dados.titulo || dados.titulo.trim().length < 2) {
      erros.push('O título da aula/ensaio é obrigatório e deve ter pelo menos 2 caracteres.');
    }
    if (!dados.dancarino_responsavel || dados.dancarino_responsavel.trim().length < 2) {
      erros.push('O nome do responsável é obrigatório.');
    }
    if (!dados.data_hora_inicio) {
      erros.push('A data/hora de início é obrigatória.');
    }
    if (!dados.data_hora_fim) {
      erros.push('A data/hora de término é obrigatória.');
    }
    if (dados.data_hora_inicio && dados.data_hora_fim) {
      if (new Date(dados.data_hora_inicio) >= new Date(dados.data_hora_fim)) {
        erros.push('A data/hora final deve ser posterior à data/hora inicial.');
      }
    }

    return erros;
  }

  // Busca todos os agendamentos ordenados por data
  static listarTodos(callback) {
    const sql = `SELECT * FROM agendamentos ORDER BY data_hora_inicio ASC`;
    db.all(sql, [], callback);
  }

  // Busca um agendamento específico por ID
  static buscarPorId(id, callback) {
    const sql = `SELECT * FROM agendamentos WHERE id = ?`;
    db.get(sql, [id], callback);
  }

  // Insere um novo agendamento
  static criar(dados, callback) {
    const { titulo, dancarino_responsavel, data_hora_inicio, data_hora_fim, status } = dados;
    const sql = `
      INSERT INTO agendamentos (titulo, dancarino_responsavel, data_hora_inicio, data_hora_fim, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const statusFinal = status || 'Confirmado';

    db.run(sql, [titulo, dancarino_responsavel, data_hora_inicio, data_hora_fim, statusFinal], function (err) {
      if (err) return callback(err);
      // Retorna o objeto completo recém criado
      AgendamentoModel.buscarPorId(this.lastID, callback);
    });
  }

  // Atualiza um agendamento existente
  static atualizar(id, dados, callback) {
    const { titulo, dancarino_responsavel, data_hora_inicio, data_hora_fim, status } = dados;
    const sql = `
      UPDATE agendamentos 
      SET titulo = ?, dancarino_responsavel = ?, data_hora_inicio = ?, data_hora_fim = ?, status = ?
      WHERE id = ?
    `;

    db.run(sql, [titulo, dancarino_responsavel, data_hora_inicio, data_hora_fim, status, id], function (err) {
      if (err) return callback(err);
      if (this.changes === 0) return callback(null, null); // Nenhum registro alterado
      AgendamentoModel.buscarPorId(id, callback);
    });
  }

  // Remove um agendamento por ID
  static excluir(id, callback) {
    const sql = `DELETE FROM agendamentos WHERE id = ?`;
    db.run(sql, [id], function (err) {
      if (err) return callback(err);
      callback(null, this.changes > 0);
    });
  }
}

module.exports = AgendamentoModel;