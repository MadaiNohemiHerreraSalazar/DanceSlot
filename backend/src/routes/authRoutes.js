const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { exigirLogin } = require('../middleware/auth');

router.post('/login', AuthController.login);
router.get('/me', exigirLogin, AuthController.me);

module.exports = router;
