const {
  db,
  encryption,
  otpHelper,
  sms
} = require('../helpers');

const otp = {
  requestOTP(req, res, next) {
    const OTP = otpHelper.generateOTP()
    const token = encryption.decodeToken(req, res)

    otp.getUserDetails(token.user, (err, userDetails) => {
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

      otp.insertOTP(token.user, OTP, (err, otpUUID) => {

        const OTPMessage = 'Your XAR Network OTP is: '+OTP
        sms.send(userDetails.mobile_number, OTPMessage, (err) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          otp.updateOTPSent(otpUUID, (err) => {
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
  },

  getUserDetails(user, callback) {
    db.oneOrNone('select * from users where uuid = $1;',
    [user.uuid])
    .then((user) => {
      callback(null, user)
    })
    .catch(callback)
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

  verifyOTP(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {
      const validation = otp.validateVerifyOTP(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      otp.selectOTP(token.user, data.pin, (err, otpDetails) => {
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

        if(!otpHelper.validateOTP(data.pin)) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Invalid OTP' }
          return next(null, req, res, next)
        }

        otp.updateOTPValidated(otpDetails.uuid, (err) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': 'Valid OTP' }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateVerifyOTP(data) {
    const {
      pin
    } = data

    if(!pin) {
      return 'pin is required'
    }

    return true
  },

  selectOTP(user, pin, callback) {
    db.oneOrNone('select * from otp where user_uuid = $1 and token = $2;', [user.uuid, pin])
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
}

module.exports = otp
