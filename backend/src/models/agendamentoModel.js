// Regras de negócio das reservas e acesso ao banco
// Extrai do objeto somente os campos necessários para esta etapa.
const { run, get, all } = require('../config/database');

// A companhia funciona todos os dias, das 6h às 23h
// Define a constante ABERTURA, usada como regra do sistema.
const ABERTURA = 6;
// Define a constante FECHAMENTO, usada como regra do sistema.
const FECHAMENTO = 23;

// Define o padrão aceito para data e hora cheia.
const FORMATO_DATA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/;

// Garante que números menores que 10 sejam escritos com dois dígitos.
const pad = (n) => String(n).padStart(2, '0');

// Início da hora atual no formato 'YYYY-MM-DDTHH:00' (horário do servidor)
// Define a função horaAtual, que concentra esta parte da lógica.
function horaAtual() {
  // Guarda a data usada no cálculo.
  const d = new Date();
  // Monta e devolve o texto com os valores calculados acima.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

// Confere se o dia, mês e ano formam uma data real.
function dataValida(ano, mes, dia) {
  // Guarda a data usada no cálculo.
  const d = new Date(ano, mes - 1, dia);
  // Devolve o valor calculado para quem chamou a função.
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

// Colunas devolvidas ao frontend (com nome da sala e do professor)
// Guarda a consulta que traz a reserva com o nome da sala e do professor.
const SELECT_COMPLETO = `
  SELECT a.id, a.sala_id, s.nome AS sala_nome, a.usuario_id, u.nome AS professor_nome,
         a.titulo, a.data_hora_inicio, a.data_hora_fim
  FROM agendamentos a
  JOIN salas s ON s.id = a.sala_id
  JOIN usuarios u ON u.id = a.usuario_id
`;

// Condição de choque: existe reserva na mesma sala cujo intervalo se sobrepõe ao pedido.
// Parâmetros: sala_id, fim, inicio, id a ignorar (0 quando é uma reserva nova)
// Guarda a condição SQL que identifica reservas com horários sobrepostos.
const SQL_CONFLITO = `
  SELECT 1 FROM agendamentos
  WHERE sala_id = ? AND data_hora_inicio < ? AND data_hora_fim > ? AND id != ?
`;

// Agrupa os métodos de AgendamentoModel em uma mesma classe.
class AgendamentoModel {
  // Confere os campos e as regras de horário antes de salvar.
  static validar(dados) {
    // Reúne as mensagens dos campos que não passaram na validação.
    const erros = [];
    // Extrai do objeto somente os campos necessários para esta etapa.
    const { titulo, sala_id, data_hora_inicio: inicio, data_hora_fim: fim } = dados || {};

    // Exige que o título seja um texto com pelo menos dois caracteres.
    if (typeof titulo !== 'string' || titulo.trim().length < 2) {
      // Adiciona um novo item ao final da lista.
      erros.push('Informe o título da aula ou ensaio (mínimo 2 caracteres).');
    // Verifica se o título ultrapassa o limite de 80 caracteres.
    } else if (titulo.trim().length > 80) {
      // Adiciona um novo item ao final da lista.
      erros.push('O título pode ter no máximo 80 caracteres.');
    }

    // Verifica se o id da sala é um número inteiro.
    if (!Number.isInteger(sala_id)) {
      // Adiciona um novo item ao final da lista.
      erros.push('Escolha uma sala.');
    }

    // Guarda em mInicio o resultado necessário para as próximas operações.
    const mInicio = typeof inicio === 'string' ? inicio.match(FORMATO_DATA_HORA) : null;
    // Guarda em mFim o resultado necessário para as próximas operações.
    const mFim = typeof fim === 'string' ? fim.match(FORMATO_DATA_HORA) : null;
    // Verifica se os dois horários seguem o formato exigido antes de continuar.
    if (!mInicio || !mFim) {
      // Adiciona um novo item ao final da lista.
      erros.push('Início e término devem estar no formato AAAA-MM-DDTHH:00 (horas cheias).');
      // Devolve o valor calculado para quem chamou a função.
      return erros;
    }

    // Percorre a lista e transforma cada item no formato necessário.
    const [, ano, mes, dia, horaIni] = mInicio.map(Number);
    // Guarda em horaFim o resultado necessário para as próximas operações.
    const horaFim = Number(mFim[4]);

    // Rejeita a data quando ela não existe no calendário.
    if (!dataValida(ano, mes, dia)) {
      // Adiciona um novo item ao final da lista.
      erros.push('Data inválida.');
      // Devolve o valor calculado para quem chamou a função.
      return erros;
    }
    // Confere a condição antes de executar o trecho seguinte.
    if (inicio.slice(0, 10) !== fim.slice(0, 10)) {
      // Adiciona um novo item ao final da lista.
      erros.push('A reserva deve começar e terminar no mesmo dia.');
      // Devolve o valor calculado para quem chamou a função.
      return erros;
    }
    // Confere a condição antes de executar o trecho seguinte.
    if (horaIni < ABERTURA || horaFim > FECHAMENTO) {
      // Adiciona um novo item ao final da lista.
      erros.push(`A companhia funciona das ${ABERTURA}h às ${FECHAMENTO}h. Escolha um horário dentro desse período.`);
    }
    // Garante que o término seja depois do início.
    if (horaFim <= horaIni) {
      // Adiciona um novo item ao final da lista.
      erros.push('O término deve ser depois do início.');
    }
    // Impede criar uma reserva em um horário que já passou.
    if (inicio < horaAtual()) {
      // Adiciona um novo item ao final da lista.
      erros.push('Não é possível reservar um horário que já passou.');
    }

    // Devolve o valor calculado para quem chamou a função.
    return erros;
  }

  // Busca os registros que precisam aparecer na resposta.
  static listar({ de, ate }) {
    // Devolve o valor calculado para quem chamou a função.
    return all(
      // Define o texto que será usado nesta resposta ou configuração.
      `${SELECT_COMPLETO} WHERE substr(a.data_hora_inicio, 1, 10) BETWEEN ? AND ? ORDER BY a.data_hora_inicio, s.id`,
      [de, ate]
    );
  }

  // Define o método listarFuturasDoUsuario desta classe.
  static listarFuturasDoUsuario(usuarioId) {
    // Devolve o valor calculado para quem chamou a função.
    return all(`${SELECT_COMPLETO} WHERE a.usuario_id = ? AND a.data_hora_fim > ? ORDER BY a.data_hora_inicio`, [
      usuarioId,
      horaAtual(),
    ]);
  }

  // Busca um registro pelo seu identificador.
  static buscarPorId(id) {
    // Devolve o valor calculado para quem chamou a função.
    return get(`${SELECT_COMPLETO} WHERE a.id = ?`, [id]);
  }

  // Reserva que está bloqueando o horário pedido (para montar a mensagem de erro)
  // Procura uma reserva que se sobreponha ao horário solicitado.
  static buscarConflito({ sala_id, data_hora_inicio, data_hora_fim, ignorarId = 0 }) {
    // Devolve o valor calculado para quem chamou a função.
    return get(
      // Define o texto que será usado nesta resposta ou configuração.
      `${SELECT_COMPLETO} WHERE a.sala_id = ? AND a.data_hora_inicio < ? AND a.data_hora_fim > ? AND a.id != ? ORDER BY a.data_hora_inicio LIMIT 1`,
      [sala_id, data_hora_fim, data_hora_inicio, ignorarId]
    );
  }

  // Insere somente se não houver choque. Verificação e inserção acontecem na mesma
  // instrução SQL, então duas pessoas reservando ao mesmo tempo não passam juntas.
  // Retorna o agendamento criado ou null se o horário já estiver ocupado.
  // Grava uma nova reserva no banco, desde que o horário esteja livre.
  static async criar(usuarioId, dados) {
    // Extrai do objeto somente os campos necessários para esta etapa.
    const { sala_id, data_hora_inicio, data_hora_fim } = dados;
    // Espera a operação assíncrona terminar antes de continuar.
    const { lastID, changes } = await run(
      // Define o texto que será usado nesta resposta ou configuração.
      `INSERT INTO agendamentos (sala_id, usuario_id, titulo, data_hora_inicio, data_hora_fim)
       SELECT ?, ?, ?, ?, ?
       WHERE NOT EXISTS (${SQL_CONFLITO})`,
      // Passa os dados da reserva e os valores usados para verificar conflito de horário.
      [sala_id, usuarioId, dados.titulo.trim(), data_hora_inicio, data_hora_fim, sala_id, data_hora_fim, data_hora_inicio, 0]
    );
    // Retorna null para indicar que não há um resultado válido.
    return changes > 0 ? AgendamentoModel.buscarPorId(lastID) : null;
  }

  // Atualiza somente se não houver choque com outra reserva. Retorna null se houver.
  // Altera os dados da reserva sem permitir choque com outra reserva.
  static async atualizar(id, dados) {
    // Extrai do objeto somente os campos necessários para esta etapa.
    const { sala_id, data_hora_inicio, data_hora_fim } = dados;
    // Espera a operação assíncrona terminar antes de continuar.
    const { changes } = await run(
      // Define o texto que será usado nesta resposta ou configuração.
      `UPDATE agendamentos
       SET sala_id = ?, titulo = ?, data_hora_inicio = ?, data_hora_fim = ?
       WHERE id = ? AND NOT EXISTS (${SQL_CONFLITO})`,
      // Passa os novos dados da reserva e o id que deve ser ignorado na verificação de conflito.
      [sala_id, dados.titulo.trim(), data_hora_inicio, data_hora_fim, id, sala_id, data_hora_fim, data_hora_inicio, id]
    );
    // Retorna null para indicar que não há um resultado válido.
    return changes > 0 ? AgendamentoModel.buscarPorId(id) : null;
  }

  // Apaga a reserva indicada no banco de dados.
  static async excluir(id) {
    // Espera a operação assíncrona terminar antes de continuar.
    const { changes } = await run('DELETE FROM agendamentos WHERE id = ?', [id]);
    // Devolve o valor calculado para quem chamou a função.
    return changes > 0;
  }
}

// Atualiza AgendamentoModel.ABERTURA com o resultado desta expressão.
AgendamentoModel.ABERTURA = ABERTURA;
// Atualiza AgendamentoModel.FECHAMENTO com o resultado desta expressão.
AgendamentoModel.FECHAMENTO = FECHAMENTO;
// Atualiza AgendamentoModel.horaAtual com o resultado desta expressão.
AgendamentoModel.horaAtual = horaAtual;

// Permite que os outros arquivos importem esta função ou classe.
module.exports = AgendamentoModel;
