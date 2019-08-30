const {
  db,
  encryption,
  zarNetwork
} = require('../helpers');
const async = require('async')

const accounts = {
  createAccount(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = accounts.validateCreateAccount(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      if(data.account_type === 'ZAR') {
        accounts.createZarAccount(req, res, next, data)
      } else if (data.account_type === 'ETH') {
        // accounts.createEthAccount(req, res, next, data)
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': 'account_type is invalid' }
        return next(null, req, res, next)
      } else {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': 'account_type is invalid' }
        return next(null, req, res, next)
      }
    })
  },

  validateCreateAccount(data) {
    const {
      name,
      account_type
    } = data

    if(!name) {
      return 'name is required'
    }

    if(!account_type) {
      return 'account_type is required'
    }

    return true
  },

  createZarAccount(req, res, next, data) {
    const token = encryption.decodeToken(req, res)
    const password = encryption.genPassword()

    zarNetwork.createKey(data.name, password, (err, account) => {
      if(err) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      const encrKey = encryption.generateMnemonic()
      const privateKeyObj = encryption.hashAccountField(account.privateKey, encrKey)
      const mnemonicObj = encryption.hashAccountField(account.mnemonic, encrKey)
      const passwordObj = encryption.hashAccountField(password, encrKey)

      accounts.insertAccount(token.user.uuid, data.name, account.address, privateKeyObj.phraseHashed, mnemonicObj.phraseHashed, passwordObj.phraseHashed, encrKey, data.account_type, (err, createdAccount) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': createdAccount }
        return next(null, req, res, next)
      })
    })
  },

  insertAccount(userUUID, name, address, privateKey, mnemonic, password, encrKey, accountType, callback) {
    db.oneOrNone('insert into accounts (uuid, user_uuid, name, address, private_key, mnemonic, password, encr_key, account_type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, $7, $8, now()) returning uuid, name, address, account_type, created;',
    [userUUID, name, address, privateKey, mnemonic, password, encrKey, accountType])
    .then((account) => {
      callback(null, account)
    })
    .catch(callback)
  },

  // createEthAccount(req, res, next) {
  //
  //   const token = encryption.decodeToken(req, res)
  //   const password = encryption.genPassword()
  //
  //   ethereum.createAccount((err, account) => {
  //
  //     const encrKey = encryption.generateMnemonic()
  //     const privateKeyObj = encryption.hashAccountField(account.privateKey, encrKey)
  //
  //     accounts.insertAccount(token.user.uuid, data.name, account.address, privateKeyObj.phraseHashed, null, null, encrKey, data.account_type, (err, createdAccount) => {
  //       if(err) {
  //         res.status(500)
  //         res.body = { 'status': 500, 'success': false, 'result': err }
  //         return next(null, req, res, next)
  //       }
  //
  //       res.status(205)
  //       res.body = { 'status': 200, 'success': true, 'result': createdAccount }
  //       return next(null, req, res, next)
  //     })
  //   })
  // },

  getAccounts(req, res, next) {
    const token = encryption.decodeToken(req, res)
    db.manyOrNone("select uuid, name, address, account_type, created from accounts where user_uuid = $1;", [token.user.uuid])
    .then((accounts) => {
      if(!accounts) {
        res.status(204)
        res.body = { 'status': 204, 'success': true, 'result': [] }
        return next(null, req, res, next)
      }

      async.map(accounts, (account, callback) => {
        zarNetwork.getBalances(account.address, (err, balances) => {
          account.balances = balances
          callback(err, account)
        })
      }, (err, accounts) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': accounts }
        return next(null, req, res, next)
      })
    })
    .catch((err) => {
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  }
}

module.exports = accounts
