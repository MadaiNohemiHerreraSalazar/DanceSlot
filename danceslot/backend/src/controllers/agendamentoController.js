// Controller: recebe as requisições HTTP e orquestra a resposta
const AgendamentoModel = require('../models/agendamentoModel');

class AgendamentoController {
  // GET /api/agendamentos
  static listar(req, res) {
    AgendamentoModel.listarTodos((err, agendamentos) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
      }
      res.status(200).json(agendamentos);
    });
  }

  // GET /api/agendamentos/:id
  static buscarPorId(req, res) {
    const { id } = req.params;
    AgendamentoModel.buscarPorId(id, (err, agendamento) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao buscar o agendamento.' });
      }
      if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }
      res.status(200).json(agendamento);
    });
  }

  // POST /api/agendamentos
  static criar(req, res) {
    const errosValidação = AgendamentoModel.validar(req.body);
    if (errosValidação.length > 0) {
      return res.status(400).json({ erros: errosValidação });
    }

    AgendamentoModel.criar(req.body, (err, novoAgendamento) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao salvar agendamento.' });
      }
      res.status(201).json(novoAgendamento);
    });
  }

  // PUT /api/agendamentos/:id
  static atualizar(req, res) {
    const { id } = req.params;

    const errosValidação = AgendamentoModel.validar(req.body);
    if (errosValidação.length > 0) {
      return res.status(400).json({ erros: errosValidação });
    }

    AgendamentoModel.atualizar(id, req.body, (err, agendamentoAtualizado) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar agendamento.' });
      }
      if (!agendamentoAtualizado) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }
      res.status(200).json(agendamentoAtualizado);
    });
  }

  // DELETE /api/agendamentos/:id
  static excluir(req, res) {
    const { id } = req.params;
    AgendamentoModel.excluir(id, (err, encontrado) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao excluir agendamento.' });
      }
      if (!encontrado) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }
      res.status(204).send(); // Sucesso, sem conteúdo
    });
  }
}

module.exports = AgendamentoController;