var nodemailer = require('nodemailer')
var config = require('../config/config.js')

var emailer = {

  sendMail: function(to, subject, text, callback) {

    var mailOptions = {
      from: '"ZAR Pay" <pay@zar.network>',
      to: to,
      subject: subject,
      html: text
    }

    emailer._sendMail(mailOptions, callback)
  },

  _sendMail: function(mailOptions, callback) {

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.emailerUser,
        pass: config.emailerPassword
      }
    });

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error)
        return
      }
      console.log('Message sent: ' + info.response)

      if (callback != null) {
        callback(error, info)
      }
    })
  }
}

module.exports = emailer
