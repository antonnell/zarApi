const expect = require('chai').expect;
const helper = require('../helper.js')
const assert = require('assert');
let request = require('supertest')
request = request('http://localhost:8000')
const db = require('../../helpers').db

const username = helper.username
const password = helper.password
const data = helper.userDetails

describe('POST /api/v1/pay', function () {

  let jwt = null
  let xKey = null
  let accounts = []
  let beneficiaries = []

  before((done) => {

    const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload)
      .then(response => {
        jwt = response.body.result.jwt
        xKey = helper.sha256email(response.body.result.email_address);

        request.post('/api/v1/getAccounts')
          .set('Accept', 'application/json')
          .set('x-key', xKey)
          .set('x-access-token', jwt.token)
          .auth(username, password)
          .send({})
          .then((accountsResponse) => {

            accounts = accountsResponse.body.result

            request.post('/api/v1/getBeneficiaries')
              .set('Accept', 'application/json')
              .set('x-key', xKey)
              .set('x-access-token', jwt.token)
              .auth(username, password)
              .send({})
              .then((beneficiariesResponse) => {
                beneficiaries = beneficiariesResponse.body.result

                done()
              });
          });
      });
  })

  it('responds with 200 Payment processed', function (done) {

    const payPayload = helper.encrypt({
      account_uuid: accounts[0].uuid,
      beneficiary_uuid: beneficiaries[0].uuid,
      amount: data.payment.amount,
      reference: beneficiaries[0].reference
    }, '/api/v1/pay')

    request.post('/api/v1/pay')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(payPayload)
      .expect(200, done);
  });
});


describe('POST /api/v1/requestDeposit', function () {

  let jwt = null
  let xKey = null

  before((done) => {
    const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload)
      .then(response => {
        jwt = response.body.result.jwt
        xKey = helper.sha256email(response.body.result.email_address);

        done();
      });
  })

  it('responds with 200 Deposit Object', function (done) {

    const requestDepositPayload = helper.encrypt({
      amount: data.deposit.amount,
    }, '/api/v1/requestDeposit')

    request.post('/api/v1/requestDeposit')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(requestDepositPayload)
      .expect(200, done);
  });
});

describe('POST /api/v1/withdraw', function() {

  let jwt = null
  let xKey = null
  let bankAccounts = []

  before((done) => {

    const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload)
      .then(response => {
        jwt = response.body.result.jwt
        xKey = helper.sha256email(response.body.result.email_address);

        request.post('/api/v1/getBankAccounts')
          .set('Accept', 'application/json')
          .set('x-key', xKey)
          .set('x-access-token', jwt.token)
          .auth(username, password)
          .send({})
          .then((bankAccountsResponse) => {

            bankAccounts = bankAccountsResponse.body.result

            done();

          });
      });
  })

  it('responds with 200 Withdraw Object', function (done) {

    const withdrawPayload = helper.encrypt({
      bank_account_uuid: bankAccounts[0].uuid,
      amount: data.withdraw.amount,
      reference: data.withdraw.reference
    }, '/api/v1/withdraw')

    request.post('/api/v1/withdraw')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(withdrawPayload)
      .expect(200, done);
  });
});

describe('POST /api/v1/getTransactions', function() {
  let jwt = null
  let xKey = null

  before((done) => {
    const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload)
      .then(response => {
        jwt = response.body.result.jwt
        xKey = helper.sha256email(response.body.result.email_address);

        done();
      });
  })

  it('responds with 200 Deposit Object', function (done) {

    const getTransactionsPayload = helper.encrypt({ }, '/api/v1/getTransactions')

    request.post('/api/v1/getTransactions')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(getTransactionsPayload)
      .expect(200, done);
  });
});
