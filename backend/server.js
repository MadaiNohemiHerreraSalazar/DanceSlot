// Ponto de entrada da aplicação
// Importa o módulo app para usar as funções definidas nele.
const app = require('./src/app');
// Extrai do objeto somente os campos necessários para esta etapa.
const { inicializar } = require('./src/config/database');

// Escolhe a porta do servidor, usando 3000 como padrão.
const PORT = process.env.PORT || 3000;

inicializar()
  // Começa a função que será executada quando este evento acontecer.
  .then(() => {
    // Coloca o servidor para escutar na porta configurada.
    app.listen(PORT, () => {
      // Mostra uma mensagem no terminal.
      console.log('=================================');
      // Mostra uma mensagem no terminal.
      console.log('DanceSlot rodando!');
      // Mostra uma mensagem no terminal.
      console.log(`Acesse: http://localhost:${PORT}`);
      // Mostra uma mensagem no terminal.
      console.log('=================================');
    });
  })
  // Começa a função que será executada quando este evento acontecer.
  .catch((err) => {
    // Mostra o erro no terminal para facilitar a investigação.
    console.error('Falha ao iniciar o banco de dados:', err);
    // Encerra o servidor com código de erro porque a inicialização falhou.
    process.exit(1);
  });
