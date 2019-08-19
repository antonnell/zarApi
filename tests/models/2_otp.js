const expect = require('chai').expect;
const helper = require('../helper.js')
const assert = require('assert');
let request = require('supertest')
request = request('http://localhost:8000')
const db = require('../../helpers').db

const username = helper.username
const password = helper.password
const data = helper.userDetails

describe('POST /api/v1/requestOTP', function () {

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

  it('responds with 200 OTP Sent', function (done) {
    request.post('/api/v1/requestOTP')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send({})
      .expect(200, done);
  });
});


describe('POST /api/v1/verifyOTP', function () {
  let jwt = null
  let xKey = null
  let otpCode = null

  before((done) => {

    const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload)
      .then(response => {
        jwt = response.body.result.jwt
        xKey = helper.sha256email(response.body.result.email_address);

        db.oneOrNone('select token from otp where user_uuid = $1 and validated is not true order by created desc limit 1;', [response.body.result.uuid])
        .then((otpResponse) => {
          if(otpResponse) {
            otpCode = otpResponse.token
          }
          done();
        })
      });
  });

  it('responds with 400 Something required', function (done) {
    const verifyOTPPayload1 = helper.encrypt({ asd: 'asd' }, '/api/v1/verifyOTP')
    request.post('/api/v1/verifyOTP')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(verifyOTPPayload1)
      .expect(400, done);
  });

  it('responds with 200 Verification Successful', function (done) {

    const verifyOTPayload2 = helper.encrypt({
      pin: otpCode
    }, '/api/v1/verifyOTP')

    request.post('/api/v1/verifyOTP')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(verifyOTPayload2)
      .expect(200, done);
  });
});
