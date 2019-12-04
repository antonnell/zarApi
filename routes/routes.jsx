const express = require('express')
const router = express.Router()
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
  swap,
  csdt,
  savings,
  nativeDenoms
} = require('../models')

router.get('/', function (req, res, next) {
  res.status(400)
  next(null, req, res, next)
})

router.post('/api/v1/test', testing.test)
router.post('/api/v1/testEncryption', testing.testEncryption)

router.post('/api/v1/login', auth.login)
router.post('/api/v1/register', auth.register)
router.post('/api/v1/resetPassword', auth.requestResetPassword)
router.post('/api/v1/verifyResetPassword', auth.verifyResetPassword)
router.post('/api/v1/setPassword', auth.setPassword)

router.post('/api/v1/getAccounts', validateRequest, accounts.getAccounts)
router.post('/api/v1/createAccount', validateRequest, accounts.createAccount)

router.post('/api/v1/getBankAccounts', validateRequest, banks.getBankAccounts)
router.post('/api/v1/createBankAccount', validateRequest, banks.createBankAccount)
router.post('/api/v1/getBanks', validateRequest, banks.getBanks)
router.post('/api/v1/getBankAccountTypes', validateRequest, banks.getBankAccountTypes)

router.post('/api/v1/getBeneficiaries', validateRequest, beneficiaries.getBeneficiaries)
router.post('/api/v1/createBeneficiary', validateRequest, beneficiaries.createBeneficiary)

router.post('/api/v1/upgradeKYC', validateRequest, kyc.upgradeKYC)

router.post('/api/v1/requestOTP', validateRequest, otp.requestOTP)
router.post('/api/v1/verifyOTP', validateRequest, otp.verifyOTP)

router.post('/api/v1/pay', validateRequest, payments.pay)
router.post('/api/v1/requestDeposit', validateRequest, payments.requestDeposit)
router.post('/api/v1/withdraw', validateRequest, payments.withdraw)
router.post('/api/v1/getTransactions', validateRequest, payments.getTransactions)

router.post('/api/v1/setPin', validateRequest, users.setPin)
router.post('/api/v1/updateName', validateRequest, users.updateName)

router.post('/api/v1/getAssets', validateRequest, asset.getAssets)
router.post('/api/v1/issueAsset', validateRequest, asset.issueAsset)
router.post('/api/v1/mintAsset', validateRequest, asset.mintAsset)
router.post('/api/v1/burnAsset', validateRequest, asset.burnAsset)
router.post('/api/v1/uploadAssetImage', validateRequest, asset.uploadAssetImage)

router.post('/api/v1/swap', validateRequest, swap.swap)

router.post('/api/v1/savingsDeposit', validateRequest, savings.deposit)
router.post('/api/v1/savingsWithdraw', validateRequest, savings.withdraw)

router.post('/api/v1/createCSDT', validateRequest, csdt.createCSDT)
router.post('/api/v1/closeCSDT', validateRequest, csdt.closeCSDT)
router.post('/api/v1/depositCSDT', validateRequest, csdt.depositCSDT)
router.post('/api/v1/withdrawCSDT', validateRequest, csdt.withdrawCSDT)
router.post('/api/v1/paybackCSDT', validateRequest, csdt.paybackCSDT)
router.post('/api/v1/generateCSDT', validateRequest, csdt.generateCSDT)
router.post('/api/v1/getCSDT', validateRequest, csdt.getCSDT)
router.post('/api/v1/getCSDTPrices', validateRequest, csdt.getCSDTPrices)
router.post('/api/v1/getCSDTHistory', validateRequest, csdt.getCSDTHistory)

router.post('/api/v1/getNativeDenoms', validateRequest, nativeDenoms.getNativeDenoms)

module.exports = router
