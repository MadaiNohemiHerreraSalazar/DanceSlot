// Gerencia os logins dos funcionários.
// Uso:
//   npm run usuarios -- listar
//   npm run usuarios -- criar "Nome do Professor" email@companhia.com senha123
//   npm run usuarios -- desativar email@companhia.com
//   npm run usuarios -- ativar email@companhia.com
// Extrai do objeto somente os campos necessários para esta etapa.
const { inicializar } = require('../src/config/database');
// Importa o módulo usuarioModel para usar as funções definidas nele.
const UsuarioModel = require('../src/models/usuarioModel');
// Importa o módulo senha para usar as funções definidas nele.
const Senha = require('../src/utils/senha');

// Lê os argumentos do terminal e executa o comando escolhido.
async function main() {
  // Separa o comando e os argumentos informados depois do nome do script.
  const [comando, ...args] = process.argv.slice(2);
  // Espera a operação assíncrona terminar antes de continuar.
  await inicializar();

  // Executa a listagem dos usuários quando esse foi o comando digitado.
  if (comando === 'listar') {
    // Executa esta ação para cada item da lista.
    (await UsuarioModel.listar()).forEach((u) =>
      // Mostra uma mensagem no terminal.
      console.log(`${u.ativo ? 'ativo  ' : 'inativo'}  ${u.nome} <${u.email}>`)
    );
  } else if (comando === 'criar') {
    // Separa o comando e os argumentos informados depois do nome do script.
    const [nome, email, senha] = args;
    // Exige que e-mail e senha tenham sido preenchidos.
    if (!nome || !email || !senha) throw new Error('Uso: criar "Nome" email senha');
    // Não permite criar o usuário com uma senha menor que seis caracteres.
    if (senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
    // Guarda em u o resultado necessário para as próximas operações.
    const u = await UsuarioModel.criar({
      // Remove espaços extras do início e do fim do texto.
      nome: nome.trim(),
      // Remove espaços extras do e-mail e padroniza o texto em letras minúsculas.
      email: email.trim().toLowerCase(),
      // Define o campo senhaHash usado neste objeto.
      senhaHash: await Senha.gerarHash(senha),
    });
    // Mostra uma mensagem no terminal.
    console.log(`Login criado para ${u.nome} (${u.email}).`);
  } else if (comando === 'desativar' || comando === 'ativar') {
    // Confere a condição antes de executar o trecho seguinte.
    if (!args[0]) throw new Error(`Uso: ${comando} email`);
    // Guarda em ok o resultado necessário para as próximas operações.
    const ok = await UsuarioModel.definirAtivo(args[0].trim().toLowerCase(), comando === 'ativar');
    // Mostra uma mensagem no terminal.
    console.log(ok ? `Login ${comando === 'ativar' ? 'ativado' : 'desativado'}.` : 'E-mail não encontrado.');
  } else {
    // Mostra uma mensagem no terminal.
    console.log('Comandos: listar | criar "Nome" email senha | desativar email | ativar email');
  }
}

// Começa a função que será executada quando este evento acontecer.
main().catch((err) => {
  // Mostra o erro no terminal para facilitar a investigação.
  console.error('Erro:', err.message);
  // Marca que o comando terminou com erro.
  process.exitCode = 1;
});
