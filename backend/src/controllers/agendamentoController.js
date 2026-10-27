// Controller: recebe as requisições HTTP e orquestra a resposta
// Importa o módulo agendamentoModel para usar as funções definidas nele.
const AgendamentoModel = require('../models/agendamentoModel');
// Importa o módulo salaModel para usar as funções definidas nele.
const SalaModel = require('../models/salaModel');

// Define o padrão aceito para uma data no formato AAAA-MM-DD.
const FORMATO_DIA = /^\d{4}-\d{2}-\d{2}$/;

// Guarda em hora o resultado necessário para as próximas operações.
const hora = (dataHora) => `${Number(dataHora.slice(11, 13))}h`;

// Monta uma mensagem explicando qual reserva ocupa o horário.
function mensagemConflito(conflito) {
  // Devolve o valor calculado para quem chamou a função.
  return (
    // Define o texto que será usado nesta resposta ou configuração.
    `${conflito.sala_nome} já está reservada das ${hora(conflito.data_hora_inicio)} ` +
    // Define o texto que será usado nesta resposta ou configuração.
    `às ${hora(conflito.data_hora_fim)} por ${conflito.professor_nome}. Escolha outro horário ou outra sala.`
  );
}

// Dados que o professor pode enviar (o dono da reserva sempre vem do login)
// Separa e normaliza os dados enviados pelo formulário.
function extrairDados(body) {
  // Usa um objeto vazio quando a requisição não envia um corpo.
  const b = body || {};
  // Devolve o valor calculado para quem chamou a função.
  return {
    // Define o campo titulo, usado para guardar nome da aula ou do ensaio.
    titulo: b.titulo,
    // Converte o id da sala para número quando ele chega como texto.
    sala_id: typeof b.sala_id === 'string' && b.sala_id.trim() !== '' ? Number(b.sala_id) : b.sala_id,
    // Define o campo data_hora_inicio, usado para guardar início da reserva.
    data_hora_inicio: b.data_hora_inicio,
    // Define o campo data_hora_fim, usado para guardar término da reserva.
    data_hora_fim: b.data_hora_fim,
  };
}

// Adiciona o campo "minha" para o frontend saber o que o usuário pode editar
// Indica quais reservas pertencem ao usuário que está conectado.
const marcarDono = (usuarioId) => (a) => ({ ...a, minha: a.usuario_id === usuarioId });

