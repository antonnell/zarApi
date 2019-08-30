const {
  db,
  encryption
} = require('../helpers');

const beneficiaries = {
  createBeneficiary(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = beneficiaries.validateCreateBeneficiary(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      beneficiaries.getUserDetails(data, (err, userDetails) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(userDetails.length > 1) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Multiple users matching the provided information returned' }
          return next(null, req, res, next)
        }

        if(!userDetails || userDetails.length == 0) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching user found' }
          return next(null, req, res, next)

          //send email to user to make them sign up to receive the funds
        }

        const token = encryption.decodeToken(req, res)
        beneficiaries.insertBeneficiary(token.user, data, userDetails[0], (err, beneficiary) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': beneficiary }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateCreateBeneficiary(data) {
    const {
      name,
      reference,
      mobile_number,
      email_address,
      account_address
    } = data

    if(!name) {
      return 'name is required'
    }

    if(!reference) {
      return 'reference is required'
    }

    if(!mobile_number && !email_address && !account_address) {
      return 'beneficiary identifier is required'
    }

    return true
  },

  getUserDetails(data, callback) {
    db.manyOrNone('select u.*, a.address from users u left join accounts a on a.user_uuid = u.uuid where u.email_address = $1 or u.mobile_number = $2 or (a.address = $3 and u.email_address != $1 and u.mobile_number != $2);',
    [data.email_address, data.mobile_number, data.account_address])
    .then((users) => {
      callback(null, users)
    })
    .catch(callback)
  },

  insertBeneficiary(user, data, beneficiaryUser, callback) {
    db.oneOrNone('insert into beneficiaries (uuid, user_uuid, beneficiary_user_uuid, name, mobile_number, email_address, account_address, reference, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, $7, now()) returning uuid, name, mobile_number, email_address, account_address, reference;',
    [user.uuid, beneficiaryUser.uuid, data.name, beneficiaryUser.mobile_number, beneficiaryUser.email_address, beneficiaryUser.address, data.reference])
    .then((beneficiary) => {
      callback(null, beneficiary)
    })
    .catch(callback)
  },

  getBeneficiaries(req, res, next) {
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
