const expect = require('chai').expect;
const helper = require('../helper.js')
let request = require('supertest')
request = request('http://localhost:8000')

const username = helper.username
const password = helper.password

describe('POST /api/v1/login', function () {

  const loginPayload1 = helper.encrypt({ password: '123123123' }, '/api/v1/login')
  it('responds with 400 Mobile_number required', function (done) {
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload1)
      .expect(400, done);
  });

  const loginPayload2 = helper.encrypt({ mobile_number: '0849411359' }, '/api/v1/login')
  it('responds with 400 Password required', function (done) {
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload2)
      .expect(400, done);
  });

  const loginPayload3 = helper.encrypt({ mobile_number: '0849411359', password: '123123123' }, '/api/v1/login')
  it('responds with 204 User not found', function (done) {
    request.post('/api/v1/login')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(loginPayload3)
      .expect(204, done);
  });
});
