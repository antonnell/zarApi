const bank = {
  getBalance(address, callback) {
    callback(null, 2304.23)
  },

  withdraw(addres, amount, callback) {
    callback(null, 'OK')
  },
}

module.exports = bank
