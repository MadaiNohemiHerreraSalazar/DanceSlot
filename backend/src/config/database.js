// Configuração, conexão e criação das tabelas do banco SQLite
// Importa biblioteca de acesso ao banco SQLite.
const sqlite3 = require('sqlite3').verbose();
// Importa módulo que ajuda a montar caminhos de arquivos.
const path = require('path');
// Importa o módulo senha para usar as funções definidas nele.
const Senha = require('../utils/senha');

// Monta o caminho do arquivo do banco SQLite.
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../database.sqlite');

// Abre a conexão com o banco SQLite.
const db = new sqlite3.Database(dbPath, (err) => {
  // Se a conexão com o banco falhou, mostra o erro no terminal.
  if (err) console.error('Erro ao conectar ao banco SQLite:', err.message);
});

// Versões com Promise para usar async/await nos models
// Adapta comandos SQL de escrita para poderem ser aguardados com async/await.
const run = (sql, params = []) =>
  // Cria uma Promise para que a operação possa ser aguardada com async/await.
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      // Se o comando SQL falhou, rejeita a Promise e devolve o erro a quem chamou.
      if (err) return reject(err);
      // Chama resolve para concluir esta etapa.
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

// Adapta uma consulta SQL que retorna uma única linha.
const get = (sql, params = []) =>
  // Cria uma Promise para que a operação possa ser aguardada com async/await.
  new Promise((resolve, reject) => {
    // Chama get para concluir esta etapa.
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

// Adapta uma consulta SQL que retorna várias linhas.
const all = (sql, params = []) =>
  // Cria uma Promise para que a operação possa ser aguardada com async/await.
  new Promise((resolve, reject) => {
    // Chama all para concluir esta etapa.
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

// Lista as salas que serão cadastradas na primeira execução do banco.
const SALAS_INICIAIS = [
  // Define os dados de uma sala que será cadastrada na primeira execução.
  ['Sala Aurora', 'Ballet e dança clássica, com barras e espelhos', 20],
  // Define os dados de uma sala que será cadastrada na primeira execução.
  ['Sala Ritmo', 'Danças urbanas e jazz, piso de alta absorção', 25],
  // Define os dados de uma sala que será cadastrada na primeira execução.
  ['Sala Contemporâneo', 'Dança contemporânea e improvisação', 18],
  // Define os dados de uma sala que será cadastrada na primeira execução.
  ['Sala Palco', 'Ensaios gerais, com marcação do palco principal', 40],
];

// Lista os usuários de exemplo criados quando ainda não há usuários.
const PROFESSORES_INICIAIS = [
  // Define o nome e o e-mail de um professor de exemplo.
  ['Amanda Ribeiro', 'amanda@danceslot.com'],
  // Define o nome e o e-mail de um professor de exemplo.
  ['Bruno Teixeira', 'bruno@danceslot.com'],
  // Define o nome e o e-mail de um professor de exemplo.
  ['Carla Mendes', 'carla@danceslot.com'],
];
// Define a senha temporária usada nos usuários de exemplo.
const SENHA_INICIAL = 'danca123';

// Prepara o banco e cria as tabelas e os dados iniciais quando necessário.
async function inicializar() {
  // Espera a operação assíncrona terminar antes de continuar.
  await run('PRAGMA foreign_keys = ON');

  // Espera a operação assíncrona terminar antes de continuar.
  await run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Espera a operação assíncrona terminar antes de continuar.
  await run(`
    CREATE TABLE IF NOT EXISTS salas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      capacidade INTEGER
    )
  `);

  // Migração: a versão antiga não tinha sala nem usuário. Se o banco antigo
  // existir, a tabela é preservada com outro nome e uma nova é criada.
  // Guarda em colunas o resultado necessário para as próximas operações.
  const colunas = await all('PRAGMA table_info(agendamentos)');
  // Confere a condição antes de executar o trecho seguinte.
  if (colunas.length > 0 && !colunas.some((c) => c.name === 'sala_id')) {
    // Espera a operação assíncrona terminar antes de continuar.
    await run('ALTER TABLE agendamentos RENAME TO agendamentos_antigos');
  }

  // Espera a operação assíncrona terminar antes de continuar.
  await run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sala_id INTEGER NOT NULL REFERENCES salas(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      titulo TEXT NOT NULL,
      data_hora_inicio TEXT NOT NULL,
      data_hora_fim TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Espera a operação assíncrona terminar antes de continuar.
  await run(
    // Define o texto que será usado nesta resposta ou configuração.
    'CREATE INDEX IF NOT EXISTS idx_agendamentos_sala_inicio ON agendamentos (sala_id, data_hora_inicio)'
  );

  // Dados iniciais (apenas na primeira execução)
  // Espera a operação assíncrona terminar antes de continuar.
  const { total: totalSalas } = await get('SELECT COUNT(*) AS total FROM salas');
  // Cadastra as salas de exemplo somente quando a tabela está vazia.
  if (totalSalas === 0) {
    // Repete o trecho para cada item da lista ou intervalo.
    for (const [nome, descricao, capacidade] of SALAS_INICIAIS) {
      // Espera a operação assíncrona terminar antes de continuar.
      await run('INSERT INTO salas (nome, descricao, capacidade) VALUES (?, ?, ?)', [nome, descricao, capacidade]);
    }
  }

  // Espera a operação assíncrona terminar antes de continuar.
  const { total: totalUsuarios } = await get('SELECT COUNT(*) AS total FROM usuarios');
  // Cria os professores de exemplo somente quando ainda não existem usuários.
  if (totalUsuarios === 0) {
    // Guarda o hash da senha, sem precisar armazenar a senha original.
    const hash = await Senha.gerarHash(SENHA_INICIAL);
    // Repete o trecho para cada item da lista ou intervalo.
    for (const [nome, email] of PROFESSORES_INICIAIS) {
      // Espera a operação assíncrona terminar antes de continuar.
      await run('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', [nome, email, hash]);
    }
    // Mostra uma mensagem no terminal.
    console.log('Professores de exemplo criados (senha de todos: ' + SENHA_INICIAL + '):');
    // Executa esta ação para cada item da lista.
    PROFESSORES_INICIAIS.forEach(([nome, email]) => console.log(`  - ${nome}: ${email}`));
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = { db, run, get, all, inicializar };
