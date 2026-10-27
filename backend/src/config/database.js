// Configuração, conexão e criação das tabelas do banco SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const Senha = require('../utils/senha');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erro ao conectar ao banco SQLite:', err.message);
});

// Versões com Promise para usar async/await nos models
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const SALAS_INICIAIS = [
  ['Sala Aurora', 'Ballet e dança clássica, com barras e espelhos', 20],
  ['Sala Ritmo', 'Danças urbanas e jazz, piso de alta absorção', 25],
  ['Sala Contemporâneo', 'Dança contemporânea e improvisação', 18],
  ['Sala Palco', 'Ensaios gerais, com marcação do palco principal', 40],
];

const PROFESSORES_INICIAIS = [
  ['Amanda Ribeiro', 'amanda@danceslot.com'],
  ['Bruno Teixeira', 'bruno@danceslot.com'],
  ['Carla Mendes', 'carla@danceslot.com'],
];
const SENHA_INICIAL = 'danca123';

async function inicializar() {
  await run('PRAGMA foreign_keys = ON');

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
  const colunas = await all('PRAGMA table_info(agendamentos)');
  if (colunas.length > 0 && !colunas.some((c) => c.name === 'sala_id')) {
    await run('ALTER TABLE agendamentos RENAME TO agendamentos_antigos');
  }

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
  await run(
    'CREATE INDEX IF NOT EXISTS idx_agendamentos_sala_inicio ON agendamentos (sala_id, data_hora_inicio)'
  );

  // Dados iniciais (apenas na primeira execução)
  const { total: totalSalas } = await get('SELECT COUNT(*) AS total FROM salas');
  if (totalSalas === 0) {
    for (const [nome, descricao, capacidade] of SALAS_INICIAIS) {
      await run('INSERT INTO salas (nome, descricao, capacidade) VALUES (?, ?, ?)', [nome, descricao, capacidade]);
    }
  }

  const { total: totalUsuarios } = await get('SELECT COUNT(*) AS total FROM usuarios');
  if (totalUsuarios === 0) {
    const hash = await Senha.gerarHash(SENHA_INICIAL);
    for (const [nome, email] of PROFESSORES_INICIAIS) {
      await run('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', [nome, email, hash]);
    }
    console.log('Professores de exemplo criados (senha de todos: ' + SENHA_INICIAL + '):');
    PROFESSORES_INICIAIS.forEach(([nome, email]) => console.log(`  - ${nome}: ${email}`));
  }
}

module.exports = { db, run, get, all, inicializar };
