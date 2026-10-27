// Importa Express, usado para criar o servidor e organizar as rotas HTTP.
const express = require('express');
// Cria o roteador que reúne os caminhos HTTP deste arquivo.
const router = express.Router();
// Importa o módulo salaController para usar as funções definidas nele.
const SalaController = require('../controllers/salaController');
// Extrai do objeto somente os campos necessários para esta etapa.
const { exigirLogin } = require('../middleware/auth');

// Liga o caminho HTTP à função que vai tratar essa requisição.
router.get('/', exigirLogin, SalaController.listar);

// Permite que os outros arquivos importem esta função ou classe.
module.exports = router;
