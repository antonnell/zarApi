const otplib = require('otplib');
const secret = require('../config/secret.jsx')()

const otp = {

  generateOTP() {
    otplib.authenticator.options = {
      window: 5
    }
    const pin = otplib.authenticator.generate(secret);
    return pin
  },

  validateOTP(pin) {
    const isValid = otplib.authenticator.check(pin, secret);
    return isValid
  }
}

module.exports = otp
