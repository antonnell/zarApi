const expect = require('chai').expect;
const helper = require('../helper.js')
let request = require('supertest')
request = request('http://localhost:8000')

const username = helper.username
const password = helper.password

describe('POST /api/v1/testEncryption', function () {

  const notEncrypted = { name: 'john' }
  const encrypted = helper.encrypt(notEncrypted, '/api/v1/testEncryption');

  it('responds with 501 Not Implemented', function (done) {
    request.post('/api/v1/testEncryption')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(notEncrypted)
      .expect(501, done);
  });

  it('responds with 200 Returning decrypted payload', function (done) {
    request.post('/api/v1/testEncryption')
      .set('Accept', 'application/json')
      .auth(username, password)
      .send(encrypted)
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
