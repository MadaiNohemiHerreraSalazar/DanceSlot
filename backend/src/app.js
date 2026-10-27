const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const salaRoutes = require('./routes/salaRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/salas', salaRoutes);
app.use('/api/agendamentos', agendamentoRoutes);

// Qualquer rota /api desconhecida
app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratamento central de erros inesperados
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

module.exports = app;
