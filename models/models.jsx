const Accounts = require('./accounts.jsx');
const Auth = require('./auth.jsx');
const Banks = require('./banks.jsx');
const Beneficiaries = require('./beneficiaries.jsx');
const Kyc = require('./kyc.jsx');
const Otp = require('./otp.jsx');
const Payments = require('./payments.jsx');
const Users = require('./users.jsx');
const Testing = require('./testing.jsx');
const Asset = require('./asset.jsx');
const Swap = require('./swap.jsx');
const CSDT = require('./csdt.jsx');
const Savings = require('./savings.jsx');
const NativeDenoms = require('./nativeDenoms.jsx');

const models = {
  accounts: Accounts,
  auth: Auth,
  banks: Banks,
  beneficiaries: Beneficiaries,
  kyc: Kyc,
  otp: Otp,
  payments: Payments,
  users: Users,
  testing: Testing,
  asset: Asset,
  swap: Swap,
  csdt: CSDT,
  savings: Savings,
  nativeDenoms: NativeDenoms,
}

module.exports = models
