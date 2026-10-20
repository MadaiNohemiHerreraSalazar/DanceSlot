// Manipulação do DOM, gestão do formulário e atualização da lista de horários
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('agendamento-form');
  const inputId = document.getElementById('agendamento-id');
  const inputTitulo = document.getElementById('titulo');
  const inputResponsavel = document.getElementById('dancarino_responsavel');
  const inputInicio = document.getElementById('data_hora_inicio');
  const inputFim = document.getElementById('data_hora_fim');
  const selectStatus = document.getElementById('status');

  const btnSalvar = document.getElementById('btn-salvar');
  const btnCancelar = document.getElementById('btn-cancelar');
  const formTitle = document.getElementById('form-title');
  const listaContainer = document.getElementById('lista-agendamentos');
  const alerta = document.getElementById('mensagem-alerta');

  // Inicializa a listagem
  carregarAgendamentos();

  // Evento de Submit no Formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dados = {
      titulo: inputTitulo.value,
      dancarino_responsavel: inputResponsavel.value,
      data_hora_inicio: inputInicio.value,
      data_hora_fim: inputFim.value,
      status: selectStatus.value
    };

    const id = inputId.value;

    try {
      if (id) {
        await API.atualizar(id, dados);
        mostrarAlerta('Agendamento atualizado com sucesso!', 'sucesso');
      } else {
        await API.criar(dados);
        mostrarAlerta('Ensaio agendado com sucesso!', 'sucesso');
      }

      limparFormulario();
      carregarAgendamentos();
    } catch (err) {
      mostrarAlerta(err.message, 'erro');
    }
  });

  // Botão Cancelar edição
  btnCancelar.addEventListener('click', limparFormulario);

  // Função para buscar e renderizar agendamentos
  async function carregarAgendamentos() {
    try {
      const agendamentos = await API.buscarTodos();
      renderizarLista(agendamentos);
    } catch (err) {
      mostrarAlerta('Falha ao conectar com o servidor.', 'erro');
    }
  }

  // Renderiza os cards no HTML
  function renderizarLista(itens) {
    listaContainer.innerHTML = '';

    if (itens.length === 0) {
      listaContainer.innerHTML = `<p style="text-align: center; color: #777; font-size: 0.85rem;">Nenhum horário agendado.</p>`;
      return;
    }

    itens.forEach(item => {
      const inicio = new Date(item.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const fim = new Date(item.data_hora_fim).toLocaleTimeString('pt-BR', { timeStyle: 'short' });

      const card = document.createElement('div');
      card.className = 'slot-card';
      card.innerHTML = `
        <div class="slot-info">
          <h4>${item.titulo}</h4>
          <p>👤 ${item.dancarino_responsavel}</p>
          <p>⏰ ${inicio} - ${fim}</p>
          <span class="slot-badge">${item.status}</span>
        </div>
        <div class="slot-actions">
          <button class="btn-icon btn-editar" title="Editar">✏️</button>
          <button class="btn-icon btn-excluir" title="Excluir">🗑️</button>
        </div>
      `;

      // Eventos dos botões do card
      card.querySelector('.btn-editar').addEventListener('click', () => preencherParaEdicao(item));
      card.querySelector('.btn-excluir').addEventListener('click', () => deletar(item.id));

      listaContainer.appendChild(card);
    });
  }

  // Prepara o formulário para modo de Edição
  function preencherParaEdicao(item) {
    inputId.value = item.id;
    inputTitulo.value = item.titulo;
    inputResponsavel.value = item.dancarino_responsavel;
    inputInicio.value = item.data_hora_inicio;
    inputFim.value = item.data_hora_fim;
    selectStatus.value = item.status;

    formTitle.innerText = 'Editar Agendamento';
    btnSalvar.innerText = 'Atualizar';
    btnCancelar.classList.remove('hidden');
  }

  // Reseta formulário para modo de Inserção
  function limparFormulario() {
    form.reset();
    inputId.value = '';
    formTitle.innerText = 'Novo Agendamento';
    btnSalvar.innerText = 'Salvar Agendamento';
    btnCancelar.classList.add('hidden');
  }

  // Deleta agendamento
  async function deletar(id) {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        await API.excluir(id);
        mostrarAlerta('Agendamento removido.', 'sucesso');
        carregarAgendamentos();
      } catch (err) {
        mostrarAlerta(err.message, 'erro');
      }
    }
  }

  // Exibe alertas na tela
  function mostrarAlerta(msg, tipo) {
    alerta.innerText = msg;
    alerta.className = `alerta ${tipo}`;
    setTimeout(() => {
      alerta.className = 'alerta hidden';
    }, 4000);
  }
});