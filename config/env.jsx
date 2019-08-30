const config = {
  host: process.env.HOST,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PASSWORD,

  encrKey: process.env.KEY,
  zarApi: process.env.API,
  secret: process.env.SECRET,

}

module.exports = config
