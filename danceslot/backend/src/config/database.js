// Configuração e conexão com o banco de dados SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho onde o arquivo do banco SQLite será salvo
const dbPath = path.resolve(__dirname, '../../database.sqlite');

// Abre/cria a conexão com o arquivo do banco
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite com sucesso.');
  }
});

// Inicialização das tabelas
db.serialize(() => {
  // Cria a tabela de agendamentos caso ainda não exista
  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      dancarino_responsavel TEXT NOT NULL,
      data_hora_inicio TEXT NOT NULL,
      data_hora_fim TEXT NOT NULL,
      status TEXT DEFAULT 'Confirmado',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;