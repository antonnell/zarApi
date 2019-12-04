const {
  encryption,
  zarNetwork,
  db,
  sleep
} = require('../helpers');
const async = require('async')

const csdt = {
  async createCSDT(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = csdt.validateCreateCSDT(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      csdt.getCSDTForUser(token.user, (err, userCSDT) => {
        if(userCSDT) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'CSDT already exists for user' }
          return next(null, req, res, next)
        }

        csdt.getAccountForUser(token.user, (err, account) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          const privateKey = encryption.unhashAccountField(account.private_key, account.encr_key)

          zarNetwork.createCSDT(privateKey, account.address, data.deposit_denom, data.deposit_amount, data.generated_amount, (err, result) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            csdt.insertCSDT(token.user, account, async (err, insertResponse) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              // await sleep(3000)

              csdt.getCSDTBalances(account.address, (err,  balances) => {
                if(err) {
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                insertResponse.balances = balances

                res.status(205)
                res.body = { 'status': 200, 'success': true, 'result': insertResponse }
                return next(null, req, res, next)
              })
            })
          })
        })
      })
    })
  },

  validateCreateCSDT(data) {
    const {
      deposit_denom,
      deposit_amount,
      generated_amount
    } = data

    if(!deposit_denom) {
      return 'deposit_denom is required'
    }

    if(!deposit_amount) {
      return 'deposit_amount is required'
    }

    if(isNaN(deposit_amount) || deposit_amount < 0) {
      return 'deposit_amount is invalid'
    }

    if(!generated_amount) {
      return 'generated_amount is required'
    }

    if(isNaN(generated_amount) || generated_amount < 0) {
      return 'generated_amount is invalid'
    }

    return true
  },

  getCSDTForUser(user, callback) {
    db.oneOrNone('select csdts.*, ac.uuid as account_uuid, ac.address, ac.private_key, ac.encr_key from csdts left join accounts ac on ac.user_uuid = csdts.user_uuid and ac.uuid = csdts.account_uuid where csdts.user_uuid = $1', [user.uuid])
    .then((csdt) => {
      callback(null, csdt)
    })
    .catch(callback)
  },

  getAccountForUser(user, callback) {
    db.oneOrNone('select * from accounts where user_uuid = $1 and account_type = $2 order by created desc limit 1;', [user.uuid, 'XAR'])
    .then((csdt) => {
      callback(null, csdt)
    })
    .catch(callback)
  },

  insertCSDT(user, account, callback) {
    db.oneOrNone('insert into csdts (uuid, user_uuid, account_uuid, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, now()) returning uuid;', [user.uuid,  account.uuid])
    .then((data) => {
      callback(null, data)
    })
    .catch(callback)
  },

  getCSDTBalances(address, callback) {
    async.parallel([
      (callbackInner) => { zarNetwork.getCSDT(address, 'uftm', callbackInner) },
      // (callbackInner) => { zarNetwork.getCSDT(address, 'ubtc', callbackInner) }
    ], (err, balances) => {
      if(err) {
        console.log(err)
        return callback(err)
      }

      try {
        balances = balances.map((balance) => {
          if(!balance || balance.status !== 200) {
            return balance
          }

          return balance.result.result[0]
        })

        return callback(null, balances)
      } catch(ex) {
        console.log(ex)
        return callback(ex, [])
      }

    })
  },

  closeCSDT(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = csdt.validateCloseCSDT(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      csdt.getCSDTForUser(token.user, (err, userCSDT) => {
        if(!userCSDT) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'CSDT not found for user' }
          return next(null, req, res, next)
        }

        zarNetwork.closeCSDT({/*inputs*/}, (err, result) => {
          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': 'Not Implemented' }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateCloseCSDT(data) {
    return true
  },

  async depositCSDT(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = csdt.validateDepositCSDT(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      csdt.getCSDTForUser(token.user, (err, userCSDT) => {
        if(!userCSDT) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'CSDT not found for user' }
          return next(null, req, res, next)
        }

        csdt.getAccountForUser(token.user, (err, account) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          const privateKey = encryption.unhashAccountField(account.private_key, account.encr_key)
          zarNetwork.depositCSDT(privateKey, account.address, data.deposit_denom, data.deposit_amount, async (err, result) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            // await sleep(3000)

            csdt.getCSDTBalances(account.address, (err,  balances) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }


              delete userCSDT.encr_key
              delete userCSDT.private_key

              userCSDT.balances = balances

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': userCSDT }
              return next(null, req, res, next)
            })
          })
        })
      })
    })
  },

  validateDepositCSDT(data) {
    const {
      deposit_denom,
      deposit_amount
    } = data

    if(!deposit_denom) {
      return 'deposit_denom is required'
    }

    if(!deposit_amount) {
      return 'deposit_amount is required'
    }

    if(isNaN(deposit_amount) || deposit_amount < 0) {
      return 'deposit_amount is invalid'
    }

    return true
  },

  async withdrawCSDT(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = csdt.validateWithdrawCSDT(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      csdt.getCSDTForUser(token.user, (err, userCSDT) => {
        if(!userCSDT) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'CSDT not found for user' }
          return next(null, req, res, next)
        }

        csdt.getAccountForUser(token.user, (err, account) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          const privateKey = encryption.unhashAccountField(account.private_key, account.encr_key)
          zarNetwork.withdrawCSDT(privateKey, account.address, data.withdraw_denom, data.withdraw_amount, async (err, result) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            // await sleep(3000)

            csdt.getCSDTBalances(account.address, (err,  balances) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              delete userCSDT.encr_key
              delete userCSDT.private_key

              userCSDT.balances = balances

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': userCSDT }
              return next(null, req, res, next)
            })
          })
        })
      })
    })
  },

  validateWithdrawCSDT(data) {
    const {
      withdraw_denom,
      withdraw_amount
    } = data

    if(!withdraw_denom) {
      return 'withdraw_denom is required'
    }

    if(!withdraw_amount) {
      return 'withdraw_amount is required'
    }

    if(isNaN(withdraw_amount) || withdraw_amount < 0) {
      return 'withdraw_amount is invalid'
    }

    return true
  },

  async paybackCSDT(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = csdt.validatePaybackCSDT(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      csdt.getCSDTForUser(token.user, (err, userCSDT) => {
        if(!userCSDT) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'CSDT not found for user' }
          return next(null, req, res, next)
        }

        csdt.getAccountForUser(token.user, (err, account) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          const privateKey = encryption.unhashAccountField(account.private_key, account.encr_key)
          zarNetwork.paybackCSDT(privateKey, account.address, data.payback_denom, data.payback_amount, async (err, result) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            // await sleep(3000)

            csdt.getCSDTBalances(account.address, (err,  balances) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              delete userCSDT.encr_key
              delete userCSDT.private_key

              userCSDT.balances = balances

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': userCSDT }
              return next(null, req, res, next)
            })
          })
        })
      })
    })
  },

  validatePaybackCSDT(data) {
    const {
      payback_denom,
      payback_amount
    } = data

    if(!payback_denom) {
      return 'payback_denom is required'
    }

    if(!payback_amount) {
      return 'payback_amount is required'
    }

    if(isNaN(payback_amount) || payback_amount < 0) {
      return 'payback_amount is invalid'
    }

    return true
  },

  async generateCSDT(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = csdt.validateGenerateCSDT(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      csdt.getCSDTForUser(token.user, (err, userCSDT) => {
        if(!userCSDT) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'CSDT not found for user' }
          return next(null, req, res, next)
        }

        csdt.getAccountForUser(token.user, (err, account) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          const privateKey = encryption.unhashAccountField(account.private_key, account.encr_key)
          zarNetwork.generateCSDT(privateKey, account.address, data.generate_denom, data.generate_amount, async (err, result) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            // await sleep(3000)

            csdt.getCSDTBalances(account.address, (err,  balances) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              delete userCSDT.encr_key
              delete userCSDT.private_key

              userCSDT.balances = balances

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': userCSDT }
              return next(null, req, res, next)
            })
          })
        })
      })
    })
  },

  validateGenerateCSDT(data) {
    const {
      generate_denom,
      generate_amount
    } = data

    if(!generate_denom) {
      return 'generate_denom is required'
    }

    if(!generate_amount) {
      return 'generate_amount is required'
    }

    if(isNaN(generate_amount) || generate_amount < 0) {
      return 'generate_amount is invalid'
    }

    return true
  },

  getCSDT(req, res, next) {
    const token = encryption.decodeToken(req, res)
    csdt.getCSDTForUser(token.user, (err, userCSDT) => {
      if(err) {
        console.log(err)
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      if(!userCSDT) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': 'CSDT not found for user' }
        return next(null, req, res, next)
      }

      delete userCSDT.encr_key
      delete userCSDT.private_key

      csdt.getCSDTBalances(userCSDT.address, (err, balances) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        userCSDT.balances = balances

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': userCSDT }
        return next(null, req, res, next)
      })
    })
  },

  getCSDTPrices(req, res, next) {
    async.parallel([
      (callbackInner) => { zarNetwork.getDenomPrice('uftm', callbackInner) },
      // (callbackInner) => { zarNetwork.getDenomPrice('ubtc', callbackInner) },
    ], (err, prices) => {
      if(err) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      prices = prices.map((price) => {
        if(!price || price.status !== 200) {
          return price
        }

        return price.result.result
      })

      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': prices }
      return next(null, req, res, next)
    })
  },

  getCSDTHistory(req, res, next) {
    const token = encryption.decodeToken(req, res)

    csdt.getCSDTForUser(token.user, (err, userCSDT) => {
      if(!userCSDT) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': 'CSDT not found for user' }
        return next(null, req, res, next)
      }

      csdt.getCSDTHistoryForCSDT(userCSDT, (err, csdtHistory) => {
        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': 'Not Implemented' }
        return next(null, req, res, next)
      })
    })
  },

  getCSDTHistoryForCSDT(userCSDT, callback) {
    db.oneOrNone('select * from csdt_transactions where csdt_uuid = $1;', [userCSDT.uuid])
    .then((csdtData) => {
      callback(null, csdtData)
    })
    .catch(callback)
  }
}

module.exports = csdt
