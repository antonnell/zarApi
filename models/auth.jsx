const db = require('../helpers').db;
const encryption = require('../helpers').encryption

const auth = {

  login(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = auth.validateLogin(data)
      if(!validation) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      auth.getUserDetails(mobile_number, (err, userDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!userDetails) {
          res.status(204)
          res.body = { 'status': 204, 'success': false, 'result': 'Invalid username or password' }
          return next(null, req, res, next)
        }

        const saltPassword = encryption.saltPassword(password, userDetails.salt)

        if(saltPassword.passwordHash != userDetails.password) {
          res.status(204)
          res.body = { 'status': 204, 'success': false, 'result': 'Invalid username or password' }
          return next(null, req, res, next)
        }

        //do token stuff, gen auth stuff blah blah blah.
        userDetails.jwt = encryption.genToken(userDetails)

        //remove password
        delete userDetails.salt
        delete userDetails.password

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': userDetails }
        return next(null, req, res, next)
      })
    })
  },

  validateLogin(data) {
    const {
      mobile_number,
      password
    } = data

    if(!mobile_number) {
      return 'mobile_number is required'
    }

    if(!password) {
      return 'password is required'
    }

    return true
  },

  getUserDetails(mobileNumber, callback) {
    db.oneOrNone('select u.uuid, u.firstname, u.lastname, u.mobile_number, u.email_address, up.password, up.salt from users u left join user_passwords up on u.uuid = up.user_uuid where mobile_number = $1;', [mobileNumber])
    .then((userDetails) => {
      callback(null, userDetails)
    })
    .catch(callback)
  },

  requestResetPassword(req, res, next) {

  },

  setPassword(req, res, next) {

  },

  register(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = auth.validateRegister(data)
      if(!validation) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      auth.getUserDetails(mobile_number, (err, userDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(userDetails) {
          res.status(204)
          res.body = { 'status': 204, 'success': false, 'result': 'User already registered' }
          return next(null, req, res, next)
        }

        const password = encryption.saltPassword(req.body.password)

        auth.insertUser(data, password, (err, userDetails) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          //do token stuff, gen auth stuff blah blah blah.
          userDetails.jwt = encryption.genToken(userDetails)

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': userDetails }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateRegister(data) {
    const {
      firstname,
      lastname,
      mobile_number,
      password,
    } = data

    if(!firstname) {
      return 'firstname is required'
    }

    if(!lastname) {
      return 'lastname is required'
    }

    if(!mobile_number) {
      return 'mobile_number is required'
    }

    if(!password) {
      return 'password is required'
    }

    return true
  },

  insertUser(data, password) {
    db.oneOrNone('insert into users (uuid, firstname, surname, email_address, mobile_number, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, now()) returning uuid, firstname, surname, email_address, mobile_number;', [data.firstname, data.lastname, data.email_address, data.mobile_number])
    .then((userDetails) => {
      if(userDetails) {
        db.none('insert into user_passwords (uuid, user_uuid, password, salt, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, now());', [userDetails.uuid, password.passwordHash, password.salt])
        .then(() => {
          callback(null, userDetails)
        })
        .catch(callback)
      } else {
        callback('User not inserted')
      }
    })
    .catch(callback)
  }
}

module.exports = auth
