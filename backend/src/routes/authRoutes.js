// Importa Express, usado para criar o servidor e organizar as rotas HTTP.
const express = require('express');
// Cria o roteador que reúne os caminhos HTTP deste arquivo.
const router = express.Router();
// Importa o módulo authController para usar as funções definidas nele.
const AuthController = require('../controllers/authController');
// Extrai do objeto somente os campos necessários para esta etapa.
const { exigirLogin } = require('../middleware/auth');

// Liga o caminho HTTP à função que vai tratar essa requisição.
router.post('/login', AuthController.login);
// Liga o caminho HTTP à função que vai tratar essa requisição.
router.get('/me', exigirLogin, AuthController.me);

// Permite que os outros arquivos importem esta função ou classe.
module.exports = router;
