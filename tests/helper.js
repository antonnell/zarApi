const crypto = require('crypto');
const bip39 = require('bip39');
const sha256 = require('sha256');

const username = 'E80F37F52BC4C64EBBFE4ADBBCC756D52D270445BBA4B28D890E8524369E4BE2'
const password = '568462C4B808FBDCE6EE1728AA3D7C6E802413323975D3EB81372AA510D50CE7'

const userDetails = {
  firstname: 'John',
  lastname: 'Doe',
  mobileNumber: '0849411360',
  emailAddress: 'johndoe@gmail.com',
  password: '123123123',
  bankAccount: {
    bank: 'ABSA',
    accountType: 'Savings',
    name: 'My Account',
    fullName: 'Mr John Doe',
    accountNumber: '123123123'
  },
  beneficiary: {
    firstname: 'Jane',
    lastname: 'Doe',
    mobileNumber: '0849411361',
    emailAddress: 'janedoe@gmail.com',
    password: '123123123',
    accountAddress: null
  }
}

function hexEncode(string) {
  var hex, i;
  var result = '';
  for (i = 0; i < string.length; i++) {
    hex = string.charCodeAt(i).toString(16);
    result += ('000' + hex).slice(-4);
  }
  return result;
};

function encrypt(data, url) {
  const signJson = JSON.stringify(data);
  const signMnemonic = bip39.generateMnemonic();
  const cipher = crypto.createCipher('aes-256-cbc', signMnemonic);
  const signEncrypted =
    cipher.update(signJson, 'utf8', 'base64') + cipher.final('base64');
  var signData = {
    e: hexEncode(signEncrypted),
    m: hexEncode(signMnemonic),
    u: sha256(url).toUpperCase(),
    p: sha256(sha256(url).toUpperCase()).toUpperCase(),
    t: new Date().getTime()
  };
  const signSeed = JSON.stringify(signData);
  const signSignature = sha256(signSeed);
  signData.s = signSignature;
  return signData;
}

function sha256email(email) {
  return sha256(email)
}

module.exports = {
  username,
  password,
  encrypt,
  sha256email,
  userDetails
}
