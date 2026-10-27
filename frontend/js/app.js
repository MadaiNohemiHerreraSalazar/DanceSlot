// Interface do DanceSlot: login, agenda por sala/horário e reservas do professor.
// Mantém as variáveis da interface isoladas para não criar nomes globais.
(() => {
  const ABERTURA = 6;     // a companhia abre às 6h
  const FECHAMENTO = 23;  // e fecha às 23h (última reserva termina às 23h)
  // Define a constante DIAS_SEMANA, usada como regra do sistema.
  const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  // Cria um atalho para localizar elementos da página pelo id.
  const $ = (id) => document.getElementById(id);
  const el = $; // atalho semântico para leitura
  // Garante que números menores que 10 sejam escritos com dois dígitos.
  const pad = (n) => String(n).padStart(2, '0');

  // Guarda os dados que a interface precisa manter enquanto é usada.
  const estado = {
    // Define o campo usuario, usado para guardar dados básicos do usuário conectado.
    usuario: null,
    // Define o campo salas usado neste objeto.
    salas: [],
    dia: hojeISO(),           // AAAA-MM-DD exibido na agenda
    reservas: [],             // reservas do dia exibido
    salaAtiva: null,          // sala exibida no celular
    // Define o campo visao usado neste objeto.
    visao: 'agenda',
  };

  // Permite saber quando a tela está no tamanho de celular.
  const mobile = window.matchMedia('(max-width: 760px)');

  /* ---------------- datas e formatação ---------------- */
  // Converte uma data para o formato AAAA-MM-DD.
  function paraISO(d) {
    // Monta e devolve o texto com os valores calculados acima.
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // Retorna a data de hoje no formato usado pela API.
  function hojeISO() { return paraISO(new Date()); }
  // new Date('AAAA-MM-DD') usa UTC e pode voltar um dia; aqui o dia é sempre local
  // Monta uma data local a partir do texto AAAA-MM-DD.
  function deISO(iso) {
    // Percorre a lista e transforma cada item no formato necessário.
    const [a, m, d] = iso.split('-').map(Number);
    // Devolve o objeto de data montado com ano, mês e dia.
    return new Date(a, m - 1, d);
  }
  // Calcula uma data alguns dias antes ou depois da data recebida.
  function somarDias(iso, n) {
    // Guarda a data usada no cálculo.
    const d = deISO(iso);
    // Atualiza o dia do objeto de data.
    d.setDate(d.getDate() + n);
    // Devolve o valor calculado para quem chamou a função.
    return paraISO(d);
  }
  // Extrai a hora de um texto de data e hora.
  const horaDe = (dataHora) => Number(dataHora.slice(11, 13));
  // Transforma o número da hora no texto mostrado na tela.
  const rotuloHora = (h) => `${h}h`;
  // Junta o dia e a hora no formato aceito pela API.
  const dataHora = (dia, h) => `${dia}T${pad(h)}:00`;

  // Retorna a hora atual arredondada para o início da hora.
  function horaAtualISO() {
    // Guarda a data usada no cálculo.
    const d = new Date();
    // Monta e devolve o texto com os valores calculados acima.
    return `${paraISO(d)}T${pad(d.getHours())}:00`;
  }

  // Monta o nome completo do dia para mostrar na agenda.
  function tituloDoDia(iso) {
    // Guarda o nome do dia já formatado para exibição.
    const txt = deISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    // Devolve o valor calculado para quem chamou a função.
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }
  // Formata a data para aparecer de forma compacta.
  function dataCurta(iso) {
    // Devolve o valor calculado para quem chamou a função.
    return deISO(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  /* ---------------- criação segura de elementos (sem innerHTML) ---------------- */
  // Cria um elemento HTML e configura os atributos e o conteúdo dele.
  function criar(tag, atributos = {}, ...filhos) {
    // Cria ou recebe a referência ao elemento HTML que está sendo manipulado.
    const e = document.createElement(tag);
    // Repete o trecho para cada item da lista ou intervalo.
    for (const [k, v] of Object.entries(atributos)) {
      // Ignora atributos que foram definidos como falso ou que não receberam valor.
      if (v === false || v == null) continue;
      // Confere a condição antes de executar o trecho seguinte.
      if (k === 'class') e.className = v;
      // Confere a condição antes de executar o trecho seguinte.
      else if (k === 'dataset') Object.assign(e.dataset, v);
      // Confere a condição antes de executar o trecho seguinte.
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      // Executa esta instrução para concluir a etapa atual.
      else e.setAttribute(k, v === true ? '' : v);
    }
    // Coloca o elemento dentro do contêiner da página.
    filhos.flat().forEach((f) => e.append(f instanceof Node ? f : document.createTextNode(f)));
    // Devolve o valor calculado para quem chamou a função.
    return e;
  }

  /* ---------------- avisos ---------------- */
  // Executa esta instrução para concluir a etapa atual.
  let timerAviso;
  // Mostra uma mensagem temporária na tela.
  function aviso(msg, tipo = 'ok') {
    // Aponta para o elemento usado para mostrar o aviso na tela.
    const a = el('aviso');
    // Atualiza o texto exibido na página.
    a.textContent = msg;
    // Define as classes CSS do elemento de aviso.
    a.className = `aviso ${tipo}`;
    // Cancela o temporizador anterior para evitar avisos duplicados.
    clearTimeout(timerAviso);
    // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
    timerAviso = setTimeout(() => a.classList.add('hidden'), 4200);
  }

  // Exibe uma mensagem de erro na área indicada.
  function mostrarErro(caixa, msg) {
    // Atualiza o texto exibido na página.
    caixa.textContent = msg;
    // Remove a classe CSS para restaurar a aparência normal do elemento.
    caixa.classList.remove('hidden');
  }

  /* ---------------- telas ---------------- */
  // Mostra a tela de login e esconde a aplicação.
  function mostrarLogin() {
    // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
    el('tela-app').classList.add('hidden');
    // Remove a classe CSS para restaurar a aparência normal do elemento.
    el('tela-login').classList.remove('hidden');
    // Preenche o campo com o valor calculado ou recebido.
    el('login-senha').value = '';
    // Chama el para concluir esta etapa.
    el('login-email').focus();
  }

  // Prepara a interface depois que o usuário entra.
  async function mostrarApp(usuario) {
    // Atualiza estado.usuario com o valor necessário para a próxima renderização.
    estado.usuario = usuario;
    // Atualiza o texto exibido na página.
    el('usuario-nome').textContent = usuario.nome;
    // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
    el('tela-login').classList.add('hidden');
    // Remove a classe CSS para restaurar a aparência normal do elemento.
    el('tela-app').classList.remove('hidden');
    // Espera a operação assíncrona terminar antes de continuar.
    estado.salas = await API.salas();
    // Atualiza estado.salaAtiva com o valor necessário para a próxima renderização.
    estado.salaAtiva = estado.salaAtiva || (estado.salas[0] && estado.salas[0].id);
    // Chama trocarVisao para concluir esta etapa.
    trocarVisao('agenda');
  }

  // Alterna entre a agenda e a lista de reservas pessoais.
  function trocarVisao(visao) {
    // Atualiza estado.visao com o valor necessário para a próxima renderização.
    estado.visao = visao;
    // Mostra ou esconde o elemento conforme a visão selecionada.
    document.querySelectorAll('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.view === visao));
    // Mostra ou esconde o elemento conforme a visão selecionada.
    el('view-agenda').classList.toggle('hidden', visao !== 'agenda');
    // Mostra ou esconde o elemento conforme a visão selecionada.
    el('view-minhas').classList.toggle('hidden', visao !== 'minhas');
    // Carrega a agenda quando essa é a seção que está aberta.
    if (visao === 'agenda') carregarDia();
    // Executa esta instrução para concluir a etapa atual.
    else carregarMinhas();
  }

  /* ---------------- login ---------------- */
  // Registra a função que será executada quando esse evento acontecer.
  el('login-form').addEventListener('submit', async (e) => {
    // Evita que o navegador envie o formulário do jeito padrão.
    e.preventDefault();
    // Aponta para a área da tela onde a mensagem de erro aparece.
    const caixa = el('login-erro');
    // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
    caixa.classList.add('hidden');

    // Guarda em email o resultado necessário para as próximas operações.
    const email = el('login-email').value.trim();
    // Guarda em senha o resultado necessário para as próximas operações.
    const senha = el('login-senha').value;
    // Exige que e-mail e senha tenham sido preenchidos.
    if (!email || !senha) return mostrarErro(caixa, 'Informe e-mail e senha.');

    // Aponta para o botão que será desativado durante o envio.
    const botao = el('login-botao');
    // Desativa ou reativa o botão enquanto a operação está em andamento.
    botao.disabled = true;
    // Atualiza o texto exibido na página.
    botao.textContent = 'Entrando...';
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Guarda os dados do usuário encontrado no banco.
      const usuario = await API.entrar(email, senha);
      // Espera a operação assíncrona terminar antes de continuar.
      await mostrarApp(usuario);
    } catch (err) {
      // Chama mostrarErro para concluir esta etapa.
      mostrarErro(caixa, err.message);
    } finally {
      // Desativa ou reativa o botão enquanto a operação está em andamento.
      botao.disabled = false;
      // Atualiza o texto exibido na página.
      botao.textContent = 'Entrar';
    }
  });

  // Encerra a sessão local e volta para a tela de login.
  function sair() {
    // Chama sair para concluir esta etapa.
    API.sair();
    // Atualiza estado.usuario com o valor necessário para a próxima renderização.
    estado.usuario = null;
    // Atualiza estado.reservas com o valor necessário para a próxima renderização.
    estado.reservas = [];
    // Confere a condição antes de executar o trecho seguinte.
    if (el('modal').open) el('modal').close();
    // Chama mostrarLogin para concluir esta etapa.
    mostrarLogin();
  }
  // Registra a função que será executada quando esse evento acontecer.
  el('btn-sair').addEventListener('click', sair);
  // Começa a função que será executada quando este evento acontecer.
  API.aoExpirarSessao(() => {
    // Chama sair para concluir esta etapa.
    sair();
    // Chama mostrarErro para concluir esta etapa.
    mostrarErro(el('login-erro'), 'Sua sessão expirou. Entre novamente.');
  });

  // Registra a função que será executada quando esse evento acontecer.
  document.querySelectorAll('.aba').forEach((b) => b.addEventListener('click', () => trocarVisao(b.dataset.view)));

  /* ---------------- agenda: barra de dias ---------------- */
  // Descobre a segunda-feira da semana da data escolhida.
  function inicioDaSemana(iso) {
    // Guarda a data usada no cálculo.
    const d = deISO(iso);
    const dif = (d.getDay() + 6) % 7; // semana começa na segunda
    // Devolve o valor calculado para quem chamou a função.
    return somarDias(iso, -dif);
  }

  // Desenha os sete dias que aparecem no seletor semanal.
  function renderSemana() {
    // Guarda a data de hoje para destacar o dia correto na agenda.
    const hoje = hojeISO();
    // Guarda o horário inicial da reserva.
    const inicio = inicioDaSemana(estado.dia);
    // Aponta para a área que recebe os dias da semana.
    const container = el('semana-dias');
    // Limpa o conteúdo antigo antes de inserir os elementos atualizados.
    container.replaceChildren();

    // Repete o trecho para cada item da lista ou intervalo.
    for (let i = 0; i < 7; i++) {
      // Guarda em iso o resultado necessário para as próximas operações.
      const iso = somarDias(inicio, i);
      // Guarda a data usada no cálculo.
      const d = deISO(iso);
      // Coloca o elemento dentro do contêiner da página.
      container.append(
        criar(
          // Define o texto que será usado nesta resposta ou configuração.
          'button',
          {
            // Define o campo type, usado para guardar tipo do elemento ou do campo.
            type: 'button',
            // Define o campo class, usado para guardar classes CSS aplicadas ao elemento.
            class: `dia-botao${iso === estado.dia ? ' selecionado' : ''}${iso === hoje ? ' hoje' : ''}`,
            // Define o campo 'aria-pressed' usado neste objeto.
            'aria-pressed': iso === estado.dia,
            // Define o campo 'aria-label' usado neste objeto.
            'aria-label': tituloDoDia(iso),
            // Define o campo onclick, usado para guardar ação executada quando o botão é clicado.
            onclick: () => irParaDia(iso),
          },
          criar('span', { class: 'dia-nome' }, DIAS_SEMANA[d.getDay()]),
          criar('span', { class: 'dia-num' }, String(d.getDate()))
        )
      );
    }

    // Atualiza o texto exibido na página.
    el('dia-titulo').textContent = tituloDoDia(estado.dia);
    // Atualiza o texto exibido na página.
    el('dia-sub').textContent = estado.dia === hoje ? 'Hoje' : '';
    // Preenche o campo com o valor calculado ou recebido.
    el('dia-input').value = estado.dia;
  }

  // Troca o dia selecionado e carrega as reservas dele.
  function irParaDia(iso) {
    // Confere a condição antes de executar o trecho seguinte.
    if (!iso) return;
    // Atualiza estado.dia com o valor necessário para a próxima renderização.
    estado.dia = iso;
    // Chama carregarDia para concluir esta etapa.
    carregarDia();
  }

  // Registra a função que será executada quando esse evento acontecer.
  el('sem-anterior').addEventListener('click', () => irParaDia(somarDias(estado.dia, -7)));
  // Registra a função que será executada quando esse evento acontecer.
  el('sem-proxima').addEventListener('click', () => irParaDia(somarDias(estado.dia, 7)));
  // Registra a função que será executada quando esse evento acontecer.
  el('btn-hoje').addEventListener('click', () => irParaDia(hojeISO()));
  // Registra a função que será executada quando esse evento acontecer.
  el('dia-input').addEventListener('change', (e) => irParaDia(e.target.value));

  // Busca as reservas do dia e atualiza a agenda.
  async function carregarDia() {
    // Chama renderSemana para concluir esta etapa.
    renderSemana();
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Espera a operação assíncrona terminar antes de continuar.
      estado.reservas = await API.agendamentos(estado.dia, estado.dia);
      // Chama renderGrade para concluir esta etapa.
      renderGrade();
    } catch (err) {
      // Confere a condição antes de executar o trecho seguinte.
      if (err.status !== 401) aviso(err.message, 'erro');
    }
  }

  /* ---------------- agenda: grade sala x horário ---------------- */
  // Cria os botões usados para escolher uma sala.
  function renderAbasSalas() {
    // Aponta para a área que recebe os botões das salas.
    const abas = el('salas-abas');
    // Limpa o conteúdo antigo antes de inserir os elementos atualizados.
    abas.replaceChildren(
      // Percorre a lista e transforma cada item no formato necessário.
      ...estado.salas.map((s) =>
        criar(
          // Define o texto que será usado nesta resposta ou configuração.
          'button',
          {
            // Define o campo type, usado para guardar tipo do elemento ou do campo.
            type: 'button',
            // Define o campo role usado neste objeto.
            role: 'tab',
            // Define o campo class, usado para guardar classes CSS aplicadas ao elemento.
            class: `sala-aba${s.id === estado.salaAtiva ? ' ativa' : ''}`,
            // Define o campo 'aria-selected' usado neste objeto.
            'aria-selected': s.id === estado.salaAtiva,
            // Define o campo onclick, usado para guardar ação executada quando o botão é clicado.
            onclick: () => {
              // Atualiza estado.salaAtiva com o valor necessário para a próxima renderização.
              estado.salaAtiva = s.id;
              // Chama renderGrade para concluir esta etapa.
              renderGrade();
            },
          },
          s.nome.replace(/^Sala /, '')
        )
      )
    );
  }

  // Desenha a grade de horários das salas.
  function renderGrade() {
    // Chama renderAbasSalas para concluir esta etapa.
    renderAbasSalas();

    // No celular mostra uma sala por vez; no computador mostra todas lado a lado
    // Guarda em salas o resultado necessário para as próximas operações.
    const salas = mobile.matches ? estado.salas.filter((s) => s.id === estado.salaAtiva) : estado.salas;
    // Aponta para a área onde a agenda é desenhada.
    const grade = el('grade');
    // Atualiza a variável CSS usada para ajustar a grade.
    grade.style.setProperty('--colunas', salas.length);
    // Limpa o conteúdo antigo antes de inserir os elementos atualizados.
    grade.replaceChildren();

    // Guarda o horário atual para comparar com os horários da agenda.
    const agora = horaAtualISO();
    // Guarda a data de hoje para destacar o dia correto na agenda.
    const hoje = hojeISO();
    // Guarda a hora atual para identificar horários que já passaram.
    const horaCorrente = new Date().getHours();

    // cabeçalho
    // Coloca o elemento dentro do contêiner da página.
    grade.append(criar('div', { class: 'cel cabecalho canto', style: 'grid-row:1;grid-column:1' }));
    // Executa esta ação para cada item da lista.
    salas.forEach((s, i) => {
      // Coloca o elemento dentro do contêiner da página.
      grade.append(
        criar(
          // Define o texto que será usado nesta resposta ou configuração.
          'div',
          { class: 'cel cabecalho', style: `grid-row:1;grid-column:${i + 2}` },
          criar('strong', {}, s.nome),
          criar('span', {}, `${s.capacidade} pessoas`)
        )
      );
    });

    // rótulos de hora
    // Repete o trecho para cada item da lista ou intervalo.
    for (let h = ABERTURA; h < FECHAMENTO; h++) {
      // Guarda o contador de falhas que será atualizado.
      const atual = estado.dia === hoje && h === horaCorrente;
      // Coloca o elemento dentro do contêiner da página.
      grade.append(
        criar(
          // Define o texto que será usado nesta resposta ou configuração.
          'div',
          { class: `cel hora${atual ? ' agora' : ''}`, style: `grid-row:${h - ABERTURA + 2};grid-column:1` },
          rotuloHora(h)
        )
      );
    }

    // células por sala
    // Executa esta ação para cada item da lista.
    salas.forEach((sala, i) => {
      // Guarda em coluna o resultado necessário para as próximas operações.
      const coluna = i + 2;
      // Guarda em daSala o resultado necessário para as próximas operações.
      const daSala = estado.reservas.filter((r) => r.sala_id === sala.id);

      // Repete o trecho para cada item da lista ou intervalo.
      for (let h = ABERTURA; h < FECHAMENTO; h++) {
        // Guarda em linha o resultado necessário para as próximas operações.
        const linha = h - ABERTURA + 2;
        // Guarda em reserva o resultado necessário para as próximas operações.
        const reserva = daSala.find((r) => horaDe(r.data_hora_inicio) <= h && horaDe(r.data_hora_fim) > h);

        // Confere a condição antes de executar o trecho seguinte.
        if (reserva) {
          if (horaDe(reserva.data_hora_inicio) !== h) continue; // já coberta pelo bloco da reserva
          // Guarda em duracao o resultado necessário para as próximas operações.
          const duracao = horaDe(reserva.data_hora_fim) - h;
          // Coloca o elemento dentro do contêiner da página.
          grade.append(blocoReserva(reserva, linha, coluna, duracao, agora));
          // Executa esta instrução para concluir a etapa atual.
          continue;
        }

        // Guarda em passado o resultado necessário para as próximas operações.
        const passado = dataHora(estado.dia, h) < agora;
        // Coloca o elemento dentro do contêiner da página.
        grade.append(
          criar(
            // Define o texto que será usado nesta resposta ou configuração.
            'button',
            {
              // Define o campo type, usado para guardar tipo do elemento ou do campo.
              type: 'button',
              // Define o campo class, usado para guardar classes CSS aplicadas ao elemento.
              class: `cel livre${passado ? ' passado' : ''}`,
              // Define o campo style, usado para guardar regras de posicionamento aplicadas à reserva.
              style: `grid-row:${linha};grid-column:${coluna}`,
              // Define o campo disabled usado neste objeto.
              disabled: passado,
              // Define o campo 'aria-label' usado neste objeto.
              'aria-label': `Reservar ${sala.nome} às ${rotuloHora(h)}`,
              // Define o campo onclick, usado para guardar ação executada quando o botão é clicado.
              onclick: () => abrirModal({ salaId: sala.id, hora: h }),
            },
            passado ? '' : criar('span', { class: 'mais', 'aria-hidden': 'true' }, '+')
          )
        );
      }
    });
  }

  // Define a função blocoReserva, que concentra esta parte da lógica.
  function blocoReserva(r, linha, coluna, duracao, agora) {
    // Guarda em minha o resultado necessário para as próximas operações.
    const minha = r.minha;
    // Guarda em terminou o resultado necessário para as próximas operações.
    const terminou = r.data_hora_fim <= agora;
    // Guarda em editavel o resultado necessário para as próximas operações.
    const editavel = minha && !terminou;
    // Monta o texto com o intervalo de horário da reserva.
    const faixa = `${rotuloHora(horaDe(r.data_hora_inicio))} às ${rotuloHora(horaDe(r.data_hora_fim))}`;

    // Guarda as classes visuais que diferenciam a reserva.
    const classes = `cel reserva ${minha ? 'minha' : 'outra'}${terminou ? ' passado' : ''}${duracao === 1 ? ' curta' : ''}`;
    // Guarda em conteudo o resultado necessário para as próximas operações.
    const conteudo = [
      criar('strong', {}, r.titulo),
      criar('span', {}, minha ? 'Você' : r.professor_nome),
      criar('span', { class: 'faixa' }, faixa),
    ];
    // Guarda a posição e a altura da reserva dentro da grade.
    const estilo = `grid-row:${linha} / span ${duracao};grid-column:${coluna}`;

    // Confere a condição antes de executar o trecho seguinte.
    if (editavel) {
      // Devolve o valor calculado para quem chamou a função.
      return criar(
        // Define o texto que será usado nesta resposta ou configuração.
        'button',
        {
          // Define o campo type, usado para guardar tipo do elemento ou do campo.
          type: 'button',
          // Define o campo class, usado para guardar classes CSS aplicadas ao elemento.
          class: classes,
          // Define o campo style, usado para guardar regras de posicionamento aplicadas à reserva.
          style: estilo,
          // Define o campo 'aria-label' usado neste objeto.
          'aria-label': `Editar sua reserva: ${r.titulo}, ${faixa}`,
          // Define o campo onclick, usado para guardar ação executada quando o botão é clicado.
          onclick: () => abrirModal({ reserva: r }),
        },
        ...conteudo
      );
    }
    // Devolve o valor calculado para quem chamou a função.
    return criar('div', { class: classes, style: estilo }, ...conteudo);
  }

  // Registra a função que será executada quando esse evento acontecer.
  mobile.addEventListener('change', () => estado.visao === 'agenda' && renderGrade());

  /* ---------------- minhas reservas ---------------- */
  // Busca e mostra as próximas reservas do usuário atual.
  async function carregarMinhas() {
    // Aponta para a área que recebe os cartões das reservas.
    const lista = el('minhas-lista');
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Guarda as reservas retornadas pela consulta.
      const itens = await API.minhas();
      // Limpa o conteúdo antigo antes de inserir os elementos atualizados.
      lista.replaceChildren();

      // Confere a condição antes de executar o trecho seguinte.
      if (itens.length === 0) {
        // Coloca o elemento dentro do contêiner da página.
        lista.append(
          criar(
            // Define o texto que será usado nesta resposta ou configuração.
            'div',
            { class: 'vazio' },
            criar('p', {}, 'Você ainda não tem reservas futuras.'),
            criar('button', { type: 'button', class: 'btn btn-primario', onclick: () => trocarVisao('agenda') }, 'Escolher um horário')
          )
        );
        // Executa esta instrução para concluir a etapa atual.
        return;
      }

      // Executa esta ação para cada item da lista.
      itens.forEach((r) => {
        // Guarda em dia o resultado necessário para as próximas operações.
        const dia = r.data_hora_inicio.slice(0, 10);
        // Coloca o elemento dentro do contêiner da página.
        lista.append(
          criar(
            // Define o texto que será usado nesta resposta ou configuração.
            'article',
            { class: 'cartao-reserva' },
            criar(
              // Define o texto que será usado nesta resposta ou configuração.
              'div',
              { class: 'cartao-data' },
              criar('span', {}, DIAS_SEMANA[deISO(dia).getDay()]),
              criar('strong', {}, String(deISO(dia).getDate()))
            ),
            criar(
              // Define o texto que será usado nesta resposta ou configuração.
              'div',
              { class: 'cartao-info' },
              criar('h3', {}, r.titulo),
              criar('p', {}, `${r.sala_nome} · ${rotuloHora(horaDe(r.data_hora_inicio))} às ${rotuloHora(horaDe(r.data_hora_fim))} · ${dataCurta(dia)}`)
            ),
            criar(
              // Define o texto que será usado nesta resposta ou configuração.
              'div',
              { class: 'cartao-acoes' },
              criar('button', { type: 'button', class: 'btn btn-contorno', onclick: () => abrirModal({ reserva: r }) }, 'Editar'),
              botaoCancelar(r)
            )
          )
        );
      });
    } catch (err) {
      // Confere a condição antes de executar o trecho seguinte.
      if (err.status !== 401) aviso(err.message, 'erro');
    }
  }

  // Cancelamento em duas etapas: o primeiro clique pede confirmação
  // Cria o botão de cancelamento com uma etapa de confirmação.
  function botaoCancelar(r) {
    // Cria o botão que será usado para cancelar a reserva.
    const b = criar('button', { type: 'button', class: 'btn btn-perigo-contorno' }, 'Cancelar');
    // Guarda em esperando o resultado necessário para as próximas operações.
    let esperando = false;
    // Executa esta instrução para concluir a etapa atual.
    let timer;
    // Registra a função que será executada quando esse evento acontecer.
    b.addEventListener('click', async () => {
      // Confere a condição antes de executar o trecho seguinte.
      if (!esperando) {
        // Atualiza esperando com o resultado desta expressão.
        esperando = true;
        // Atualiza o texto exibido na página.
        b.textContent = 'Confirmar?';
        // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
        b.classList.add('confirmando');
        // Atualiza timer com o resultado desta expressão.
        timer = setTimeout(() => {
          // Atualiza esperando com o resultado desta expressão.
          esperando = false;
          // Atualiza o texto exibido na página.
          b.textContent = 'Cancelar';
          // Remove a classe CSS para restaurar a aparência normal do elemento.
          b.classList.remove('confirmando');
        // Executa esta instrução para concluir a etapa atual.
        }, 4000);
        // Executa esta instrução para concluir a etapa atual.
        return;
      }
      // Cancela o temporizador anterior para evitar avisos duplicados.
      clearTimeout(timer);
      // Espera a operação assíncrona terminar antes de continuar.
      await cancelarReserva(r.id);
    });
    // Devolve o valor calculado para quem chamou a função.
    return b;
  }

  // Pede ao servidor para cancelar a reserva e atualiza a tela.
  async function cancelarReserva(id) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Espera a operação assíncrona terminar antes de continuar.
      await API.excluir(id);
      // Chama aviso para concluir esta etapa.
      aviso('Reserva cancelada.');
      // Confere a condição antes de executar o trecho seguinte.
      if (el('modal').open) el('modal').close();
      // Atualiza estado.visao com o valor necessário para a próxima renderização.
      estado.visao === 'agenda' ? carregarDia() : carregarMinhas();
    } catch (err) {
      // Chama aviso para concluir esta etapa.
      aviso(err.message, 'erro');
    }
  }

  /* ---------------- modal de reserva ---------------- */
  // Guarda a referência à janela de criação e edição de reservas.
  const modal = el('modal');
  // Marca se o usuário já clicou uma vez para confirmar o cancelamento.
  let confirmandoCancelamento = false;

  // Preenche as opções de horário de início e de término.
  function preencherHoras(selectInicio, selectFim, inicio, fim) {
    // Limpa o conteúdo antigo antes de inserir os elementos atualizados.
    selectInicio.replaceChildren(
      // Começa a função que será executada quando este evento acontecer.
      ...Array.from({ length: FECHAMENTO - ABERTURA }, (_, i) => {
        // Guarda em h o resultado necessário para as próximas operações.
        const h = ABERTURA + i;
        // Devolve o valor calculado para quem chamou a função.
        return criar('option', { value: h }, `${pad(h)}:00`);
      })
    );
    // Preenche o campo com o valor calculado ou recebido.
    selectInicio.value = inicio;
    // Chama preencherFim para concluir esta etapa.
    preencherFim(selectInicio, selectFim, fim);
  }

  // Atualiza os horários de término permitidos a partir do início.
  function preencherFim(selectInicio, selectFim, fimDesejado) {
    // Guarda o horário inicial da reserva.
    const inicio = Number(selectInicio.value);
    // Limpa o conteúdo antigo antes de inserir os elementos atualizados.
    selectFim.replaceChildren(
      // Começa a função que será executada quando este evento acontecer.
      ...Array.from({ length: FECHAMENTO - inicio }, (_, i) => {
        // Guarda em h o resultado necessário para as próximas operações.
        const h = inicio + 1 + i;
        // Devolve o valor calculado para quem chamou a função.
        return criar('option', { value: h }, `${pad(h)}:00`);
      })
    );
    // Guarda em alvo o resultado necessário para as próximas operações.
    const alvo = fimDesejado && fimDesejado > inicio ? fimDesejado : inicio + 1;
    // Preenche o campo com o valor calculado ou recebido.
    selectFim.value = Math.min(alvo, FECHAMENTO);
  }

  // Volta o botão de cancelamento ao estado normal.
  function resetarCancelamento() {
    // Atualiza se a confirmação de cancelamento já foi iniciada.
    confirmandoCancelamento = false;
    // Pega o botão de cancelar reserva que já existe no HTML.
    const b = el('btn-cancelar-reserva');
    // Atualiza o texto exibido na página.
    b.textContent = 'Cancelar reserva';
    // Remove a classe CSS para restaurar a aparência normal do elemento.
    b.classList.remove('confirmando');
  }

  // Abre o formulário e preenche os campos para criar ou editar uma reserva.
  function abrirModal({ salaId, hora, reserva }) {
    // Indica se o formulário foi aberto para editar ou criar uma reserva.
    const edicao = !!reserva;
    // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
    el('modal-erro').classList.add('hidden');
    // Chama resetarCancelamento para concluir esta etapa.
    resetarCancelamento();

    // Atualiza o texto exibido na página.
    el('modal-titulo').textContent = edicao ? 'Editar reserva' : 'Nova reserva';
    // Atualiza o texto exibido na página.
    el('btn-salvar').textContent = edicao ? 'Salvar alterações' : 'Reservar sala';
    // Mostra ou esconde o elemento conforme a visão selecionada.
    el('btn-cancelar-reserva').classList.toggle('hidden', !edicao);
    // Preenche o campo com o valor calculado ou recebido.
    el('reserva-id').value = edicao ? reserva.id : '';
    // Preenche o campo com o valor calculado ou recebido.
    el('reserva-titulo').value = edicao ? reserva.titulo : '';

    // Limpa o conteúdo antigo antes de inserir os elementos atualizados.
    el('reserva-sala').replaceChildren(
      // Percorre a lista e transforma cada item no formato necessário.
      ...estado.salas.map((s) => criar('option', { value: s.id }, s.nome))
    );
    // Preenche o campo com o valor calculado ou recebido.
    el('reserva-sala').value = edicao ? reserva.sala_id : salaId;

    // Guarda em dia o resultado necessário para as próximas operações.
    const dia = edicao ? reserva.data_hora_inicio.slice(0, 10) : estado.dia;
    // Preenche o campo com o valor calculado ou recebido.
    el('reserva-data').value = dia;
    // Chama el para concluir esta etapa.
    el('reserva-data').min = hojeISO();

    preencherHoras(
      el('reserva-inicio'),
      el('reserva-fim'),
      edicao ? horaDe(reserva.data_hora_inicio) : hora,
      edicao ? horaDe(reserva.data_hora_fim) : hora + 1
    );

    // Abre a janela de reserva por cima da página.
    modal.showModal();
    // Chama el para concluir esta etapa.
    el('reserva-titulo').focus();
  }

  // Registra a função que será executada quando esse evento acontecer.
  el('reserva-inicio').addEventListener('change', () =>
    preencherFim(el('reserva-inicio'), el('reserva-fim'), Number(el('reserva-fim').value))
  );
  // Registra a função que será executada quando esse evento acontecer.
  el('modal-fechar').addEventListener('click', () => modal.close());
  // Registra a função que será executada quando esse evento acontecer.
  el('btn-fechar-modal').addEventListener('click', () => modal.close());
  // Clique no fundo escuro fecha o modal
  // Registra a função que será executada quando esse evento acontecer.
  modal.addEventListener('click', (e) => {
    // Confere a condição antes de executar o trecho seguinte.
    if (e.target === modal) modal.close();
  });

  // Registra a função que será executada quando esse evento acontecer.
  el('reserva-form').addEventListener('submit', async (e) => {
    // Evita que o navegador envie o formulário do jeito padrão.
    e.preventDefault();
    // Aponta para a área da tela onde a mensagem de erro aparece.
    const caixa = el('modal-erro');
    // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
    caixa.classList.add('hidden');

    // Guarda em dia o resultado necessário para as próximas operações.
    const dia = el('reserva-data').value;
    // Exige que o usuário escolha uma data antes de enviar o formulário.
    if (!dia) return mostrarErro(caixa, 'Escolha o dia da reserva.');

    // Guarda os campos que serão validados ou enviados ao banco.
    const dados = {
      // Remove espaços extras do início e do fim do texto.
      titulo: el('reserva-titulo').value.trim(),
      // Define o campo sala_id, usado para guardar sala escolhida para a reserva.
      sala_id: Number(el('reserva-sala').value),
      // Define o campo data_hora_inicio, usado para guardar início da reserva.
      data_hora_inicio: dataHora(dia, Number(el('reserva-inicio').value)),
      // Define o campo data_hora_fim, usado para guardar término da reserva.
      data_hora_fim: dataHora(dia, Number(el('reserva-fim').value)),
    };
    // Impede salvar um título com menos de dois caracteres.
    if (dados.titulo.length < 2) return mostrarErro(caixa, 'Informe o nome da aula ou ensaio.');

    // Guarda o identificador da reserva que será consultada ou alterada.
    const id = el('reserva-id').value;
    // Aponta para o botão que será desativado durante o envio.
    const botao = el('btn-salvar');
    // Desativa ou reativa o botão enquanto a operação está em andamento.
    botao.disabled = true;
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Confere a condição antes de executar o trecho seguinte.
      if (id) await API.atualizar(id, dados);
      // Executa esta instrução para concluir a etapa atual.
      else await API.criar(dados);

      // Fecha a janela de reserva.
      modal.close();
      // Chama aviso para concluir esta etapa.
      aviso(id ? 'Reserva atualizada.' : 'Sala reservada.');
      // Carrega a agenda quando essa é a seção que está aberta.
      if (estado.visao === 'agenda') {
        estado.dia = dia; // leva a agenda para o dia reservado
        // Chama carregarDia para concluir esta etapa.
        carregarDia();
      } else {
        // Chama carregarMinhas para concluir esta etapa.
        carregarMinhas();
      }
    } catch (err) {
      // Chama mostrarErro para concluir esta etapa.
      mostrarErro(caixa, err.message);
      // Em caso de choque, atualiza a agenda: alguém pode ter reservado o horário agora
      // Carrega a agenda quando essa é a seção que está aberta.
      if (err.status === 409 && estado.visao === 'agenda') carregarDia();
    } finally {
      // Desativa ou reativa o botão enquanto a operação está em andamento.
      botao.disabled = false;
    }
  });

  // Registra a função que será executada quando esse evento acontecer.
  el('btn-cancelar-reserva').addEventListener('click', async () => {
    // No primeiro clique, pede confirmação em vez de cancelar imediatamente.
    if (!confirmandoCancelamento) {
      // Atualiza se a confirmação de cancelamento já foi iniciada.
      confirmandoCancelamento = true;
      // Atualiza o texto exibido na página.
      el('btn-cancelar-reserva').textContent = 'Confirmar cancelamento';
      // Adiciona uma classe CSS para mudar a aparência ou o estado do elemento.
      el('btn-cancelar-reserva').classList.add('confirmando');
      // Executa esta instrução para concluir a etapa atual.
      return;
    }
    // Espera a operação assíncrona terminar antes de continuar.
    await cancelarReserva(Number(el('reserva-id').value));
  });

  /* ---------------- atualização automática ---------------- */
  // Outros professores reservam a todo momento: recarrega a agenda a cada minuto
  // Agenda uma verificação que se repete no intervalo informado.
  setInterval(() => {
    // Carrega a agenda quando essa é a seção que está aberta.
    if (!document.hidden && estado.usuario && estado.visao === 'agenda' && !modal.open) carregarDia();
  // Executa esta instrução para concluir a etapa atual.
  }, 60000);

  /* ---------------- início ---------------- */
  (async function iniciar() {
    // Confere a condição antes de executar o trecho seguinte.
    if (!API.temSessao()) return mostrarLogin();
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Espera a operação assíncrona terminar antes de continuar.
      await mostrarApp(await API.eu());
    } catch {
      // Chama sair para concluir esta etapa.
      API.sair();
      // Chama mostrarLogin para concluir esta etapa.
      mostrarLogin();
    }
  })();
})();
