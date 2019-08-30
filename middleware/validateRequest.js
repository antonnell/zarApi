var jwt = require('jwt-simple')
var sha256 = require('sha256')

module.exports = function(req, res, next) {
  // When performing a cross domain request, you will recieve
  // a preflighted request first. This is to check if our the app
  // is safe.
  // We skip the token outh for [OPTIONS] requests.
  //if(req.method == 'OPTIONS') next()
  var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token']
  var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key']
  if (token || key) {
    try {
      var decoded = jwt.decode(token, require('../config/secretenv.jsx')())
      if (decoded.exp <= Date.now()) {
        res.set('Content-Type', 'application/json')
        res.status(401)
        res.json({
          'status': 401,
          'message': 'Expired'
        })
        return
      }
      if (!decoded.user) {
        res.set('Content-Type', 'application/json')
        res.status(401)
        res.json({
          'status': 401,
          'message': 'User not set'
        })
        return
      }
      if (sha256(decoded.user.email_address) !== key) {
        res.set('Content-Type', 'application/json')
        res.status(401)
        res.json({
          'status': 401,
          'message': 'Invalid token for key'
        })
        return
      }
      next()
      // Authorize the user to see if s/he can access our resources
      //validateUser(req, res, next, decoded.user.username) // The key would be the logged in user's username
    } catch (err) {
      console.log(err)
        res.set('Content-Type', 'application/json')
      res.status(500)
      res.json({
        'status': 500,
        'message': 'Oops something went wrong',
        'error': err
      })
    }
  } else {
    res.set('Content-Type', 'application/json')
    res.status(404)
    res.json({
      'status': 404,
      'message': 'Request not found'
    })
    return
  }
}
