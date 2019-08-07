const expect = require('chai').expect;

const { login, register } = require('../../models/auth.jsx');

let req = {
  body: {},
};

let res = {
  sendCalledWith: '',
  send: function(arg) {
    this.sendCalledWith = arg;
  }
};

describe('auth Route', function() {
    describe('login() function', function() {
        it('Should error out if no mobile_number provided ', function() {
            login(req, res);
            expect(res.sendCalledWith).to.contain('error');
        });
    })
});
