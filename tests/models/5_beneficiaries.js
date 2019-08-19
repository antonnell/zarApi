const expect = require('chai').expect;
const helper = require('../helper.js')
const assert = require('assert');
let request = require('supertest')
request = request('http://localhost:8000')

const username = helper.username
const password = helper.password
const data = helper.userDetails

describe('POST /api/v1/getBeneficiaries', function () {

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

  it('responds with 200 Beneficiaries List', function (done) {
    request.post('/api/v1/getBeneficiaries')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send({})
      .expect(200, done);
  });

});


describe('POST /api/v1/createBeneficiary', function () {
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

        //register a beneficiary user.
        const registerPayload2 = helper.encrypt({ firstname: data.beneficiary.firstname, lastname: data.beneficiary.lastname, mobile_number: data.beneficiary.mobileNumber, password: data.beneficiary.password, email_address: data.beneficiary.emailAddress }, '/api/v1/register')
        request.post('/api/v1/register')
          .set('Accept', 'application/json')
          .auth(username, password)
          .send(registerPayload2)
          .then(response => {
            done()
          });
      });
  });

  it('responds with 400 Something required', function (done) {
    const createBeneficiaryPayload1 = helper.encrypt({  }, '/api/v1/createBeneficiary')
    request.post('/api/v1/createBeneficiary')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(createBeneficiaryPayload1)
      .expect(400, done);
  });

  it('responds with 200 Beneficiary Object', function (done) {

    const createBeneficiaryPayload2 = helper.encrypt({
      name: data.beneficiary.firstname+' '+data.beneficiary.lastname,
      reference: data.firstname+' '+data.lastname+' Payment',
      mobile_number: data.beneficiary.mobileNumber,
      email_address: data.beneficiary.emailAddress,
      account_address: data.beneficiary.accountAddress
    }, '/api/v1/createBeneficiary')

    request.post('/api/v1/createBeneficiary')
      .set('Accept', 'application/json')
      .set('x-key', xKey)
      .set('x-access-token', jwt.token)
      .auth(username, password)
      .send(createBeneficiaryPayload2)
      .expect(200)
      .then((createdBeneficiaryResponse) => {

        request.post('/api/v1/getBeneficiaries')
          .set('Accept', 'application/json')
          .set('x-key', xKey)
          .set('x-access-token', jwt.token)
          .auth(username, password)
          .send({})
          .then((beneficiariesResponse) => {

            assert(beneficiariesResponse.body.result.length > 0)
            assert(beneficiariesResponse.body.result.filter((bene) => { return bene.uuid === createdBeneficiaryResponse.body.result.uuid }).length > 0)

            done()

          });

      });
  });
});
