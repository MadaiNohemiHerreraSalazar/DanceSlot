// Ponto de entrada da aplicação
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`DanceSlot API Rodando!`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log(`=================================`);
});