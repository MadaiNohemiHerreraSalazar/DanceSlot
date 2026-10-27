// Todas as rotas de reserva exigem login
// Importa Express, usado para criar o servidor e organizar as rotas HTTP.
const express = require('express');
// Cria o roteador que reúne os caminhos HTTP deste arquivo.
const router = express.Router();
// Importa o módulo agendamentoController para usar as funções definidas nele.
const AgendamentoController = require('../controllers/agendamentoController');
// Extrai do objeto somente os campos necessários para esta etapa.
const { exigirLogin } = require('../middleware/auth');

// Exige a autenticação para as rotas registradas abaixo.
router.use(exigirLogin);

// Liga o caminho HTTP à função que vai tratar essa requisição.
router.get('/', AgendamentoController.listar);
router.get('/minhas', AgendamentoController.listarMinhas); // antes de '/:id'
// Liga o caminho HTTP à função que vai tratar essa requisição.
router.post('/', AgendamentoController.criar);
// Liga o caminho HTTP à função que vai tratar essa requisição.
router.put('/:id', AgendamentoController.atualizar);
// Liga o caminho HTTP à função que vai tratar essa requisição.
router.delete('/:id', AgendamentoController.excluir);

// Permite que os outros arquivos importem esta função ou classe.
module.exports = router;
