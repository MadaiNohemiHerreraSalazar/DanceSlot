const express = require('express');
const cors = require('cors');
const path = require('path');
const agendamentoRoutes = require('./routes/agendamentoRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/api/agendamentos', agendamentoRoutes);

module.exports = app;