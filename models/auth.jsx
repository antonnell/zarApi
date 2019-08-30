const {
  db,
  encryption,
  otpHelper,
  sms
} = require('../helpers');
const accounts = require('./accounts.jsx')


const auth = {

  login(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = auth.validateLogin(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      auth.getUserDetails(data.mobile_number, data.email_address, (err, userDetails) => {
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

        const saltPassword = encryption.saltPassword(data.password, userDetails.salt)

        if(saltPassword.passwordHash !== userDetails.password) {
          res.status(204)
          res.body = { 'status': 204, 'success': false, 'result': 'Invalid username or password' }
          return next(null, req, res, next)
        }

        //remove password
        delete userDetails.salt
        delete userDetails.password

        //do token stuff, gen auth stuff blah blah blah.
        userDetails.jwt = encryption.genToken(userDetails)

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': userDetails }
        return next(null, req, res, next)
      })
    })
  },

  validateLogin(data) {
    const {
      mobile_number,
      email_address,
      password
    } = data

    if(!mobile_number && !email_address) {
      return 'mobile_number or email_address is required'
    }

    //add email and mobile number validation

    if(!password) {
      return 'password is required'
    }

    return true
  },

  getUserDetails(mobileNumber, emailAddress, callback) {
    db.oneOrNone('select u.uuid, u.firstname, u.lastname, u.mobile_number, u.email_address, up.password, up.salt from users u left join user_passwords up on u.uuid = up.user_uuid where mobile_number = $1 or email_address = $2 order by u.created desc limit 1;', [mobileNumber, emailAddress])
    .then((userDetails) => {
      callback(null, userDetails)
    })
    .catch(callback)
  },

  requestResetPassword(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = auth.validateRequestResetPassword(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      auth.getUserDetails(data.mobile_number, null, (err, userDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!userDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching user found' }
          return next(null, req, res, next)
        }

        const OTP = otpHelper.generateOTP()
        auth.insertOTP(userDetails, OTP, (err, otpUUID) => {

          const OTPMessage = 'Your ZAR Network OTP is: '+OTP
          sms.send(userDetails.mobile_number, OTPMessage, (err) => {

            auth.updateOTPSent(otpUUID, (err) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': 'OTP message sent' }
              return next(null, req, res, next)
            })
          })
        })
      })

    })
  },

  validateRequestResetPassword(data) {
    const {
      mobile_number
    } = data

    if(!mobile_number) {
      return 'mobile_number is required'
    }

    return true
  },

  insertOTP(user, otp, callback) {
    db.oneOrNone('insert into otp (uuid, user_uuid, token, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, now()) returning uuid;', [user.uuid, otp])
    .then((otpUUID) => {
      callback(null, otpUUID.uuid)
    })
    .catch(callback)
  },

  updateOTPSent(otpUUID, callback) {
    db.none('update otp set sent = true, sent_time = now(), modified = now() where uuid = $1', [otpUUID])
    .then(callback)
    .catch(callback)
  },

  verifyResetPassword(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {
      const validation = auth.validateVerifyResetPassword(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      auth.selectOTP(data, (err, otpDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!otpDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Invalid OTP' }
          return next(null, req, res, next)
        }
        //
        // if(!otpHelper.validateOTP(data.pin)) {
        //   res.status(400)
        //   res.body = { 'status': 400, 'success': false, 'result': 'Invalid OTP' }
        //   return next(null, req, res, next)
        // }

        auth.updateOTPValidated(otpDetails.uuid, (err) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': otpDetails.uuid }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateVerifyResetPassword(data) {
    const {
      mobile_number,
      pin
    } = data

    if(!pin) {
      return 'pin is required'
    }

    if(!mobile_number) {
      return 'mobile_number is required'
    }

    return true
  },

  selectOTP(data, callback) {
    db.oneOrNone('select * from otp where user_uuid = (select uuid from users where mobile_number = $1) and token = $2;', [data.mobile_number, data.pin])
    .then((otpDetails) => {
      callback(null, otpDetails)
    })
    .catch(callback)
  },

  updateOTPValidated(otpUUID, callback) {
    db.none('update otp set validated = true, validated_time = now(), modified = now() where uuid = $1', [otpUUID])
    .then(callback)
    .catch(callback)
  },

  setPassword(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {
      const validation = auth.validateSetPassword(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      auth.selectValidationRequest(data.validation_uuid, (err, validationRequest)=> {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!validationRequest || validationRequest.validated !== true) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Invalid authentication' }
          return next(null, req, res, next)
        }

        const password = encryption.saltPassword(data.new_password)
        auth.updatePassword(password, validationRequest, (err) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': 'Password updated' }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateSetPassword(data) {
    const {
      new_password,
      validation_uuid
    } = data

    if(!new_password) {
      return 'new_password is required'
    }

    if(!validation_uuid) {
      return 'validation_uuid is required'
    }

    return true
  },

  selectValidationRequest(uuid, callback) {
    db.oneOrNone('select * from otp where uuid = $1', [uuid])
    .then((something) => {
      callback(null, something)
    })
    .catch(callback)
  },

  updatePassword(password, validationRequest, callback) {
    db.none('update user_passwords set password=$2, salt=$3 where user_uuid = $1;', [validationRequest.user_uuid, password.passwordHash, password.salt])
    .then(callback)
    .catch(callback)
  },

  register(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = auth.validateRegister(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      auth.getUserDetails(data.mobile_number, null, (err, userDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(userDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'User already registered' }
          return next(null, req, res, next)
        }

        const password = encryption.saltPassword(data.password)

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
      email_address,
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

    if(!email_address) {
      return 'email_address is required'
    }

    if(!password) {
      return 'password is required'
    }

    return true
  },

  insertUser(data, password, callback) {
    db.oneOrNone('insert into users (uuid, firstname, lastname, email_address, mobile_number, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, now()) returning uuid, firstname, lastname, email_address, mobile_number;', [data.firstname, data.lastname, data.email_address, data.mobile_number])
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
