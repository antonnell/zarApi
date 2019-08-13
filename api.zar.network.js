const express = require('express')
const compression = require('compression')
const routes  = require('./routes')
const morgan = require('morgan')
const helmet = require('helmet')
const https = require('https')
const auth = require('http-auth')

/*  RTgwRjM3RjUyQkM0QzY0RUJCRkU0QURCQkNDNzU2RDUyRDI3MDQ0NUJCQTRCMjhEODkwRTg1MjQzNjlFNEJFMjo1Njg0NjJDNEI4MDhGQkRDRTZFRTE3MjhBQTNEN0M2RTgwMjQxMzMyMzk3NUQzRUI4MTM3MkFBNTEwRDUwQ0U3 */
var basic = auth.basic({ realm: 'zar.network' }, function (username, password, callback) {
  callback(username === 'E80F37F52BC4C64EBBFE4ADBBCC756D52D270445BBA4B28D890E8524369E4BE2' && password === '568462C4B808FBDCE6EE1728AA3D7C6E802413323975D3EB81372AA510D50CE7')
})

var app = express()

app.all('/*', function(req, res, next) {
  // CORS headers
  res.set('Content-Type', 'application/json')
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST,OPTIONS')
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization,Username,Password,Signature,X-Access-Token,X-Key')
  if (req.method == 'OPTIONS') {
    res.status(200).end()
  } else {
    next()
  }
})

app.use(morgan('dev'))

app.use(auth.connect(basic))
app.use(helmet())
app.use(compression())

app.use('/', routes)

function handleData(req, res) {
  res.set('Content-Type', 'application/json')
  res.setHeader('Content-Type', 'application/json')

  if (res.statusCode === 205) {
    if (res.body) {
      if (res.body.length === 0) {
        res.status(204)
        res.json({
          'status': 204,
          'result': 'No Content'
        })
      } else {
        res.status(200)
        res.json(res.body)
      }
    } else {
      res.status(204)
      res.json({
        'status': 204,
        'result': 'No Content'
      })
    }
  } else if (res.statusCode === 400) {
    res.status(res.statusCode)
    if (res.body) {
      res.json(res.body)
    } else {
      res.json({
        'status': res.statusCode,
        'success': false,
        'result': 'Bad Request'
      })
    }

  } else if (res.statusCode === 401) {
    res.status(res.statusCode)
    if (res.body) {
      res.json(res.body)
    } else {
      res.json({
        'status': res.statusCode,
        'success': false,
        'result': 'Unauthorized'
      })
    }
  } else if (res.statusCode) {
    res.status(res.statusCode)
    res.json(res.body)
  } else {
    res.status(200)
    res.json(res.body)
  }
}
app.use(handleData)
app.use(function(err, req, res) {
  res.setHeader('Content-Type', 'application/json')

  if (err) {
    if (res.statusCode == 500) {
      res.status(250)
      res.json({
        'status': 250,
        'result': err
      })
    } else if (res.statusCode == 501) {
      res.status(250)
      res.json({
        'status': 250,
        'result': err
      })
    } else {
      res.status(500)
      res.json({
        'status': 500,
        'result': err.message
      })
    }
  } else {
    res.status(404)
    res.json({
      'status': 404,
      'result': 'Request not found'
    })
  }
})

https.globalAgent.maxSockets = 50
app.set('port', 8000)
var server = null
server = require('http').Server(app)
server.listen(app.get('port'), function () {
  console.log('api.zar.network',server.address().port)
  module.exports = server
})

Array.prototype.contains = function(obj) {
  var i = this.length
  while (i--) {
    if (this[i] === obj) {
      return true
    }
  }
  return false
}
