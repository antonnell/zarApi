const {
  db,
  encryption,
  zarNetwork
} = require('../helpers');
const async = require('async')


const payments = {

  getTransactions(req, res, next) {
    const token = encryption.decodeToken(req, res)
    db.manyOrNone(`select * from (
select p.uuid, p.user_uuid, p.amount, p.reference, CASE WHEN (a.symbol IS NULL) THEN nd.denom ELSE a.symbol END as symbol, p.created, 'Transfer' as type from payments p left join assets a on a.asset_id = p.asset_id left join native_denoms nd on p.asset_id = nd.denom where p.user_uuid = $1
union
select mr.uuid, mr.user_uuid, mr.amount, 'Mint Request', a.symbol, mr.created, 'Mint Asset' as type from mint_requests mr left join assets a on a.uuid = mr.asset_uuid where mr.user_uuid = $1
union
select br.uuid, br.user_uuid, br.amount, 'Burn Request', a.symbol, br.created, 'Burn Asset' as type from burn_requests br left join assets a on a.uuid = br.asset_uuid where br.user_uuid = $1) a
order by created desc;`, [token.user.uuid])
    .then((transactions) => {
      if(!transactions) {
        res.status(204)
        res.body = { 'status': 204, 'success': true, 'result': [] }
        return next(null, req, res, next)
      }
      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': transactions }
      return next(null, req, res, next)
    })
    .catch((err) => {
      console.log(err)
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  },

  pay(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = payments.validatePay(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      payments.getUserDetails(token.user, (err, userDetails) => {
        console.log(userDetails)
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!userDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching user found' }
          return next(null, req, res, next)
        }

        payments.getAccount(data, (err, accountDetails) => {
          console.log(accountDetails)
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          if(!accountDetails) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'No matching account record found' }
            return next(null, req, res, next)
          }


          payments.getRecipientAddress(data, (err, recipientAddress) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            if(!recipientAddress) {
              res.status(400)
              res.body = { 'status': 400, 'success': false, 'result': 'No matching recipient record found' }
              return next(null, req, res, next)
            }

            payments.insertPayment(token.user, data, (err, payment) => {
              if(err) {
                console.log(err)
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              // insert payment notifications
              payments.processPaymentNotification(token.user, data, payment, (err, paymentNotification) => {
                if(err) {
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                //real-time processing the request
                payments.processPayment(data, accountDetails, payment, recipientAddress, (err, processResult) => {
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
        })
      })
    })
  },

  validatePay(data) {
    const {
      account_uuid,
      beneficiary_uuid,
      own_account_uuid,
      to_address,
      amount,
      reference,
      asset_id
    } = data

    if(!account_uuid) {
      return 'account_uuid is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    if(isNaN(amount) || amount < 0) {
      return 'amount is invalid'
    }

    if(!reference) {
      return 'reference is required'
    }

    if(!asset_id) {
      return 'asset_id is required'
    }

    if(!to_address && !beneficiary_uuid && !own_account_uuid) {
      return 'identifier is required'
    }

    return true
  },

  getAccount(data, callback) {
    db.oneOrNone('select * from accounts where uuid = $1;',
    [data.account_uuid])
    .then((account) => {
      callback(null, account)
    })
    .catch(callback)
  },

  getRecipientAddress(data, callback) {
    if(data.recipient_type == 'public') {
      return callback(null, { address:  data.to_address })
    }

    if(data.recipient_type == 'beneficiary') {
      db.oneOrNone('select a.address from beneficiaries b left join accounts a on b.beneficiary_user_uuid = a.user_uuid where b.uuid = $1;', [data.beneficiary_uuid])
      .then((acc) => {
        callback(null, acc)
      })
      .catch(callback)
      return
    }

    if(data.recipient_type == 'own') {
      db.oneOrNone('select address from accounts where uuid = $1;', [data.own_account_uuid])
      .then((acc) => {
        callback(null, acc)
      })
      .catch(callback)
      return
    }
  },

  insertPayment(user, data, callback) {
    db.oneOrNone('insert into payments (uuid, user_uuid, account_uuid, beneficiary_uuid, amount, reference, asset_id, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, now()) returning uuid;',
    [user.uuid, data.account_uuid, data.beneficiary_uuid, data.amount, data.reference, data.asset_id])
    .then((payment) => {
      callback(null, payment)

      //just inserting into transactions for now
      db.none('insert into transactions (uuid, user_uuid, reference, amount, source_uuid, type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now());',
      [user.uuid, data.reference, data.amount, payment.uuid, 'Transfer'])
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

          payments.updatePaymentProcessed(payment, processResult, callback)
        })
      } else {
        return callback(processResult)
      }
    })
  },

  updatePaymentProcessed(payment, result, callback) {
    db.none('update payments set processed = true, processed_time = now(), processed_result = $2 where uuid = $1', [payment.uuid, result])
    .then(callback)
    .catch(callback)
  },

  processPaymentNotification(user, data, payment, callback) {
    async.parallel([
      (callbackInner) => { payments.insertPaymentNotification(data.beneficiary_notification, 'beneficiary', payment, data.beneficiary_uuid, callbackInner) },
      (callbackInner) => { payments.insertPaymentNotification(data.own_notification, 'own', payment, user.uuid, callbackInner) }
    ], callback)
  },

  insertPaymentNotification(notification, type, payment, user, callback)  {
    if(!notification) {
      return callback()
    }

    db.none('insert into payment_notifications (uuid, payment_uuid, user_uuid, notification_channel_uuid, type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, now());',
    [payment.uuid, user.uuid, notification.channel_uuid, type])
    .then(callback)
    .catch(callback)
  },

  requestDeposit(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = payments.validateRequestDeposit(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      payments.getUserDetails(token.user, (err, userDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!userDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching user found' }
          return next(null, req, res, next)
        }

        payments.getDepositDetails((err, depositDetails) => {
          payments.getDepositReference(token.user.uuid, (err, depositReference) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            if(!depositReference) {
              payments.insertDepositReference(token.user, (err, newDepositReference) => {
                if(err) {
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                depositDetails.reference = newDepositReference.reference
                depositDetails.amount = data.amount

                res.status(205)
                res.body = { 'status': 200, 'success': true, 'result': depositDetails }
                return next(null, req, res, next)
              })
              //create a new depositReference
            } else {
              depositDetails.reference = depositReference.reference
              depositDetails.amount = data.amount

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': depositDetails }
              return next(null, req, res, next)
            }
          })
        })
      })
    })
  },

  validateRequestDeposit(data) {
    const {
      amount
    } = data

    if(!amount) {
      return 'amount is required'
    }

    if(isNaN(amount) || amount < 0) {
      return 'amount is invalid'
    }

    return true
  },

  getDepositDetails(callback) {
    db.oneOrNone('select * from deposit_details order by created desc limit 1;')
    .then((depositDetails) => {
      callback(null, depositDetails)
    })
    .catch(callback)
  },

  getDepositReference(userUUID, callback) {
    db.oneOrNone('select uuid, reference from deposit_references where user_uuid = $1;', [userUUID])
    .then((depositReference) => {
      callback(null, depositReference)
    })
    .catch(callback)
  },

  insertDepositReference(user, callback) {
    const reference = encryption.generateRandomString(8)

    db.oneOrNone('select * from deposit_references where reference = $1;', [reference])
    .then((ref) => {
      if(!ref) {
        db.oneOrNone('insert into deposit_references (uuid, user_uuid, reference, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, now()) returning uuid, reference;', [user.uuid, reference])
        .then((depositReference) => {
          callback(null, depositReference)
        })
        .catch(callback)
      } else {
        //call again to try to isnert it again with new reference that isn't used.  loop until this works.
        payments.insertDepositReference(user, callback)
      }
    })
    .catch(callback)

  },

  withdraw(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = payments.validateWithdraw(data)
      console.log(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      payments.getUserDetails(token.user, (err, userDetails) => {
        console.log(userDetails)
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!userDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching user found' }
          return next(null, req, res, next)
        }

        payments.getBankAccount(data, (err, bankAccount) => {
          console.log(bankAccount)
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          if(!bankAccount) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'No matching bank record found' }
            return next(null, req, res, next)
          }

          // if(!bankAccount.kyc_approved) {
          //   res.status(400)
          //   res.body = { 'status': 400, 'success': false, 'result': 'Bank account is not KYC approved' }
          //   return next(null, req, res, next)
          // }

          // add a balance check

          //process the withdrawal asyncronously using some processor, I don't know????

          payments.insertWithdrawal(token.user, data, (err, withdrawal) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': 'Withdrawal processed' }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

  validateWithdraw(data) {
    const {
      bank_account_uuid,
      amount,
      reference
    } = data

    if(!bank_account_uuid) {
      return 'bank_account_uuid is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    if(isNaN(amount) || amount < 0) {
      return 'amount is invalid'
    }

    if(!reference) {
      return 'reference is required'
    }

    return true
  },

  getUserDetails(user, callback) {
    db.oneOrNone('select * from users where uuid = $1;',
    [user.uuid])
    .then((user) => {
      callback(null, user)
    })
    .catch(callback)
  },

  getBankAccount(data, callback) {
    db.oneOrNone('select * from bank_accounts where uuid = $1;',
    [data.bank_account_uuid])
    .then((bankAccount) => {
      callback(null, bankAccount)
    })
    .catch(callback)
  },

  insertWithdrawal(user, data, callback) {
    db.oneOrNone('insert into withdrawals (uuid, user_uuid, bank_account_uuid, amount, reference, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, now()) returning uuid;',
    [user.uuid, data.bank_account_uuid, data.amount, data.reference])
    .then((withdrawal) => {
      callback(null, withdrawal)

      //just inserting into transactions for now
      db.none('insert into transactions (uuid, user_uuid, reference, amount, source_uuid, type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now());',
      [user.uuid, data.reference, data.amount, withdrawal.uuid, 'Withdrawal'])
      .then(() => {})
      .catch((err) => { console.log(err) })

    })
    .catch(callback)
  }

}

module.exports = payments
