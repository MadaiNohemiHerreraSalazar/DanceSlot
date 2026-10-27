const express = require('express');
const router = express.Router();
const SalaController = require('../controllers/salaController');
const { exigirLogin } = require('../middleware/auth');

router.get('/', exigirLogin, SalaController.listar);

module.exports = router;
