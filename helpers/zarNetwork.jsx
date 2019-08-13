const axios = require('axios');
const config = require('../config')
const httpClient = axios.create({ baseURL: config.api });

const zar = {
  createKey(name, password, callback) {

  },

  issue(tokenName, totalSupply, symbol, mintable, keyName, password, callback) {

  },

  mint(amount, symbol, keyName, callback) {

  },

  burn(amount, symbol, keyName, callback) {

  },

  transfer(mnemonic, publicTo, amount, asset, message, callback) {

  },

  freeze(amount, symbol, keyName, callback) {

  },

  unfreeze(amount, symbol, keyName, callback) {

  },

  getBalance(address, callback) {

  },

  getTransactions(address, symbol, callback) {

  }
}

module.exports = zar
