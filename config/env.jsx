const config = {
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  encrKey: process.env.ZAR_KEY,
  zarApi: process.env.ZAR_API,
  secret: process.env.ZAR_SECRET,

}

module.exports = config
