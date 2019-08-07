const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const validateRequest = require('../middleware/validateRequest')

const models = require('../models')

router.get('/', function (req, res, next) {
  res.status(400)
  next(null, req, res, next)
})

router.post('/api/v1/login', bodyParser.json(), models.auth.login)
router.post('/api/v1/register', bodyParser.json(), models.auth.register)
router.post('/api/v1/resetPassword', bodyParser.json(), models.auth.requestResetPassword)
router.post('/api/v1/setPassword', bodyParser.json(), models.auth.setPassword)

router.post('/api/v1/setPin', validateRequest, bodyParser.json(), models.users.setPin)
router.post('/api/v1/updateName', validateRequest, bodyParser.json(), models.users.updateName)

router.post('/api/v1/requestOTP', validateRequest, bodyParser.json(), models.otp.requestOTP)
router.post('/api/v1/verifyOTP', validateRequest, bodyParser.json(), models.otp.verifyOTP)

router.post('/api/v1/upgradeKYC', validateRequest, bodyParser.json(), models.kyc.upgradeKYC)

router.post('/api/v1/getAccounts', validateRequest, bodyParser.json(), models.accounts.getAccounts)
router.post('/api/v1/createAccount', validateRequest, bodyParser.json(), models.accounts.createAccount)
router.post('/api/v1/getBeneficiaries', validateRequest, bodyParser.json(), models.beneficiaries.getBeneficiaries)
router.post('/api/v1/createBeneficiary', validateRequest, bodyParser.json(), models.beneficiaries.createBeneficiary)
router.post('/api/v1/getBankAccounts', validateRequest, bodyParser.json(), models.banks.getBankAccounts)
router.post('/api/v1/createBankAccount', validateRequest, bodyParser.json(), models.banks.createBankAccount)
router.post('/api/v1/getBanks', validateRequest, bodyParser.json(), models.banks.getBanks)
router.post('/api/v1/pay', validateRequest, bodyParser.json(), models.payments.pay)
router.post('/api/v1/requestDeposit', validateRequest, bodyParser.json(), models.payments.requestDeposit)
router.post('/api/v1/withdraw', validateRequest, bodyParser.json(), models.payments.withdraw)

module.exports = router
