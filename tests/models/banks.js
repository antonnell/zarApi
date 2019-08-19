const expect = require('chai').expect;
const helper = require('../helper.js')
const assert = require('assert');
let request = require('supertest')
request = request('http://localhost:8000')

const username = helper.username
const password = helper.password
const data = helper.userDetails

describe('POST /api/v1/getBankAccounts', function () {

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
        done()
      });
  })

  const getBankAcccountsPayload = helper.encrypt({  }, '/api/v1/getBankAccounts')
  it('responds with 200 BankAccountsList', function (done) {
    request.post('/api/v1/getBankAccounts')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(getBankAcccountsPayload)
      .expect(200, done);
  });

});

describe('POST /api/v1/getBanks', function () {

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
        done()
      });
  })

  it('responds with 200 banks array', function (done) {
    const getBanksPayload = helper.encrypt({  }, '/api/v1/getBanks')
    request.post('/api/v1/getBanks')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(getBanksPayload)
      .expect(200, done);
  });
});


describe('POST /api/v1/getBankAccountTypes', function () {

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
        done()
      });
  })

  it('responds with 200 bankAccountTypes array', function (done) {
    const getBankAccountTypesPayload = helper.encrypt({  }, '/api/v1/getBankAccountTypes')
    request.post('/api/v1/getBankAccountTypes')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(getBankAccountTypesPayload)
      .expect(200, done);
  });

});


describe('POST /api/v1/createBankAccount', function () {
  let jwt = null
  let xKey = null
  let banks = null
  let bankAccountTypes = null

  before((done) => {

    const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload)
      .then(response => {
        jwt = response.body.result.jwt
        xKey = helper.sha256email(response.body.result.email_address);

        request.post('/api/v1/getBanks')
          .set('Accept', 'application/json')
          .set('x-key', xKey)
          .set('x-access-token', jwt.token)
          .auth(username, password)
          .send({})
          .then((banksResponse) => {
            banks = banksResponse.body.result

            request.post('/api/v1/getBankAccountTypes')
              .set('Accept', 'application/json')
              .set('x-key', xKey)
              .set('x-access-token', jwt.token)
              .auth(username, password)
              .send({})
              .then((bankAccountTypesResponse) => {

                bankAccountTypes = bankAccountTypesResponse.body.result
                done()
              });
          });
      });
  });

  it('responds with 400 Something required', function (done) {
    const createBankAccountPayload1 = helper.encrypt({  }, '/api/v1/createBankAccount')
    request.post('/api/v1/createBankAccount')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(createBankAccountPayload1)
      .expect(400, done);
  });

  it('responds with 200 Bank account Object', function (done) {

    const createBankAccountPayload2 = helper.encrypt({
        bank_uuid: banks.filter((type) => { return type.name === data.bankAccount.bank })[0].uuid,
        account_type_uuid: bankAccountTypes.filter((type) => { return type.account_type === data.bankAccount.accountType })[0].uuid,
        name: data.bankAccount.name,
        full_name: data.bankAccount.fullName,
        account_number: data.bankAccount.accountNumber
      }, '/api/v1/createBankAccount')

    request.post('/api/v1/createBankAccount')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(createBankAccountPayload2)
      .expect(200)
      .then((createdBankAccountResponse) => {
        request.post('/api/v1/getBankAccounts')
          .set('Accept', 'application/json')
          .set('x-key', xKey)
          .set('x-access-token', jwt.token)
          .auth(username, password)
          .send({})
          .then((bankAccountsResponse) => {
            assert(bankAccountsResponse.body.result.length > 0)
            assert(bankAccountsResponse.body.result.filter((acc) => { return acc.uuid === createdBankAccountResponse.body.result.uuid }).length > 0)

            done()
          });
      });
  });
});
