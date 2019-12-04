const axios = require('axios');
const config = require('../config')
const httpClient = axios.create({ baseURL: config.zarApi });
const sleep = require('../helpers/sleep.jsx');

const XarClient = require('@xar-network/javascript-sdk')
const crypto = require('@xar-network/javascript-sdk').crypto

const zar = {
  async getClient(privateKey) {
    const client = new XarClient(config.zarApi)
    await client.initChain()
    if(privateKey) {
      await client.setPrivateKey(privateKey)
    }
    return client
  },

  async createKey(callback) {
    try {
      const client = await this.getClient()
      const res = client.createAccountWithMneomnic()
      callback(null, res)
    } catch(e) {
      callback(e)
    }
  },

  async createSavingsAccount(callback) {
    try {
      const client = await this.getClient()
      const res = client.createSavingsAccount()
      callback(null, res)
    } catch(e) {
      callback(e)
    }
  },

  async issue(data, accountDetails, privateKey, callback) {
    try {
      const client = await this.getClient(privateKey)
      console.log(accountDetails.address, data.name, data.symbol, data.total_supply, !data.mintable, 18, '', data.owner_burnable, data.holder_burnable, data.from_burnable, !data.freezable)

      const res = await client.issue(accountDetails.address, data.name, data.symbol, data.total_supply, !data.mintable)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
      console.log(e.toString())
      callback(e.toString())
    }
  },

  async mint(data, assetDetails, privateKey, fromAddress, toAddress, callback) {
    try {
      console.log(fromAddress, assetDetails.asset_id, data.amount, toAddress)

      const client = await this.getClient(privateKey)
      const res = await client.mint(fromAddress, assetDetails.asset_id, data.amount, toAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
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

      if(transactionDetails.error) {
        response = transactionDetails
        await sleep(1000)
      } else if(transactionDetails.logs[0].success === true) {
        const succ = transactionDetails.logs[0].success
        if(succ) {
          response = transactionDetails
          break;
        }
      } else {
        response = transactionDetails
      }

      retries--
    }

    callback(null, response)
  },

  async burn(data, assetDetails, privateKey, fromAddress, toAddress, callback) {
    try {
      console.log(fromAddress, assetDetails.asset_id, data.amount, toAddress)

      const client = await this.getClient(privateKey)
      const res = await client.burn(fromAddress, assetDetails.asset_id, data.amount, toAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)

    } catch(e) {
      console.log(e)
      console.log(e.toString())
      callback(e.toString())
    }
  },

  async transfer(data, beneficiary, privateKey, address, callback) {

    try {
      console.log(data, beneficiary, privateKey, address)
      const client = await this.getClient(privateKey)

      console.log(address, beneficiary.address, data.amount, data.asset_id, data.reference)
      const res = await client.transfer(address, beneficiary.address, data.amount, data.asset_id, data.reference)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
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
      console.log(e)
      console.log(e.toString())
      callback(e.toString())
    }
  },

  getTransactions(address, symbol, callback) {
    //TODO: Implement
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

  getDenomList(callback) {
    const url = `${config.zarApi}/supply/total`;

    httpClient
      .get(url)
      .then((res) => {
        callback(null, res.data)
      })
      .catch((error) => {
        callback(error)
      });
  },

  async getDenomPrice(denom, callback) {
    try {
      const client = await this.getClient()
      const res = await client.getCurrentPrice(denom)
      console.log('RESPONSE FOR GET DENOM PRICE FOR ', denom)
      console.log(res)
      console.log('END RESPONSE FOR GET DENOM PRICE END')
      callback(null, res)
    } catch(e) {
      callback(e.toString())
    }
  },

  async getCSDT(address, denom, callback) {
    try {
      const client = await this.getClient()
      const res = await client.getCSDT(address, denom)

      callback(null, res)
    } catch(e) {
      callback(e)
    }
  },

  async createCSDT(privateKey, fromAddress, collateralDenom, collateralChange, debtChange, callback) {

    try {
      console.log(fromAddress, collateralDenom, collateralChange, debtChange)

      const client = await this.getClient(privateKey)
      const msg = client.CSDT.createOrModifyCSDT(fromAddress, collateralDenom, collateralChange, debtChange)
      const res = await client.sendTx(msg, fromAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
      callback(e.toString())
    }
  },

  closeCSDT(/* inputs, */callback) {
    return 'ok'
  },

  async paybackCSDT(privateKey, fromAddress, collateralDenom, debtChange, callback) {
    try {
      console.log(fromAddress, collateralDenom, debtChange)

      const client = await this.getClient(privateKey)
      const msg = client.CSDT.settleDebt(fromAddress, collateralDenom, "ucsdt", debtChange.toString())
      const res = await client.sendTx(msg, fromAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
      callback(e.toString())
    }
  },

  async generateCSDT(privateKey, fromAddress, collateralDenom, debtChange, callback) {
    try {
      console.log(fromAddress, collateralDenom, debtChange)

      const client = await this.getClient(privateKey)
      const msg = client.CSDT.withdrawDebt(fromAddress, collateralDenom, "ucsdt", debtChange)
      const res = await client.sendTx(msg, fromAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
      callback(e.toString())
    }
  },

  async depositCSDT(privateKey, fromAddress, collateralDenom, collateralChange, callback) {
    try {
      console.log(fromAddress, collateralDenom, collateralChange)

      const client = await this.getClient(privateKey)
      const msg = client.CSDT.depositCollateral(fromAddress, collateralDenom, collateralChange)
      const res = await client.sendTx(msg, fromAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
      callback(e.toString())
    }
  },

  async withdrawCSDT(privateKey, fromAddress, collateralDenom, collateralChange, callback) {
    try {
      console.log(fromAddress, collateralDenom, collateralChange)

      const client = await this.getClient(privateKey)
      const msg = client.CSDT.withdrawCollateral(fromAddress, collateralDenom, collateralChange)
      const res = await client.sendTx(msg, fromAddress)

      console.log('***RESPONSE***')
      console.log(res)
      console.log('***RESPONSE***')

      callback(null, res)
    } catch(e) {
      console.log(e)
      callback(e.toString())
    }
  },

  getCSDTMarkets(/* inputs, */callback) {
    return 'ok'
  },

  getCSDTHistory(/* inputs, */callback) {
    return 'ok'
  },
}

module.exports = zar
