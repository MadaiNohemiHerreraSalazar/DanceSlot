// Importa Express, usado para criar o servidor e organizar as rotas HTTP.
const express = require('express');
// Importa CORS, que permite as requisições do navegador conforme a configuração.
const cors = require('cors');
// Importa módulo que ajuda a montar caminhos de arquivos.
const path = require('path');

// Importa o módulo authRoutes para usar as funções definidas nele.
const authRoutes = require('./routes/authRoutes');
// Importa o módulo salaRoutes para usar as funções definidas nele.
const salaRoutes = require('./routes/salaRoutes');
// Importa o módulo agendamentoRoutes para usar as funções definidas nele.
const agendamentoRoutes = require('./routes/agendamentoRoutes');

// Guarda em app o resultado necessário para as próximas operações.
const app = express();

// Desativa uma informação padrão que o Express enviaria na resposta.
app.disable('x-powered-by');
// Registra um middleware ou conjunto de rotas no Express.
app.use(cors());
// Registra um middleware ou conjunto de rotas no Express.
app.use(express.json({ limit: '10kb' }));
// Registra um middleware ou conjunto de rotas no Express.
app.use(express.static(path.join(__dirname, '../../frontend')));

// Registra um middleware ou conjunto de rotas no Express.
app.use('/api/auth', authRoutes);
// Registra um middleware ou conjunto de rotas no Express.
app.use('/api/salas', salaRoutes);
// Registra um middleware ou conjunto de rotas no Express.
app.use('/api/agendamentos', agendamentoRoutes);

// Qualquer rota /api desconhecida
// Registra um middleware ou conjunto de rotas no Express.
app.use('/api', (req, res) => {
  // Define o código HTTP e envia o resultado ao navegador.
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratamento central de erros inesperados
// eslint-disable-next-line no-unused-vars
// Registra um middleware ou conjunto de rotas no Express.
app.use((err, req, res, next) => {
  // Mostra o erro no terminal para facilitar a investigação.
  console.error(err);
  // Identifica o erro que acontece quando o JSON recebido não pode ser interpretado.
  if (err.type === 'entity.parse.failed') {
    // Responde com HTTP 400 para indicar que os dados enviados são inválidos.
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  // Define o código HTTP e envia o resultado ao navegador.
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// Permite que os outros arquivos importem esta função ou classe.
module.exports = app;
