const {
  db,
  encryption,
  zarNetwork,
  bank
} = require('../helpers');
const async = require('async')

const accounts = require('./accounts.jsx')

const savings = {

  deposit(req, res, next) {
    console.log("HEELLLO")
    encryption.descryptPayload(req, res, next, (data) => {
      console.log(data)
      const validation = savings.validateDeposit(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      savings.getSavingsAccountForUserAndAccount(token.user, data.account_uuid, (err, savingsAccount) => {
        if(err) {
          console.log('there is an error here')
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!savingsAccount) {
          savings.getStandardAccount(data.account_uuid, (err, acc) => {
            if(err) {
              console.log('there is an error here 2')
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            accounts.insertAccount(token.user.uuid, 'Savings Account', acc.address, null, null, null, null, 'XAR_Savings', (err, createdAccount) => {
              if(err) {
                console.log('there is an error here 3')
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              savings.processDeposit(req, res, next, data, createdAccount, token.user)
            })
          })
        } else {
          savings.processDeposit(req, res, next, data, savingsAccount, token.user)
        }
      })
    })
  },

  validateDeposit(data) {
    const {
      amount,
      account_uuid
    } = data

    if(!amount) {
      return 'amount is required'
    }

    if(isNaN(amount) || amount < 0) {
      return 'amount is invalid'
    }

    if(!account_uuid) {
      return 'account_uuid is required'
    }

    return true
  },

  getSavingsAccountForUserAndAccount(user, accountUuid, callback) {
    db.oneOrNone('select uuid, user_uuid, address, account_type, created from accounts where account_type = $1 and user_uuid = $2 and address = (select address from accounts where uuid = $3) order by created desc limit 1;', ['XAR_Savings', user.uuid, accountUuid])
    .then((account) => {
      callback(null, account)
    })
    .catch(callback)
  },

  getStandardAccount(accountUuid, callback) {
    db.oneOrNone('select * from accounts where uuid = $1', [accountUuid])
    .then((account) => {
      callback(null, account)
    })
    .catch(callback)
  },

  processDeposit(req, res, next, data, account, user) {
    savings.getAccountForSavingsAndUser(user, account, (err, sendingAccount) => {
      if(err) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      if(!sendingAccount) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': 'Failed to get sending account details' }
        return next(null, req, res, next)
      }

      savings.getDepositDetails((err, recipientAccount) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!recipientAccount) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': 'Failed to get recipient account details' }
          return next(null, req, res, next)
        }

        const paymentData = {
          amount: data.amount,
          asset_id: 'ZAR',  //get ZAR asset ID?
          reference: 'Deposit Savings',
          beneficiary_uuid: null,
          account_uuid: sendingAccount.uuid,
        }

        savings.insertDeposit(user, paymentData, recipientAccount, (err, payment) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          savings.processPayment(paymentData, sendingAccount, payment, recipientAccount, (err, paymentResult) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': 'Payment processed' }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

  insertDeposit(user, data, recipient, callback) {
    db.oneOrNone('insert into savings_transactions (uuid, user_uuid, account_uuid, recipient_uuid, amount, transaction_type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now()) returning uuid;',
    [user.uuid, data.account_uuid, recipient.uuid, data.amount, 'Deposit'])
    .then((paymnet) => {
      callback(null, paymnet)

      //just inserting into transactions for now
      db.none('insert into transactions (uuid, user_uuid, reference, amount, source_uuid, type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now());',
      [user.uuid, data.reference, data.amount, paymnet.uuid, 'Savings Deposit'])
      .then(() => {})
      .catch((err) => { console.log(err) })
    })
    .catch(callback)
  },

  processPayment(data, accountDetails, payment, recipientAddress, callback) {

    const privateKey = encryption.unhashAccountField(accountDetails.private_key, accountDetails.encr_key)

    zarNetwork.transfer(data, recipientAddress, privateKey, accountDetails.address, (err, processResult) => {
      if(err) {
        return callback(err)
      }

      //get success
      let success = false
      let txId = null
      try {
        success = processResult.result.logs[0].success
        txId = processResult.result.txhash
      } catch(ex) {
        console.log(ex)
      }

      if(success) {
        zarNetwork.verifyTransactionSuccess(txId, (err, transactionDetails) => {
          if(err) {
            return callback(err)
          }

          let transferSuccess = null
          let transferError = null
          try {
            transferError = transactionDetails.error

            if(transferError) {
              res.status(400)
              res.body = { 'status': 400, 'success': false, 'result': transferError }
              return next(null, req, res, next)
            }

            transferSuccess = transactionDetails.logs[0].success
            if(!transferSuccess) {
              transferError = JSON.parse(transactionDetails.logs[0].log).message

              return callback(transferError)
            }

          } catch(ex) {
            return callback(ex)
          }

          savings.updateDepositProcessed(payment, processResult, callback)
        })
      } else {
        return callback(processResult)
      }
    })
  },

  updateDepositProcessed(payment, result, callback) {
    db.none('update savings_transactions set processed = true, processed_time = now(), processed_result = $2 where uuid = $1', [payment.uuid, result])
    .then(callback)
    .catch(callback)
  },

  getAccountForSavingsAndUser(user, account, callback) {
    db.oneOrNone('select * from accounts where user_uuid = $1 and address = $2 and account_type = $3;', [user.uuid, account.address, 'ZAR'])
    .then((account) => {
      callback(null, account)
    })
    .catch(callback)
  },

  getDepositDetails(callback) {
    db.oneOrNone('select * from savings_account_deposit_details order by created desc limit 1;')
    .then((account) => {
      callback(null, account)
    })
    .catch(callback)
  },

  withdraw(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = savings.validateWithdraw(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      savings.getSavingsAccountForUserAndAccount(token.user, data.account_uuid, (err, savingsAccount) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!savingsAccount) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Savings account does not exist' }
          return next(null, req, res, next)
        } else {
          savings.processWithdrawal(req, res, next, data, savingsAccount, token.user)
        }
      })
    })
  },

  validateWithdraw(data) {
    const {
      amount,
      account_uuid
    } = data

    if(!amount) {
      return 'amount is required'
    }

    if(isNaN(amount) || amount < 0) {
      return 'amount is invalid'
    }

    if(!account_uuid) {
      return 'account_uuid is required'
    }

    return true
  },

  processWithdrawal(req, res, next, data, savingsAccount, user) {
    savings.getAccountForSavingsAndUser(user, account, (err, recipientAccount) => {
      if(err) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      if(!recipientAccount) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': 'Failed to get recipient account details' }
        return next(null, req, res, next)
      }

      savings.insertWithdrawal(user, data, savingsAccount, recipientAccount, (err, withdrawal) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        bank.withdraw(addres, amount, (err, withdrawalResponse) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          savings.updateWithdrawalProcessed(withdrawal, withdrawalResponse, (err) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': 'Payment processed' }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

  insertWithdrawal(user, data, savingsAccount, recipientAccount, callback) {
    db.oneOrNone('insert into savings_transactions (uuid, user_uuid, account_uuid, recipient_uuid, amount, transaction_type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now()) returning uuid;',
    [user.uuid, savingsAccount.uuid, recipientAccount.uuid, data.amount, 'Withdrawal'])
    .then((paymnet) => {
      callback(null, paymnet)
    })
    .catch(callback)
  },

  updateWithdrawalProcessed(withdrawal, result, callback) {
    db.none('update savings_transactions set processed = true, processed_time = now(), processed_result = $2 where uuid = $1', [withdrawal.uuid, result])
    .then(callback)
    .catch(callback)
  },
}

module.exports = savings
