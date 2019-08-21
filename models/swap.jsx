const {
  encryption,
  zarNetwork
} = require('../helpers');

const swap = {
  swap(req, res, next) {

    res.status(205)
    res.body = { 'status': 200, 'success': true, 'result': 'Swap successful' }
    return next(null, req, res, next)

  },
}

module.exports = swap
