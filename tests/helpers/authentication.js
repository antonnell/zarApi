const expect = require('chai').expect;
const helper = require('../helper.js')
let request = require('supertest')
request = request('http://localhost:8000')

const username = helper.username
const password = helper.password

describe('POST /api/v1/donothing', function () {

  it('responds with 401 Authentication Required', function (done) {
    request.post('/api/v1/doNothing')
      .set('Accept', 'application/json')
      .expect(401, done);
  });

  it('responds with 200 Nothing happened', function (done) {
    request.post('/api/v1/doNothing')
      .set('Accept', 'application/json')
      .auth(username, password)
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