// Agrupa os métodos de AgendamentoController em uma mesma classe.
class AgendamentoController {
  // GET /api/agendamentos?de=AAAA-MM-DD&ate=AAAA-MM-DD
  // Atende à consulta da rota e devolve os registros encontrados.
  static async listar(req, res, next) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Extrai do objeto somente os campos necessários para esta etapa.
      const { de, ate } = req.query;
      // Recusa a consulta quando alguma data não está no formato AAAA-MM-DD.
      if (!FORMATO_DIA.test(de || '') || !FORMATO_DIA.test(ate || '')) {
        // Responde com HTTP 400 para indicar que os dados enviados são inválidos.
        return res.status(400).json({ erro: 'Informe as datas "de" e "ate" no formato AAAA-MM-DD.' });
      }
      // Guarda as reservas retornadas pela consulta.
      const itens = await AgendamentoModel.listar({ de, ate });
      // Define o código HTTP e envia o resultado ao navegador.
      res.status(200).json(itens.map(marcarDono(req.usuario.id)));
    } catch (err) {
      // Entrega o erro ao middleware central do Express.
      next(err);
    }
  }

  // GET /api/agendamentos/minhas
  // Busca as reservas futuras do usuário autenticado.
  static async listarMinhas(req, res, next) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Guarda as reservas retornadas pela consulta.
      const itens = await AgendamentoModel.listarFuturasDoUsuario(req.usuario.id);
      // Define o código HTTP e envia o resultado ao navegador.
      res.status(200).json(itens.map(marcarDono(req.usuario.id)));
    } catch (err) {
      // Entrega o erro ao middleware central do Express.
      next(err);
    }
  }

  // POST /api/agendamentos
  // Cria um novo registro depois de validar os dados.
  static async criar(req, res, next) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Guarda os campos que serão validados ou enviados ao banco.
      const dados = extrairDados(req.body);
      // Reúne as mensagens dos campos que não passaram na validação.
      const erros = AgendamentoModel.validar(dados);
      // Se houver erro de validação, devolve as mensagens sem salvar a reserva.
      if (erros.length > 0) return res.status(400).json({ erros });

      // Confere se a sala escolhida existe antes de criar ou editar a reserva.
      if (!(await SalaModel.buscarPorId(dados.sala_id))) {
        // Responde com HTTP 400 para indicar que os dados enviados são inválidos.
        return res.status(400).json({ erros: ['Sala não encontrada.'] });
      }

      // Guarda a reserva recém-criada, se o horário estiver livre.
      const novo = await AgendamentoModel.criar(req.usuario.id, dados);
      // Se o banco não criou a reserva, verifica se outra reserva ocupou o horário.
      if (!novo) {
        // Guarda a reserva que está ocupando o horário solicitado.
        const conflito = await AgendamentoModel.buscarConflito(dados);
        // Responde com HTTP 409 para indicar conflito com outra reserva.
        return res.status(409).json({
          // Define o campo erro, usado para guardar mensagem que explica o problema para a interface.
          erro: conflito ? mensagemConflito(conflito) : 'Esse horário acabou de ser reservado.',
        });
      }
      // Define o código HTTP e envia o resultado ao navegador.
      res.status(201).json(marcarDono(req.usuario.id)(novo));
    } catch (err) {
      // Entrega o erro ao middleware central do Express.
      next(err);
    }
  }

  // PUT /api/agendamentos/:id  (somente o dono da reserva)
  // Atualiza uma reserva já existente.
  static async atualizar(req, res, next) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Guarda o identificador da reserva que será consultada ou alterada.
      const id = Number(req.params.id);
      // Guarda a reserva encontrada antes de tentar alterá-la ou cancelá-la.
      const existente = await AgendamentoModel.buscarPorId(id);
      // Se não encontrou a reserva pelo id, responde que ela não existe.
      if (!existente) return res.status(404).json({ erro: 'Reserva não encontrada.' });
      // Impede que um usuário altere ou cancele a reserva de outra pessoa.
      if (existente.usuario_id !== req.usuario.id) {
        // Responde com HTTP 403 porque o usuário não pode realizar esta ação.
        return res.status(403).json({ erro: 'Você só pode alterar as suas próprias reservas.' });
      }
      // Impede alterações em uma reserva que já terminou.
      if (existente.data_hora_fim <= AgendamentoModel.horaAtual()) {
        // Responde com HTTP 400 para indicar que os dados enviados são inválidos.
        return res.status(400).json({ erro: 'Reservas que já terminaram não podem ser alteradas.' });
      }

      // Guarda os campos que serão validados ou enviados ao banco.
      const dados = extrairDados(req.body);
      // Reúne as mensagens dos campos que não passaram na validação.
      const erros = AgendamentoModel.validar(dados);
      // Se houver erro de validação, devolve as mensagens sem salvar a reserva.
      if (erros.length > 0) return res.status(400).json({ erros });

      // Confere se a sala escolhida existe antes de criar ou editar a reserva.
      if (!(await SalaModel.buscarPorId(dados.sala_id))) {
        // Responde com HTTP 400 para indicar que os dados enviados são inválidos.
        return res.status(400).json({ erros: ['Sala não encontrada.'] });
      }

      // Guarda a reserva depois de salvar as mudanças.
      const atualizado = await AgendamentoModel.atualizar(id, dados);
      // Confere a condição antes de executar o trecho seguinte.
      if (!atualizado) {
        // Guarda a reserva que está ocupando o horário solicitado.
        const conflito = await AgendamentoModel.buscarConflito({ ...dados, ignorarId: id });
        // Responde com HTTP 409 para indicar conflito com outra reserva.
        return res.status(409).json({
          // Define o campo erro, usado para guardar mensagem que explica o problema para a interface.
          erro: conflito ? mensagemConflito(conflito) : 'Esse horário acabou de ser reservado.',
        });
      }
      // Define o código HTTP e envia o resultado ao navegador.
      res.status(200).json(marcarDono(req.usuario.id)(atualizado));
    } catch (err) {
      // Entrega o erro ao middleware central do Express.
      next(err);
    }
  }

  // DELETE /api/agendamentos/:id  (somente o dono da reserva)
  // Apaga a reserva indicada no banco de dados.
  static async excluir(req, res, next) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Guarda o identificador da reserva que será consultada ou alterada.
      const id = Number(req.params.id);
      // Guarda a reserva encontrada antes de tentar alterá-la ou cancelá-la.
      const existente = await AgendamentoModel.buscarPorId(id);
      // Se não encontrou a reserva pelo id, responde que ela não existe.
      if (!existente) return res.status(404).json({ erro: 'Reserva não encontrada.' });
      // Impede que um usuário altere ou cancele a reserva de outra pessoa.
      if (existente.usuario_id !== req.usuario.id) {
        // Responde com HTTP 403 porque o usuário não pode realizar esta ação.
        return res.status(403).json({ erro: 'Você só pode cancelar as suas próprias reservas.' });
      }
      // Impede alterações em uma reserva que já terminou.
      if (existente.data_hora_fim <= AgendamentoModel.horaAtual()) {
        // Responde com HTTP 400 para indicar que os dados enviados são inválidos.
        return res.status(400).json({ erro: 'Reservas que já terminaram não podem ser canceladas.' });
      }
      // Espera a operação assíncrona terminar antes de continuar.
      await AgendamentoModel.excluir(id);
      // Define o código HTTP e envia o resultado ao navegador.
      res.status(204).send();
    } catch (err) {
      // Entrega o erro ao middleware central do Express.
      next(err);
    }
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = AgendamentoController;
