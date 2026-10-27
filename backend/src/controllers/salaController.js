// Importa o módulo salaModel para usar as funções definidas nele.
const SalaModel = require('../models/salaModel');

// Agrupa os métodos de SalaController em uma mesma classe.
class SalaController {
  // GET /api/salas
  // Atende à consulta da rota e devolve os registros encontrados.
  static async listar(req, res, next) {
    // Tenta executar a operação; se ela falhar, o erro será tratado no catch.
    try {
      // Define o código HTTP e envia o resultado ao navegador.
      res.status(200).json(await SalaModel.listar());
    } catch (err) {
      // Entrega o erro ao middleware central do Express.
      next(err);
    }
  }
}

// Permite que os outros arquivos importem esta função ou classe.
module.exports = SalaController;
