var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/config.json');
AWS.config.update({region: 'eu-west-1'});

var smser = {

  send: function(mobileNumber, message, callback) {

    // Create publish parameters
    var params = {
      Message: message,
      PhoneNumber: mobileNumber,
    };

    // Create promise and SNS service object
    var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params, callback)
  },
}

module.exports = smser
