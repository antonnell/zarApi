const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const validateRequest = require('../middleware/validateRequest')

const {
  auth,
  users,
  otp,
  kyc,
  accounts,
  beneficiaries,
  banks,
  payments,
  testing,
  token,
  asset,
  swap
} = require('../models')

router.get('/', function (req, res, next) {
  res.status(400)
  next(null, req, res, next)
})

router.post('/api/v1/doNothing', bodyParser.json(), testing.doNothing)
router.post('/api/v1/testEncryption', bodyParser.json(), testing.testEncryption)

router.post('/api/v1/login', bodyParser.json(), auth.login)
router.post('/api/v1/register', bodyParser.json(), auth.register)
router.post('/api/v1/resetPassword', bodyParser.json(), auth.requestResetPassword)
router.post('/api/v1/verifyResetPassword', bodyParser.json(), auth.verifyResetPassword)
router.post('/api/v1/setPassword', bodyParser.json(), auth.setPassword)

router.post('/api/v1/getAccounts', validateRequest, bodyParser.json(), accounts.getAccounts)
router.post('/api/v1/createAccount', validateRequest, bodyParser.json(), accounts.createAccount)

router.post('/api/v1/getBankAccounts', validateRequest, bodyParser.json(), banks.getBankAccounts)
router.post('/api/v1/createBankAccount', validateRequest, bodyParser.json(), banks.createBankAccount)
router.post('/api/v1/getBanks', validateRequest, bodyParser.json(), banks.getBanks)
router.post('/api/v1/getBankAccountTypes', validateRequest, bodyParser.json(), banks.getBankAccountTypes)

router.post('/api/v1/getBeneficiaries', validateRequest, bodyParser.json(), beneficiaries.getBeneficiaries)
router.post('/api/v1/createBeneficiary', validateRequest, bodyParser.json(), beneficiaries.createBeneficiary)

router.post('/api/v1/upgradeKYC', validateRequest, bodyParser.json(), kyc.upgradeKYC)

router.post('/api/v1/requestOTP', validateRequest, bodyParser.json(), otp.requestOTP)
router.post('/api/v1/verifyOTP', validateRequest, bodyParser.json(), otp.verifyOTP)

router.post('/api/v1/pay', validateRequest, bodyParser.json(), payments.pay)
router.post('/api/v1/requestDeposit', validateRequest, bodyParser.json(), payments.requestDeposit)
router.post('/api/v1/withdraw', validateRequest, bodyParser.json(), payments.withdraw)
router.post('/api/v1/getTransactions', validateRequest, bodyParser.json(), payments.getTransactions)

router.post('/api/v1/setPin', validateRequest, bodyParser.json(), users.setPin)
router.post('/api/v1/updateName', validateRequest, bodyParser.json(), users.updateName)

router.post('/api/v1/getAssets', validateRequest, bodyParser.json(), asset.getAssets)
router.post('/api/v1/issueAsset', validateRequest, bodyParser.json(), asset.issueAsset)
router.post('/api/v1/mintAsset', validateRequest, bodyParser.json(), asset.mintAsset)
router.post('/api/v1/burnAsset', validateRequest, bodyParser.json(), asset.burnAsset)

router.post('/api/v1/swap', validateRequest, bodyParser.json(), swap.swap)

module.exports = router
