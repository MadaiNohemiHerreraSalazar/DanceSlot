const SalaModel = require('../models/salaModel');

class SalaController {
  // GET /api/salas
  static async listar(req, res, next) {
    try {
      res.status(200).json(await SalaModel.listar());
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SalaController;
