const axios = require('axios');
const config = require('../config')
const httpClient = axios.create({ baseURL: config.zarApi });

const ZarClient = require('@zar-network/javascript-sdk')

const zar = {
  async getClient(privateKey) {
    const client = new ZarClient(config.zarApi)
    await client.initChain()
    if(privateKey) {
      await client.setPrivateKey(privateKey)
    }
    return client
  },

  async createKey(name, password, callback) {
    try {
      const client = await this.getClient()
      const res = client.createAccountWithMneomnic()
      callback(null, res)
    } catch(e) {
      callback(e)
    }
  },

  async issue(data, accountDetails, privateKey, callback) {
    try {
      const client = await this.getClient(privateKey)
      const res = await client.tokens.issue(accountDetails.address, data.name, data.symbol, data.total_supply, data.mintable)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e.toString())
      callback(e.toString())
    }
  },

  async mint(data, assetDetails, privateKey, address, callback) {
    try {

      console.log(address, assetDetails.asset_id, data.amount)
      console.log(privateKey)

      const client = await this.getClient(privateKey)
      const res = await client.tokens.mint(address, assetDetails.asset_id, data.amount)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      if(data.address != address) {

        //call the transfer
        const transferData = {
          amount: data.amount,
          asset_id: assetDetails.asset_id,
          reference: 'Mint Asset'
        }
        const beneficiary = {
          address: data.address
        }

        zar.transfer(transferData, beneficiary, privateKey, address, callback)

      } else {
        callback(null, res)
      }
    } catch(e) {
      console.log(e.toString())
      callback(e.toString())
    }
  },

  getTransaction(txId, callback) {
    const url = `${config.zarApi}/txs/${txId}`;

    httpClient
      .get(url)
      .then((res) => {
        callback(null, res.data)
      })
      .catch((error) => {
        callback(error)
      });

  },

  async burn(data, assetDetails, privateKey, address, callback) {
    try {

      console.log(address, assetDetails.asset_id, data.amount)
      console.log('PRIVATE KEY: '+privateKey)

      const client = await this.getClient(privateKey)
      const res = await client.tokens.burn(address, assetDetails.asset_id, data.amount)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)

    } catch(e) {
      console.log(e.toString())
      callback(e.toString())
    }
  },

  async transfer(data, beneficiary, privateKey, address, callback) {

    try {

      const client = await this.getClient(privateKey)
      const getAccount = await client.getAccount(address)

      console.log('***RESPONSE FOR GET***')
      console.log(getAccount.result.result.value.sequence)
      console.log('***RESPONSE FOR GET***')

      console.log(address, beneficiary.address, data.amount, data.asset_id, data.reference, getAccount.result.result.value.sequence)

      const res = await client.transfer(address, beneficiary.address, data.amount, data.asset_id, data.reference, getAccount.result.result.value.sequence)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e.toString())
      callback(e.toString())
    }
  },

  freeze(amount, symbol, keyName, callback) {

  },

  unfreeze(amount, symbol, keyName, callback) {

  },

  async getBalances(address, callback) {
    try {
      const client = await this.getClient()
      const res = await client.getBalance(address)
      callback(null, res)
    } catch(e) {
      console.log(e.toString())
      callback(e.toString())
    }
  },

  getTransactions(address, symbol, callback) {

  },

  getIssueList(callback) {
    const url = `${config.zarApi}/issue/list`;

    httpClient
      .get(url)
      .then((res) => {
        callback(null, res.data)
      })
      .catch((error) => {
        callback(error)
      });
  },
}

module.exports = zar
