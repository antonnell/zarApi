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
    request.post('/api/v1/pay')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send({})
      .expect(200, done);
  });
});


describe('POST /api/v1/requestDeposit', function () {

});

describe('POST /api/v1/withdraw', function() {

});

describe('POST /api/v1/getTransactions', function() {

});
