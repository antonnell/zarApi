const DB = require('./db.jsx');
const Encryption = require('./encryption.jsx');
const ZarNetwork = require('./zarNetwork.jsx');
const Ethereum = require('./ethereum.jsx');

const helpers = {
  db:  DB,
  encryption: Encryption,
  zarNetwork: ZarNetwork,
  ethereum: Ethereum
}

module.exports = helpers
