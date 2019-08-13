const {
  encryption,
} = require('../helpers');

const testing = {
  doNothing(req, res, next) {
    res.status(205)
    res.body = { 'status': 200, 'success': true, 'result': 'Nothing happened' }
    return next(null, req, res, next)
  },

  testEncryption(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {
      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': data }
      return next(null, req, res, next)
    })
  },
}

module.exports = testing
