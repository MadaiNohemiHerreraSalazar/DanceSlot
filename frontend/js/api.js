// Camada responsável pelas chamadas HTTP (Fetch API) para o backend.
// O token de sessão fica no sessionStorage: some quando a aba é fechada.
// Reúne as funções usadas para conversar com o backend.
const API = (() => {
  // Define a chave usada para encontrar o token no sessionStorage.
  const CHAVE_TOKEN = 'danceslot_token';
  // Guarda em aoExpirar o resultado necessário para as próximas operações.
  let aoExpirar = () => {};

  // Extrai o token de sessão enviado no cabeçalho HTTP.
  const token = () => sessionStorage.getItem(CHAVE_TOKEN);

  // Define a função chamar, que concentra esta parte da lógica.
  async function chamar(metodo, url, corpo) {
    // Guarda em headers o resultado necessário para as próximas operações.
    const headers = { 'Content-Type': 'application/json' };
    // Confere a condição antes de executar o trecho seguinte.
    if (token()) headers.Authorization = `Bearer ${token()}`;

    // Executa esta instrução para concluir a etapa atual.
    let res;
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Espera a operação assíncrona terminar antes de continuar.
      res = await fetch(url, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
    } catch {
      // Interrompe o comando e explica o motivo no erro.
      throw new Error('Não foi possível conectar ao servidor.');
    }

    // Confere a condição antes de executar o trecho seguinte.
    if (res.status === 204) return null;
    // Guarda em json o resultado necessário para as próximas operações.
    const json = await res.json().catch(() => ({}));

    // Confere a condição antes de executar o trecho seguinte.
    if (res.status === 401 && token()) {
      // Chama removeItem para concluir esta etapa.
      sessionStorage.removeItem(CHAVE_TOKEN);
      // Chama aoExpirar para concluir esta etapa.
      aoExpirar();
    }
    // Confere a condição antes de executar o trecho seguinte.
    if (!res.ok) {
      // Guarda em erro o resultado necessário para as próximas operações.
      const erro = new Error(json.erros ? json.erros.join(' ') : json.erro || 'Erro inesperado.');
      // Atualiza erro.status com o resultado desta expressão.
      erro.status = res.status;
      // Executa esta instrução para concluir a etapa atual.
      throw erro;
    }
    // Devolve o valor calculado para quem chamou a função.
    return json;
  }

  // Devolve o valor calculado para quem chamou a função.
  return {
    // Define o campo temSessao usado neste objeto.
    temSessao: () => !!token(),
    // Define o campo aoExpirarSessao usado neste objeto.
    aoExpirarSessao: (fn) => { aoExpirar = fn; },

    async entrar(email, senha) {
      // Guarda os campos que serão validados ou enviados ao banco.
      const dados = await chamar('POST', '/api/auth/login', { email, senha });
      // Chama setItem para concluir esta etapa.
      sessionStorage.setItem(CHAVE_TOKEN, dados.token);
      // Devolve o valor calculado para quem chamou a função.
      return dados.usuario;
    },
    sair() { sessionStorage.removeItem(CHAVE_TOKEN); },
    async eu() { return (await chamar('GET', '/api/auth/me')).usuario; },

    // Define o campo salas usado neste objeto.
    salas: () => chamar('GET', '/api/salas'),
    // Define o campo agendamentos usado neste objeto.
    agendamentos: (de, ate) => chamar('GET', `/api/agendamentos?de=${de}&ate=${ate}`),
    // Define o campo minhas usado neste objeto.
    minhas: () => chamar('GET', '/api/agendamentos/minhas'),
    // Define o campo criar usado neste objeto.
    criar: (dados) => chamar('POST', '/api/agendamentos', dados),
    // Define o campo atualizar usado neste objeto.
    atualizar: (id, dados) => chamar('PUT', `/api/agendamentos/${id}`, dados),
    // Define o campo excluir usado neste objeto.
    excluir: (id) => chamar('DELETE', `/api/agendamentos/${id}`),
  };
})();
