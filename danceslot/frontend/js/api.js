// Camada responsável por realizar as chamadas HTTP (Fetch API) para o backend
const API_URL = '/api/agendamentos';

const API = {
  // Buscar todos os agendamentos
  async buscarTodos() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Erro ao buscar lista de agendamentos.');
    return res.json();
  },

  // Criar um novo agendamento
  async criar(dados) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.erros ? json.erros.join(', ') : json.erro);
    return json;
  },

  // Atualizar um agendamento existente
  async atualizar(id, dados) {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.erros ? json.erros.join(', ') : json.erro);
    return json;
  },

  // Excluir um agendamento por ID
  async excluir(id) {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.erro || 'Erro ao excluir agendamento.');
    }
    return true;
  }
};