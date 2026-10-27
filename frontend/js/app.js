// Interface do DanceSlot: login, agenda por sala/horário e reservas do professor.
(() => {
  const ABERTURA = 6;     // a companhia abre às 6h
  const FECHAMENTO = 23;  // e fecha às 23h (última reserva termina às 23h)
  const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  const $ = (id) => document.getElementById(id);
  const el = $; // atalho semântico para leitura
  const pad = (n) => String(n).padStart(2, '0');

  const estado = {
    usuario: null,
    salas: [],
    dia: hojeISO(),           // AAAA-MM-DD exibido na agenda
    reservas: [],             // reservas do dia exibido
    salaAtiva: null,          // sala exibida no celular
    visao: 'agenda',
  };

  const mobile = window.matchMedia('(max-width: 760px)');

  /* ---------------- datas e formatação ---------------- */
  function paraISO(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function hojeISO() { return paraISO(new Date()); }
  // new Date('AAAA-MM-DD') usa UTC e pode voltar um dia; aqui o dia é sempre local
  function deISO(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function somarDias(iso, n) {
    const d = deISO(iso);
    d.setDate(d.getDate() + n);
    return paraISO(d);
  }
  const horaDe = (dataHora) => Number(dataHora.slice(11, 13));
  const rotuloHora = (h) => `${h}h`;
  const dataHora = (dia, h) => `${dia}T${pad(h)}:00`;

  function horaAtualISO() {
    const d = new Date();
    return `${paraISO(d)}T${pad(d.getHours())}:00`;
  }

  function tituloDoDia(iso) {
    const txt = deISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }
  function dataCurta(iso) {
    return deISO(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  /* ---------------- criação segura de elementos (sem innerHTML) ---------------- */
  function criar(tag, atributos = {}, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(atributos)) {
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    filhos.flat().forEach((f) => e.append(f instanceof Node ? f : document.createTextNode(f)));
    return e;
  }

  /* ---------------- avisos ---------------- */
  let timerAviso;
  function aviso(msg, tipo = 'ok') {
    const a = el('aviso');
    a.textContent = msg;
    a.className = `aviso ${tipo}`;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => a.classList.add('hidden'), 4200);
  }

  function mostrarErro(caixa, msg) {
    caixa.textContent = msg;
    caixa.classList.remove('hidden');
  }

  /* ---------------- telas ---------------- */
  function mostrarLogin() {
    el('tela-app').classList.add('hidden');
    el('tela-login').classList.remove('hidden');
    el('login-senha').value = '';
    el('login-email').focus();
  }

  async function mostrarApp(usuario) {
    estado.usuario = usuario;
    el('usuario-nome').textContent = usuario.nome;
    el('tela-login').classList.add('hidden');
    el('tela-app').classList.remove('hidden');
    estado.salas = await API.salas();
    estado.salaAtiva = estado.salaAtiva || (estado.salas[0] && estado.salas[0].id);
    trocarVisao('agenda');
  }

  function trocarVisao(visao) {
    estado.visao = visao;
    document.querySelectorAll('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.view === visao));
    el('view-agenda').classList.toggle('hidden', visao !== 'agenda');
    el('view-minhas').classList.toggle('hidden', visao !== 'minhas');
    if (visao === 'agenda') carregarDia();
    else carregarMinhas();
  }

  /* ---------------- login ---------------- */
  el('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const caixa = el('login-erro');
    caixa.classList.add('hidden');

    const email = el('login-email').value.trim();
    const senha = el('login-senha').value;
    if (!email || !senha) return mostrarErro(caixa, 'Informe e-mail e senha.');

    const botao = el('login-botao');
    botao.disabled = true;
    botao.textContent = 'Entrando...';
    try {
      const usuario = await API.entrar(email, senha);
      await mostrarApp(usuario);
    } catch (err) {
      mostrarErro(caixa, err.message);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });

  function sair() {
    API.sair();
    estado.usuario = null;
    estado.reservas = [];
    if (el('modal').open) el('modal').close();
    mostrarLogin();
  }
  el('btn-sair').addEventListener('click', sair);
  API.aoExpirarSessao(() => {
    sair();
    mostrarErro(el('login-erro'), 'Sua sessão expirou. Entre novamente.');
  });

  document.querySelectorAll('.aba').forEach((b) => b.addEventListener('click', () => trocarVisao(b.dataset.view)));

  /* ---------------- agenda: barra de dias ---------------- */
  function inicioDaSemana(iso) {
    const d = deISO(iso);
    const dif = (d.getDay() + 6) % 7; // semana começa na segunda
    return somarDias(iso, -dif);
  }

  function renderSemana() {
    const hoje = hojeISO();
    const inicio = inicioDaSemana(estado.dia);
    const container = el('semana-dias');
    container.replaceChildren();

    for (let i = 0; i < 7; i++) {
      const iso = somarDias(inicio, i);
      const d = deISO(iso);
      container.append(
        criar(
          'button',
          {
            type: 'button',
            class: `dia-botao${iso === estado.dia ? ' selecionado' : ''}${iso === hoje ? ' hoje' : ''}`,
            'aria-pressed': iso === estado.dia,
            'aria-label': tituloDoDia(iso),
            onclick: () => irParaDia(iso),
          },
          criar('span', { class: 'dia-nome' }, DIAS_SEMANA[d.getDay()]),
          criar('span', { class: 'dia-num' }, String(d.getDate()))
        )
      );
    }

    el('dia-titulo').textContent = tituloDoDia(estado.dia);
    el('dia-sub').textContent = estado.dia === hoje ? 'Hoje' : '';
    el('dia-input').value = estado.dia;
  }

  function irParaDia(iso) {
    if (!iso) return;
    estado.dia = iso;
    carregarDia();
  }

  el('sem-anterior').addEventListener('click', () => irParaDia(somarDias(estado.dia, -7)));
  el('sem-proxima').addEventListener('click', () => irParaDia(somarDias(estado.dia, 7)));
  el('btn-hoje').addEventListener('click', () => irParaDia(hojeISO()));
  el('dia-input').addEventListener('change', (e) => irParaDia(e.target.value));

  async function carregarDia() {
    renderSemana();
    try {
      estado.reservas = await API.agendamentos(estado.dia, estado.dia);
      renderGrade();
    } catch (err) {
      if (err.status !== 401) aviso(err.message, 'erro');
    }
  }

  /* ---------------- agenda: grade sala x horário ---------------- */
  function renderAbasSalas() {
    const abas = el('salas-abas');
    abas.replaceChildren(
      ...estado.salas.map((s) =>
        criar(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: `sala-aba${s.id === estado.salaAtiva ? ' ativa' : ''}`,
            'aria-selected': s.id === estado.salaAtiva,
            onclick: () => {
              estado.salaAtiva = s.id;
              renderGrade();
            },
          },
          s.nome.replace(/^Sala /, '')
        )
      )
    );
  }

  function renderGrade() {
    renderAbasSalas();

    // No celular mostra uma sala por vez; no computador mostra todas lado a lado
    const salas = mobile.matches ? estado.salas.filter((s) => s.id === estado.salaAtiva) : estado.salas;
    const grade = el('grade');
    grade.style.setProperty('--colunas', salas.length);
    grade.replaceChildren();

    const agora = horaAtualISO();
    const hoje = hojeISO();
    const horaCorrente = new Date().getHours();

    // cabeçalho
    grade.append(criar('div', { class: 'cel cabecalho canto', style: 'grid-row:1;grid-column:1' }));
    salas.forEach((s, i) => {
      grade.append(
        criar(
          'div',
          { class: 'cel cabecalho', style: `grid-row:1;grid-column:${i + 2}` },
          criar('strong', {}, s.nome),
          criar('span', {}, `${s.capacidade} pessoas`)
        )
      );
    });

    // rótulos de hora
    for (let h = ABERTURA; h < FECHAMENTO; h++) {
      const atual = estado.dia === hoje && h === horaCorrente;
      grade.append(
        criar(
          'div',
          { class: `cel hora${atual ? ' agora' : ''}`, style: `grid-row:${h - ABERTURA + 2};grid-column:1` },
          rotuloHora(h)
        )
      );
    }

    // células por sala
    salas.forEach((sala, i) => {
      const coluna = i + 2;
      const daSala = estado.reservas.filter((r) => r.sala_id === sala.id);

      for (let h = ABERTURA; h < FECHAMENTO; h++) {
        const linha = h - ABERTURA + 2;
        const reserva = daSala.find((r) => horaDe(r.data_hora_inicio) <= h && horaDe(r.data_hora_fim) > h);

        if (reserva) {
          if (horaDe(reserva.data_hora_inicio) !== h) continue; // já coberta pelo bloco da reserva
          const duracao = horaDe(reserva.data_hora_fim) - h;
          grade.append(blocoReserva(reserva, linha, coluna, duracao, agora));
          continue;
        }

        const passado = dataHora(estado.dia, h) < agora;
        grade.append(
          criar(
            'button',
            {
              type: 'button',
              class: `cel livre${passado ? ' passado' : ''}`,
              style: `grid-row:${linha};grid-column:${coluna}`,
              disabled: passado,
              'aria-label': `Reservar ${sala.nome} às ${rotuloHora(h)}`,
              onclick: () => abrirModal({ salaId: sala.id, hora: h }),
            },
            passado ? '' : criar('span', { class: 'mais', 'aria-hidden': 'true' }, '+')
          )
        );
      }
    });
  }

  function blocoReserva(r, linha, coluna, duracao, agora) {
    const minha = r.minha;
    const terminou = r.data_hora_fim <= agora;
    const editavel = minha && !terminou;
    const faixa = `${rotuloHora(horaDe(r.data_hora_inicio))} às ${rotuloHora(horaDe(r.data_hora_fim))}`;

    const classes = `cel reserva ${minha ? 'minha' : 'outra'}${terminou ? ' passado' : ''}${duracao === 1 ? ' curta' : ''}`;
    const conteudo = [
      criar('strong', {}, r.titulo),
      criar('span', {}, minha ? 'Você' : r.professor_nome),
      criar('span', { class: 'faixa' }, faixa),
    ];
    const estilo = `grid-row:${linha} / span ${duracao};grid-column:${coluna}`;

    if (editavel) {
      return criar(
        'button',
        {
          type: 'button',
          class: classes,
          style: estilo,
          'aria-label': `Editar sua reserva: ${r.titulo}, ${faixa}`,
          onclick: () => abrirModal({ reserva: r }),
        },
        ...conteudo
      );
    }
    return criar('div', { class: classes, style: estilo }, ...conteudo);
  }

  mobile.addEventListener('change', () => estado.visao === 'agenda' && renderGrade());

  /* ---------------- minhas reservas ---------------- */
  async function carregarMinhas() {
    const lista = el('minhas-lista');
    try {
      const itens = await API.minhas();
      lista.replaceChildren();

      if (itens.length === 0) {
        lista.append(
          criar(
            'div',
            { class: 'vazio' },
            criar('p', {}, 'Você ainda não tem reservas futuras.'),
            criar('button', { type: 'button', class: 'btn btn-primario', onclick: () => trocarVisao('agenda') }, 'Escolher um horário')
          )
        );
        return;
      }

      itens.forEach((r) => {
        const dia = r.data_hora_inicio.slice(0, 10);
        lista.append(
          criar(
            'article',
            { class: 'cartao-reserva' },
            criar(
              'div',
              { class: 'cartao-data' },
              criar('span', {}, DIAS_SEMANA[deISO(dia).getDay()]),
              criar('strong', {}, String(deISO(dia).getDate()))
            ),
            criar(
              'div',
              { class: 'cartao-info' },
              criar('h3', {}, r.titulo),
              criar('p', {}, `${r.sala_nome} · ${rotuloHora(horaDe(r.data_hora_inicio))} às ${rotuloHora(horaDe(r.data_hora_fim))} · ${dataCurta(dia)}`)
            ),
            criar(
              'div',
              { class: 'cartao-acoes' },
              criar('button', { type: 'button', class: 'btn btn-contorno', onclick: () => abrirModal({ reserva: r }) }, 'Editar'),
              botaoCancelar(r)
            )
          )
        );
      });
    } catch (err) {
      if (err.status !== 401) aviso(err.message, 'erro');
    }
  }

  // Cancelamento em duas etapas: o primeiro clique pede confirmação
  function botaoCancelar(r) {
    const b = criar('button', { type: 'button', class: 'btn btn-perigo-contorno' }, 'Cancelar');
    let esperando = false;
    let timer;
    b.addEventListener('click', async () => {
      if (!esperando) {
        esperando = true;
        b.textContent = 'Confirmar?';
        b.classList.add('confirmando');
        timer = setTimeout(() => {
          esperando = false;
          b.textContent = 'Cancelar';
          b.classList.remove('confirmando');
        }, 4000);
        return;
      }
      clearTimeout(timer);
      await cancelarReserva(r.id);
    });
    return b;
  }

  async function cancelarReserva(id) {
    try {
      await API.excluir(id);
      aviso('Reserva cancelada.');
      if (el('modal').open) el('modal').close();
      estado.visao === 'agenda' ? carregarDia() : carregarMinhas();
    } catch (err) {
      aviso(err.message, 'erro');
    }
  }

  /* ---------------- modal de reserva ---------------- */
  const modal = el('modal');
  let confirmandoCancelamento = false;

  function preencherHoras(selectInicio, selectFim, inicio, fim) {
    selectInicio.replaceChildren(
      ...Array.from({ length: FECHAMENTO - ABERTURA }, (_, i) => {
        const h = ABERTURA + i;
        return criar('option', { value: h }, `${pad(h)}:00`);
      })
    );
    selectInicio.value = inicio;
    preencherFim(selectInicio, selectFim, fim);
  }

  function preencherFim(selectInicio, selectFim, fimDesejado) {
    const inicio = Number(selectInicio.value);
    selectFim.replaceChildren(
      ...Array.from({ length: FECHAMENTO - inicio }, (_, i) => {
        const h = inicio + 1 + i;
        return criar('option', { value: h }, `${pad(h)}:00`);
      })
    );
    const alvo = fimDesejado && fimDesejado > inicio ? fimDesejado : inicio + 1;
    selectFim.value = Math.min(alvo, FECHAMENTO);
  }

  function resetarCancelamento() {
    confirmandoCancelamento = false;
    const b = el('btn-cancelar-reserva');
    b.textContent = 'Cancelar reserva';
    b.classList.remove('confirmando');
  }

  function abrirModal({ salaId, hora, reserva }) {
    const edicao = !!reserva;
    el('modal-erro').classList.add('hidden');
    resetarCancelamento();

    el('modal-titulo').textContent = edicao ? 'Editar reserva' : 'Nova reserva';
    el('btn-salvar').textContent = edicao ? 'Salvar alterações' : 'Reservar sala';
    el('btn-cancelar-reserva').classList.toggle('hidden', !edicao);
    el('reserva-id').value = edicao ? reserva.id : '';
    el('reserva-titulo').value = edicao ? reserva.titulo : '';

    el('reserva-sala').replaceChildren(
      ...estado.salas.map((s) => criar('option', { value: s.id }, s.nome))
    );
    el('reserva-sala').value = edicao ? reserva.sala_id : salaId;

    const dia = edicao ? reserva.data_hora_inicio.slice(0, 10) : estado.dia;
    el('reserva-data').value = dia;
    el('reserva-data').min = hojeISO();

    preencherHoras(
      el('reserva-inicio'),
      el('reserva-fim'),
      edicao ? horaDe(reserva.data_hora_inicio) : hora,
      edicao ? horaDe(reserva.data_hora_fim) : hora + 1
    );

    modal.showModal();
    el('reserva-titulo').focus();
  }

  el('reserva-inicio').addEventListener('change', () =>
    preencherFim(el('reserva-inicio'), el('reserva-fim'), Number(el('reserva-fim').value))
  );
  el('modal-fechar').addEventListener('click', () => modal.close());
  el('btn-fechar-modal').addEventListener('click', () => modal.close());
  // Clique no fundo escuro fecha o modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  el('reserva-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const caixa = el('modal-erro');
    caixa.classList.add('hidden');

    const dia = el('reserva-data').value;
    if (!dia) return mostrarErro(caixa, 'Escolha o dia da reserva.');

    const dados = {
      titulo: el('reserva-titulo').value.trim(),
      sala_id: Number(el('reserva-sala').value),
      data_hora_inicio: dataHora(dia, Number(el('reserva-inicio').value)),
      data_hora_fim: dataHora(dia, Number(el('reserva-fim').value)),
    };
    if (dados.titulo.length < 2) return mostrarErro(caixa, 'Informe o nome da aula ou ensaio.');

    const id = el('reserva-id').value;
    const botao = el('btn-salvar');
    botao.disabled = true;
    try {
      if (id) await API.atualizar(id, dados);
      else await API.criar(dados);

      modal.close();
      aviso(id ? 'Reserva atualizada.' : 'Sala reservada.');
      if (estado.visao === 'agenda') {
        estado.dia = dia; // leva a agenda para o dia reservado
        carregarDia();
      } else {
        carregarMinhas();
      }
    } catch (err) {
      mostrarErro(caixa, err.message);
      // Em caso de choque, atualiza a agenda: alguém pode ter reservado o horário agora
      if (err.status === 409 && estado.visao === 'agenda') carregarDia();
    } finally {
      botao.disabled = false;
    }
  });

  el('btn-cancelar-reserva').addEventListener('click', async () => {
    if (!confirmandoCancelamento) {
      confirmandoCancelamento = true;
      el('btn-cancelar-reserva').textContent = 'Confirmar cancelamento';
      el('btn-cancelar-reserva').classList.add('confirmando');
      return;
    }
    await cancelarReserva(Number(el('reserva-id').value));
  });

  /* ---------------- atualização automática ---------------- */
  // Outros professores reservam a todo momento: recarrega a agenda a cada minuto
  setInterval(() => {
    if (!document.hidden && estado.usuario && estado.visao === 'agenda' && !modal.open) carregarDia();
  }, 60000);

  /* ---------------- início ---------------- */
  (async function iniciar() {
    if (!API.temSessao()) return mostrarLogin();
    try {
      await mostrarApp(await API.eu());
    } catch {
      API.sair();
      mostrarLogin();
    }
  })();
})();
