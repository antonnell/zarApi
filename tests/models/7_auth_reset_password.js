const expect = require('chai').expect;
const assert = require('chai').assert;
const helper = require('../helper.js')
let request = require('supertest')
request = request('http://localhost:8000')
const db = require('../../helpers').db

const username = helper.username
const password = helper.password
const data = helper.userDetails

describe('POST /api/v1/resetPassword', function () {
  const requestResetPasswordPayload = helper.encrypt({ mobile_number: data.mobileNumber }, '/api/v1/resetPassword')
  it('responds with 200 OTP Sent', function (done) {
    request.post('/api/v1/resetPassword')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(requestResetPasswordPayload)
      .expect(200, done);
  });
});

describe('POST /api/v1/verifyResetPassword & /api/v1/setPassword', function() {
  let otpCode = null
  let userUuid = null;

  before((done) => {
    db.oneOrNone('select token, user_uuid from otp where user_uuid = (select uuid from users where mobile_number = $1) and validated is not true order by created desc limit 1;', [data.mobileNumber])
    .then((otpResponse) => {
      if(otpResponse) {
        otpCode = otpResponse.token
        userUuid = otpResponse.user_uuid
      }
      done();
    })
  })

  it('responds with 200 Password Updated', function (done) {

    const verifyResetPasswordPayload = helper.encrypt({
      pin: otpCode,
      mobile_number: data.mobileNumber
    }, '/api/v1/verifyResetPassword')

    request.post('/api/v1/verifyResetPassword')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(verifyResetPasswordPayload)
      .expect(200)
      .then((verifyResetPasswordResponse) => {
        const uuid = verifyResetPasswordResponse.body.result

        const setPasswordPayload = helper.encrypt({
          validation_uuid: uuid,
          new_password: data.newPassword
        }, '/api/v1/setPassword')

        request.post('/api/v1/setPassword')
          .set('Accept', 'application/json')
          .auth(username, password)
          .send(setPasswordPayload)
          .expect(200)
          .then(() => {
            //login should work on new password
            const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.newPassword }, '/api/v1/login')
            request.post('/api/v1/login')
              .set('Accept', 'application/json')
              .auth(username, password)
              .send(loginPayload)
              .then(response => {
                assert(response.body != null && response.body.result != null)
                assert(response.body.result.uuid == userUuid)

                done()
              });
          });
      });
  });

})
