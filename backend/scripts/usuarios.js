// Gerencia os logins dos funcionários.
// Uso:
//   npm run usuarios -- listar
//   npm run usuarios -- criar "Nome do Professor" email@companhia.com senha123
//   npm run usuarios -- desativar email@companhia.com
//   npm run usuarios -- ativar email@companhia.com
const { inicializar } = require('../src/config/database');
const UsuarioModel = require('../src/models/usuarioModel');
const Senha = require('../src/utils/senha');

async function main() {
  const [comando, ...args] = process.argv.slice(2);
  await inicializar();

  if (comando === 'listar') {
    (await UsuarioModel.listar()).forEach((u) =>
      console.log(`${u.ativo ? 'ativo  ' : 'inativo'}  ${u.nome} <${u.email}>`)
    );
  } else if (comando === 'criar') {
    const [nome, email, senha] = args;
    if (!nome || !email || !senha) throw new Error('Uso: criar "Nome" email senha');
    if (senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
    const u = await UsuarioModel.criar({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senhaHash: await Senha.gerarHash(senha),
    });
    console.log(`Login criado para ${u.nome} (${u.email}).`);
  } else if (comando === 'desativar' || comando === 'ativar') {
    if (!args[0]) throw new Error(`Uso: ${comando} email`);
    const ok = await UsuarioModel.definirAtivo(args[0].trim().toLowerCase(), comando === 'ativar');
    console.log(ok ? `Login ${comando === 'ativar' ? 'ativado' : 'desativado'}.` : 'E-mail não encontrado.');
  } else {
    console.log('Comandos: listar | criar "Nome" email senha | desativar email | ativar email');
  }
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exitCode = 1;
});
