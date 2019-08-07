const beneficiaries = {
  createBeneficiary() {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = accounts.validateCreateBeneficiary(data)
      if(!validation) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      accounts.insertBankAccount(token.user, data, (err, bankAccount) => {

        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': bankAccount }
        return next(null, req, res, next)
      })
    })
  },

  validateCreateBeneficiary(data) {
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

  insertBankAccount(user, data, callback) {
    db.oneOrNone('select * from user where uuid = $1', [data.user_uuid])
    .then((bank) => {
      if(!bank) {
        return callback("bank_uuid is invalid")
      }

      db.oneOrNone('select * from bank_account_types where uuid = $1', [data.account_type_uuid])
      .then((accountType) => {
        if(!accountType) {
          return callback("account_type_uuid is invalid")
        }

        db.oneOrNone('insert into bank_accounts (uuid, user_uuid, bank_uuid, name, full_name, account_number, account_type_uuid, kyc_approved, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, $7, now()) returning uuid, name, kyc_approved, full_name, created;',
        [user.uuid, data.bank_uuid, data.name, data.full_name, data.account_number, data.account_type_uuid, false])
        .then((account) => {

          account.bank_name = bank.name
          account.account_type = accountType.account_type
          callback(null, account)
        })
        .catch(callback)
      })
      .catch(callback)
    })
    .catch(callback)
  },

  getBeneficiaries() {
    const token = encryption.decodeToken(req, res)
    db.manyOrNone("select uuid, name, mobile_number, email_address, account_address, reference, created from beneficiaries where user_uuid = $1;", [token.user.uuid])
    .then((beneficiaries) => {
      if(!beneficiaries) {
        res.status(204)
        res.body = { 'status': 204, 'success': true, 'result': [] }
        return next(null, req, res, next)
      }
      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': beneficiaries }
      return next(null, req, res, next)
    })
    .catch((err) => {
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  }
}

module.exports = beneficiaries
