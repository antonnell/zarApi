const expect = require('chai').expect;
const helper = require('../helper.js')
const assert = require('assert');
let request = require('supertest')
request = request('http://localhost:8000')

const username = helper.username
const password = helper.password
const data = helper.userDetails

describe('POST /api/v1/getAccounts', function () {

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

  it('responds with 200 Payment processed', function (done) {
    request.post('/api/v1/getAccounts')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send({})
      .expect(200, done);
  });
});


describe('POST /api/v1/createAccount', function () {

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

  it('responds with 200 Account Object', function (done) {

    const createAccountPayload1 = helper.encrypt({
      name: data.account.name,
      account_type: data.account.accountType
    }, '/api/v1/createAccount')

    request.post('/api/v1/createAccount')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(createAccountPayload1)
      .expect(200)
      .then((createdAccountResponse) => {

        request.post('/api/v1/getAccounts')
          .set('Accept', 'application/json')
          .set('x-key', xKey)
          .set('x-access-token', jwt.token)
          .auth(username, password)
          .send({})
          .then((accountsResponse) => {

            assert(accountsResponse.body.result.length > 0)
            assert(accountsResponse.body.result.filter((acc) => { return acc.uuid === createdAccountResponse.body.result.uuid }).length > 0)

            done()

          });
      });
  });
});
