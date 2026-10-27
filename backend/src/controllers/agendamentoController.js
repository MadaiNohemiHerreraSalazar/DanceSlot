// Controller: recebe as requisições HTTP e orquestra a resposta
const AgendamentoModel = require('../models/agendamentoModel');
const SalaModel = require('../models/salaModel');

const FORMATO_DIA = /^\d{4}-\d{2}-\d{2}$/;

const hora = (dataHora) => `${Number(dataHora.slice(11, 13))}h`;

function mensagemConflito(conflito) {
  return (
    `${conflito.sala_nome} já está reservada das ${hora(conflito.data_hora_inicio)} ` +
    `às ${hora(conflito.data_hora_fim)} por ${conflito.professor_nome}. Escolha outro horário ou outra sala.`
  );
}

// Dados que o professor pode enviar (o dono da reserva sempre vem do login)
function extrairDados(body) {
  const b = body || {};
  return {
    titulo: b.titulo,
    sala_id: typeof b.sala_id === 'string' && b.sala_id.trim() !== '' ? Number(b.sala_id) : b.sala_id,
    data_hora_inicio: b.data_hora_inicio,
    data_hora_fim: b.data_hora_fim,
  };
}

// Adiciona o campo "minha" para o frontend saber o que o usuário pode editar
const marcarDono = (usuarioId) => (a) => ({ ...a, minha: a.usuario_id === usuarioId });

class AgendamentoController {
  // GET /api/agendamentos?de=AAAA-MM-DD&ate=AAAA-MM-DD
  static async listar(req, res, next) {
    try {
      const { de, ate } = req.query;
      if (!FORMATO_DIA.test(de || '') || !FORMATO_DIA.test(ate || '')) {
        return res.status(400).json({ erro: 'Informe as datas "de" e "ate" no formato AAAA-MM-DD.' });
      }
      const itens = await AgendamentoModel.listar({ de, ate });
      res.status(200).json(itens.map(marcarDono(req.usuario.id)));
    } catch (err) {
      next(err);
    }
  }

  // GET /api/agendamentos/minhas
  static async listarMinhas(req, res, next) {
    try {
      const itens = await AgendamentoModel.listarFuturasDoUsuario(req.usuario.id);
      res.status(200).json(itens.map(marcarDono(req.usuario.id)));
    } catch (err) {
      next(err);
    }
  }

  // POST /api/agendamentos
  static async criar(req, res, next) {
    try {
      const dados = extrairDados(req.body);
      const erros = AgendamentoModel.validar(dados);
      if (erros.length > 0) return res.status(400).json({ erros });

      if (!(await SalaModel.buscarPorId(dados.sala_id))) {
        return res.status(400).json({ erros: ['Sala não encontrada.'] });
      }

      const novo = await AgendamentoModel.criar(req.usuario.id, dados);
      if (!novo) {
        const conflito = await AgendamentoModel.buscarConflito(dados);
        return res.status(409).json({
          erro: conflito ? mensagemConflito(conflito) : 'Esse horário acabou de ser reservado.',
        });
      }
      res.status(201).json(marcarDono(req.usuario.id)(novo));
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/agendamentos/:id  (somente o dono da reserva)
  static async atualizar(req, res, next) {
    try {
      const id = Number(req.params.id);
      const existente = await AgendamentoModel.buscarPorId(id);
      if (!existente) return res.status(404).json({ erro: 'Reserva não encontrada.' });
      if (existente.usuario_id !== req.usuario.id) {
        return res.status(403).json({ erro: 'Você só pode alterar as suas próprias reservas.' });
      }
      if (existente.data_hora_fim <= AgendamentoModel.horaAtual()) {
        return res.status(400).json({ erro: 'Reservas que já terminaram não podem ser alteradas.' });
      }

      const dados = extrairDados(req.body);
      const erros = AgendamentoModel.validar(dados);
      if (erros.length > 0) return res.status(400).json({ erros });

      if (!(await SalaModel.buscarPorId(dados.sala_id))) {
        return res.status(400).json({ erros: ['Sala não encontrada.'] });
      }

      const atualizado = await AgendamentoModel.atualizar(id, dados);
      if (!atualizado) {
        const conflito = await AgendamentoModel.buscarConflito({ ...dados, ignorarId: id });
        return res.status(409).json({
          erro: conflito ? mensagemConflito(conflito) : 'Esse horário acabou de ser reservado.',
        });
      }
      res.status(200).json(marcarDono(req.usuario.id)(atualizado));
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/agendamentos/:id  (somente o dono da reserva)
  static async excluir(req, res, next) {
    try {
      const id = Number(req.params.id);
      const existente = await AgendamentoModel.buscarPorId(id);
      if (!existente) return res.status(404).json({ erro: 'Reserva não encontrada.' });
      if (existente.usuario_id !== req.usuario.id) {
        return res.status(403).json({ erro: 'Você só pode cancelar as suas próprias reservas.' });
      }
      if (existente.data_hora_fim <= AgendamentoModel.horaAtual()) {
        return res.status(400).json({ erro: 'Reservas que já terminaram não podem ser canceladas.' });
      }
      await AgendamentoModel.excluir(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AgendamentoController;
