const axios = require('axios');
const config = require('../config')
const httpClient = axios.create({ baseURL: config.zarApi });
const sleep = require('../helpers/sleep.jsx');

const ZarClient = require('@zar-network/javascript-sdk')
const crypto = require('@zar-network/javascript-sdk').crypto

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
      console.log(privateKey)
      const client = await this.getClient(privateKey)
      console.log(client)
      const res = await client.issue(accountDetails.address, data.name, data.symbol, data.total_supply, !data.mintable)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e.toString())
      callback(e.toString())
    }
  },

  async mint(data, assetDetails, privateKey, fromAddress, toAddress, callback) {
    try {

      console.log(fromAddress, assetDetails.asset_id, data.amount, toAddress)
      console.log(privateKey)

      const client = await this.getClient(privateKey)
      const res = await client.mint(fromAddress, assetDetails.asset_id, data.amount, toAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e.toString())
      callback(e.toString())
    }
  },

  async getTransactionDetails(txId, callback) {
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

  async getTransaction(txId) {
    const url = `${config.zarApi}/txs/${txId}`;

    try {
      console.log(`calling ${url}`)
      const apiRes = await axios.get(url);
      return apiRes.data
    } catch (err) {
      if(err.response && err.response.status && err.response.status == 404) {
        return err.response.data
      } else {
        return null
      }
    }
  },

  async verifyTransactionSuccess(txId, callback) {
    let retries = 10
    let response = null;

    while(retries > 0) {
      const transactionDetails = await zar.getTransaction(txId)

      console.log(transactionDetails)
      if(transactionDetails.error) {
        response = transactionDetails
        await sleep(1000)
      } else if(transactionDetails.logs[0].success) {
        const succ = transactionDetails.logs[0].success
        if(succ) {
          response = transactionDetails
          break;
        }
      }

      retries--
    }

    callback(null, response)
  },

  async burn(data, assetDetails, privateKey, address, callback) {
    try {

      console.log(address, assetDetails.asset_id, data.amount)
      console.log('PRIVATE KEY: '+privateKey)

      const client = await this.getClient(privateKey)
      const res = await client.burn(address, assetDetails.asset_id, data.amount)

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
