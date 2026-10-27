// Todas as rotas de reserva exigem login
const express = require('express');
const router = express.Router();
const AgendamentoController = require('../controllers/agendamentoController');
const { exigirLogin } = require('../middleware/auth');

router.use(exigirLogin);

router.get('/', AgendamentoController.listar);
router.get('/minhas', AgendamentoController.listarMinhas); // antes de '/:id'
router.post('/', AgendamentoController.criar);
router.put('/:id', AgendamentoController.atualizar);
router.delete('/:id', AgendamentoController.excluir);

module.exports = router;
