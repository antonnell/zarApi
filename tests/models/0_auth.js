const expect = require('chai').expect;
const helper = require('../helper.js')
let request = require('supertest')
request = request('http://localhost:8000')

const username = helper.username
const password = helper.password
const data = helper.userDetails

describe('POST /api/v1/login', function () {

  const loginPayload1 = helper.encrypt({ password: data.password }, '/api/v1/login')
  it('responds with 400 Mobile_number required', function (done) {
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload1)
      .expect(400, done);
  });

  const loginPayload2 = helper.encrypt({ mobile_number: data.mobileNumber }, '/api/v1/login')
  it('responds with 400 Password required', function (done) {
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload2)
      .expect(400, done);
  });

  const loginPayload3 = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
  it('responds with 204 User not found', function (done) {
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload3)
      .expect(204, done);
  });
});


describe('POST /api/v1/register', function () {

  const registerPayload1 = helper.encrypt({ firstname: data.firstname, lastname: data.lastname }, '/api/v1/register')
  it('responds with 400 Mobile_number required', function (done) {
    request.post('/api/v1/register')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(registerPayload1)
      .expect(400, done);
  });

  const registerPayload2 = helper.encrypt({ firstname: data.firstname, lastname: data.lastname, mobile_number: data.mobileNumber, password: data.password, email_address: data.emailAddress }, '/api/v1/register')
  it('responds with 200 User object, login should work once returned', function (done) {
    request.post('/api/v1/register')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(registerPayload2)
      .expect(200)
      .then(response => {
        const loginPayload = helper.encrypt({ mobile_number: data.mobileNumber, password: data.password }, '/api/v1/login')
        request.post('/api/v1/login')
          .set('Accept', 'application/json')
          .auth(username, password)
          .send(loginPayload)
          .expect(200, done);
      })
  });

});
