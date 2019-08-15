const {
  db,
  encryption
} = require('../helpers');

const banks = {
  createBankAccount(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = banks.validateCreateBankAccount(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)
      banks.insertBankAccount(token.user, data, (err, bankAccount) => {

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

  validateCreateBankAccount(data) {
    const {
      bank_uuid,
      account_type_uuid,
      name,
      full_name,
      account_number
    } = data

    if(!bank_uuid) {
      return 'bank_uuid is required'
    }

    if(!account_type_uuid) {
      return 'account_type_uuid is required'
    }

    if(!name) {
      return 'name is required'
    }

    if(!full_name) {
      return 'full_name is required'
    }

    if(!account_number) {
      return 'account_number is required'
    }

    return true
  },

  insertBankAccount(user, data, callback) {
    db.oneOrNone('select * from banks where uuid = $1', [data.bank_uuid])
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

  getBankAccounts(req, res, next) {
    const token = encryption.decodeToken(req, res)
    db.manyOrNone("select ba.uuid, ba.name, ba.kyc_approved, ba.account_number, ba.full_name, bat.account_type, b.name as bank_name, ba.created from bank_accounts ba left join banks b on ba.bank_uuid = b.uuid left join bank_account_types bat on bat.uuid = ba.account_type_uuid where ba.user_uuid = $1;", [token.user.uuid])
    .then((bankAccounts) => {
      if(!bankAccounts) {
        res.status(204)
        res.body = { 'status': 204, 'success': true, 'result': [] }
        return next(null, req, res, next)
      }
      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': bankAccounts }
      return next(null, req, res, next)
    })
    .catch((err) => {
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  },

  getBanks(req, res, next) {
    db.manyOrNone("select uuid, name, branch_code from banks;", [])
    .then((banks) => {
      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': banks }
      return next(null, req, res, next)
    })
    .catch((err) => {
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  },

  getBankAccountTypes(req, res, next) {
    db.manyOrNone("select uuid, account_type from bank_account_types;", [])
    .then((bankAccountTypes) => {
      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': bankAccountTypes }
      return next(null, req, res, next)
    })
    .catch((err) => {
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  },

}

module.exports = banks
