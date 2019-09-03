const DB = require('./db.jsx');
const Encryption = require('./encryption.jsx');
const ZarNetwork = require('./zarNetwork.jsx');
// const Ethereum = require('./ethereum.jsx');
const OTP = require('./otp.jsx');
const SMS = require('./smser.jsx');
const Sleep = require('./sleep.jsx');

const helpers = {
  db:  DB,
  encryption: Encryption,
  zarNetwork: ZarNetwork,
  // ethereum: Ethereum,
  otpHelper: OTP,
  sms: SMS,
  sleep: Sleep
}

module.exports = helpers
