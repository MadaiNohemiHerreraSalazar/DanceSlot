// Ponto de entrada da aplicação
const app = require('./src/app');
const { inicializar } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

inicializar()
  .then(() => {
    app.listen(PORT, () => {
      console.log('=================================');
      console.log('DanceSlot rodando!');
      console.log(`Acesse: http://localhost:${PORT}`);
      console.log('=================================');
    });
  })
  .catch((err) => {
    console.error('Falha ao iniciar o banco de dados:', err);
    process.exit(1);
  });
