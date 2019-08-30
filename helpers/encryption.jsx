const crypto = require('crypto');
const sha256 = require('sha256');
const jwt = require('jwt-simple')
const algorithm = 'aes-256-ctr';
const bip39 = require('bip39');
const config = require('../config');
const generator = require('generate-password');
const randomstring = require("randomstring");

const encryption = {
  encrypt(text, password){
    var cipher = crypto.createCipher(algorithm,password)
    var crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
  },

  decrypt(text, password){
    var decipher = crypto.createDecipher(algorithm,password)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
  },

  descryptPayload(req, res, next, callback) {
    const {
      m,
      e,
      t,
      s,
      u,
      p
    } = req.body

    if(!m || !e || !t ||!s || !u || !p) {
      res.status(501)
      res.body = { 'status': 501, 'success': false, 'message': 'Invalid payload' }
      return next(null, req, res, next)
    }

    const mnemonic = m.hexDecode()
    const encrypted = e.hexDecode()
    const time = t
    const signature = s

    const sig = {
      e: e,
      m: m,
      u: u,
      p: p,
      t: t
    }
    const seed = JSON.stringify(sig)
    const compareSignature = sha256(seed)

    if (compareSignature !== signature) {
      res.status(501)
      res.body = { 'status': 501, 'success': false, 'message': 'Signature mismatch' }
      return next(null, req, res, next)
    }

    const payload = decrypt(encrypted, mnemonic)

    var data = null
    try {
      data = JSON.parse(payload)
      callback(data)
    } catch (ex) {
      console.log(ex)
      res.status(501)
      res.body = { 'status': 501, 'success': false, 'message': ex }
      return next(null, req, res, next)
    }
  },

  saltPassword(password, salt) {

    if(!salt) {
      salt = encryption.genRandomString(16)
    }

    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    const value = hash.digest('hex');
    return {
      salt:salt,
      passwordHash:value
    };
  },

  genRandomString(length) {
    return crypto.randomBytes(Math.ceil(length/2))
      .toString('hex')
      .slice(0,length);
  },

  genToken(user) {
    var expires = this.expiresIn(1) // 1 days
    var token = jwt.encode({
      exp: expires,
      user: user
    }, require('../config/secretenv.jsx')())
    return {
      token: token,
      expires: expires
    }
  },

  expiresIn(numDays) {
    var dateObj = new Date()
    return dateObj.setDate(dateObj.getDate() + numDays)
  },

  decodeToken(req, res) {
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token']
    var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key']
    if (token || key) {
      try {
        var decoded = jwt.decode(token, require('../config/secretenv.jsx')())
        return decoded
      } catch (err) {
        res.status(500)
        res.json({
          'status': 500,
          'message': 'Oops something went wrong',
          'error': err
        })
      }
    } else {
      res.status(404)
      res.json({
        'status': 404,
        'message': 'Request not found'
      })
      return
    }
  },

  generateMnemonic() {
    return bip39.generateMnemonic()
  },

  hashAccountField(phrase, dbPassword) {

    if(!dbPassword) {
      dbPassword = encryption.generateMnemonic()
    }

    const password = config.encr_key+':'+dbPassword
    const aes256seed = encryption.encrypt(phrase, password)

    return {
      phrase: phrase,
      encryptionKey: dbPassword,
      phraseHashed: aes256seed
    }
  },

  unhashAccountField(phrase, dbPassword) {
    const password = config.encr_key+':'+dbPassword
    const decrypted = encryption.decrypt(phrase, password)

    return decrypted
  },

  genPassword() {
    return generator.generate({
      length: 20,
      numbers: true,
      symbols: false,
      uppercase: true,
      strict: true
    })
  },

  generateRandomString(length) {
    return randomstring.generate({
      length: length,
      charset: 'alphabetic',
      capitalization: 'uppercase'
    })
  }
}

String.prototype.hexEncode = function(){
    var hex, i;
    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }
    return result
}
String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

function decrypt(text,seed){
  var decipher = crypto.createDecipher('aes-256-cbc', seed)
  var dec = decipher.update(text,'base64','utf8')
  dec += decipher.final('utf8');
  return dec;
}


module.exports = encryption
