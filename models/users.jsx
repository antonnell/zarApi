const {
  db,
  encryption,
} = require('../helpers');

const users = {

  setPin(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = users.validateSetPin(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      users.getUserDetails(token.user, (err, userDetails) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!userDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching user found' }
          return next(null, req, res, next)
        }

        users.getPin(token.user, (err, pinDetails) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          if(pinDetails) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'Account pin already set' }
            return next(null, req, res, next)
          }

          const pinObj = encryption.saltPassword(data.pin)

          users.insertPin(token.user, pinObj, (err) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': 'Name updated' }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

  validateSetPin(data) {
    const {
      pin
    } = data

    if(!pin) {
      return 'pin is required'
    }

    if(pin.length != 6 || isNaN(pin)) {
      return 'pin is invalid'
    }

    return true
  },

  getUserDetails(user, callback) {
    db.oneOrNone('select * from users where uuid = $1;',
    [user.uuid])
    .then((user) => {
      callback(null, user)
    })
    .catch(callback)
  },

  getPin(user, callback) {
    db.oneOrNone('select * from user_pins where user_uuid = $1;',
    [user.uuid])
    .then((pinDetails) => {
      callback(null, pinDetails)
    })
    .catch(callback)
  },

  insertPin(user, pinObj, callback) {
    db.none('insert into user_pins (uuid, user_uuid, pin, salt, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, now());', [user.uuid, pinObj.passwordHash, pinObj.salt])
    .then(callback)
    .catch(callback)
  },

  updateName(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = users.validateUpdateName(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      users.getUserDetails(token.user, (err, userDetails) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!userDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching user found' }
          return next(null, req, res, next)
        }

        users.setName(token.user, data, (err, newUser) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': newUser }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateUpdateName(data) {
    const {
      firstname,
      lastname
    } = data

    if(!firstname) {
      return 'firstname is required'
    }

    if(!lastname) {
      return 'lastname is required'
    }

    return true
  },

  setName(user, data, callback) {
    db.oneOrNone('update users set firstname = $2, lastname = $3 where uuid = $1 returning uuid, firstname, lastname, mobile_number, email_address;', [user.uuid, data.firstname, data.lastname])
    .then((newUser) => {
      callback(null, newUser)
    })
    .catch(callback)
  }

}

module.exports = users
