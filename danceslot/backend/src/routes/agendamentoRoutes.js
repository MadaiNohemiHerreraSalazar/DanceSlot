// Definição das rotas e vinculação com as funções do Controller
const express = require('express');
const router = express.Router();
const AgendamentoController = require('../controllers/agendamentoController');

// Rotas da API para a entidade Agendamento
router.get('/', AgendamentoController.listar);
router.get('/:id', AgendamentoController.buscarPorId);
router.post('/', AgendamentoController.criar);
router.put('/:id', AgendamentoController.atualizar);
router.delete('/:id', AgendamentoController.excluir);

module.exports = router;