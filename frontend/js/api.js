// Camada responsável pelas chamadas HTTP (Fetch API) para o backend.
// O token de sessão fica no sessionStorage: some quando a aba é fechada.
const API = (() => {
  const CHAVE_TOKEN = 'danceslot_token';
  let aoExpirar = () => {};

  const token = () => sessionStorage.getItem(CHAVE_TOKEN);

  async function chamar(metodo, url, corpo) {
    const headers = { 'Content-Type': 'application/json' };
    if (token()) headers.Authorization = `Bearer ${token()}`;

    let res;
    try {
      res = await fetch(url, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
    } catch {
      throw new Error('Não foi possível conectar ao servidor.');
    }

    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));

    if (res.status === 401 && token()) {
      sessionStorage.removeItem(CHAVE_TOKEN);
      aoExpirar();
    }
    if (!res.ok) {
      const erro = new Error(json.erros ? json.erros.join(' ') : json.erro || 'Erro inesperado.');
      erro.status = res.status;
      throw erro;
    }
    return json;
  }

  return {
    temSessao: () => !!token(),
    aoExpirarSessao: (fn) => { aoExpirar = fn; },

    async entrar(email, senha) {
      const dados = await chamar('POST', '/api/auth/login', { email, senha });
      sessionStorage.setItem(CHAVE_TOKEN, dados.token);
      return dados.usuario;
    },
    sair() { sessionStorage.removeItem(CHAVE_TOKEN); },
    async eu() { return (await chamar('GET', '/api/auth/me')).usuario; },

    salas: () => chamar('GET', '/api/salas'),
    agendamentos: (de, ate) => chamar('GET', `/api/agendamentos?de=${de}&ate=${ate}`),
    minhas: () => chamar('GET', '/api/agendamentos/minhas'),
    criar: (dados) => chamar('POST', '/api/agendamentos', dados),
    atualizar: (id, dados) => chamar('PUT', `/api/agendamentos/${id}`, dados),
    excluir: (id) => chamar('DELETE', `/api/agendamentos/${id}`),
  };
})();
