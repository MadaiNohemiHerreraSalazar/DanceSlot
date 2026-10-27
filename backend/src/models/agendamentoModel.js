// Regras de negócio das reservas e acesso ao banco
const { run, get, all } = require('../config/database');

// A companhia funciona todos os dias, das 6h às 23h
const ABERTURA = 6;
const FECHAMENTO = 23;

const FORMATO_DATA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/;

const pad = (n) => String(n).padStart(2, '0');

// Início da hora atual no formato 'YYYY-MM-DDTHH:00' (horário do servidor)
function horaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function dataValida(ano, mes, dia) {
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

// Colunas devolvidas ao frontend (com nome da sala e do professor)
const SELECT_COMPLETO = `
  SELECT a.id, a.sala_id, s.nome AS sala_nome, a.usuario_id, u.nome AS professor_nome,
         a.titulo, a.data_hora_inicio, a.data_hora_fim
  FROM agendamentos a
  JOIN salas s ON s.id = a.sala_id
  JOIN usuarios u ON u.id = a.usuario_id
`;

// Condição de choque: existe reserva na mesma sala cujo intervalo se sobrepõe ao pedido.
// Parâmetros: sala_id, fim, inicio, id a ignorar (0 quando é uma reserva nova)
const SQL_CONFLITO = `
  SELECT 1 FROM agendamentos
  WHERE sala_id = ? AND data_hora_inicio < ? AND data_hora_fim > ? AND id != ?
`;

class AgendamentoModel {
  static validar(dados) {
    const erros = [];
    const { titulo, sala_id, data_hora_inicio: inicio, data_hora_fim: fim } = dados || {};

    if (typeof titulo !== 'string' || titulo.trim().length < 2) {
      erros.push('Informe o título da aula ou ensaio (mínimo 2 caracteres).');
    } else if (titulo.trim().length > 80) {
      erros.push('O título pode ter no máximo 80 caracteres.');
    }

    if (!Number.isInteger(sala_id)) {
      erros.push('Escolha uma sala.');
    }

    const mInicio = typeof inicio === 'string' ? inicio.match(FORMATO_DATA_HORA) : null;
    const mFim = typeof fim === 'string' ? fim.match(FORMATO_DATA_HORA) : null;
    if (!mInicio || !mFim) {
      erros.push('Início e término devem estar no formato AAAA-MM-DDTHH:00 (horas cheias).');
      return erros;
    }

    const [, ano, mes, dia, horaIni] = mInicio.map(Number);
    const horaFim = Number(mFim[4]);

    if (!dataValida(ano, mes, dia)) {
      erros.push('Data inválida.');
      return erros;
    }
    if (inicio.slice(0, 10) !== fim.slice(0, 10)) {
      erros.push('A reserva deve começar e terminar no mesmo dia.');
      return erros;
    }
    if (horaIni < ABERTURA || horaFim > FECHAMENTO) {
      erros.push(`A companhia funciona das ${ABERTURA}h às ${FECHAMENTO}h. Escolha um horário dentro desse período.`);
    }
    if (horaFim <= horaIni) {
      erros.push('O término deve ser depois do início.');
    }
    if (inicio < horaAtual()) {
      erros.push('Não é possível reservar um horário que já passou.');
    }

    return erros;
  }

  static listar({ de, ate }) {
    return all(
      `${SELECT_COMPLETO} WHERE substr(a.data_hora_inicio, 1, 10) BETWEEN ? AND ? ORDER BY a.data_hora_inicio, s.id`,
      [de, ate]
    );
  }

  static listarFuturasDoUsuario(usuarioId) {
    return all(`${SELECT_COMPLETO} WHERE a.usuario_id = ? AND a.data_hora_fim > ? ORDER BY a.data_hora_inicio`, [
      usuarioId,
      horaAtual(),
    ]);
  }

  static buscarPorId(id) {
    return get(`${SELECT_COMPLETO} WHERE a.id = ?`, [id]);
  }

  // Reserva que está bloqueando o horário pedido (para montar a mensagem de erro)
  static buscarConflito({ sala_id, data_hora_inicio, data_hora_fim, ignorarId = 0 }) {
    return get(
      `${SELECT_COMPLETO} WHERE a.sala_id = ? AND a.data_hora_inicio < ? AND a.data_hora_fim > ? AND a.id != ? ORDER BY a.data_hora_inicio LIMIT 1`,
      [sala_id, data_hora_fim, data_hora_inicio, ignorarId]
    );
  }

  // Insere somente se não houver choque. Verificação e inserção acontecem na mesma
  // instrução SQL, então duas pessoas reservando ao mesmo tempo não passam juntas.
  // Retorna o agendamento criado ou null se o horário já estiver ocupado.
  static async criar(usuarioId, dados) {
    const { sala_id, data_hora_inicio, data_hora_fim } = dados;
    const { lastID, changes } = await run(
      `INSERT INTO agendamentos (sala_id, usuario_id, titulo, data_hora_inicio, data_hora_fim)
       SELECT ?, ?, ?, ?, ?
       WHERE NOT EXISTS (${SQL_CONFLITO})`,
      [sala_id, usuarioId, dados.titulo.trim(), data_hora_inicio, data_hora_fim, sala_id, data_hora_fim, data_hora_inicio, 0]
    );
    return changes > 0 ? AgendamentoModel.buscarPorId(lastID) : null;
  }

  // Atualiza somente se não houver choque com outra reserva. Retorna null se houver.
  static async atualizar(id, dados) {
    const { sala_id, data_hora_inicio, data_hora_fim } = dados;
    const { changes } = await run(
      `UPDATE agendamentos
       SET sala_id = ?, titulo = ?, data_hora_inicio = ?, data_hora_fim = ?
       WHERE id = ? AND NOT EXISTS (${SQL_CONFLITO})`,
      [sala_id, dados.titulo.trim(), data_hora_inicio, data_hora_fim, id, sala_id, data_hora_fim, data_hora_inicio, id]
    );
    return changes > 0 ? AgendamentoModel.buscarPorId(id) : null;
  }

  static async excluir(id) {
    const { changes } = await run('DELETE FROM agendamentos WHERE id = ?', [id]);
    return changes > 0;
  }
}

AgendamentoModel.ABERTURA = ABERTURA;
AgendamentoModel.FECHAMENTO = FECHAMENTO;
AgendamentoModel.horaAtual = horaAtual;

module.exports = AgendamentoModel;
