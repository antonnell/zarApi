const {
  encryption,
  zarNetwork,
  db
} = require('../helpers');

const NativeDenoms = {
  getNativeDenoms(req, res, next) {
    const token = encryption.decodeToken(req, res)

    zarNetwork.getDenomList((err, nativeList) => {
      if(err) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      if(!nativeList || nativeList.result.length === 0) {
        res.status(204)
        res.body = { 'status': 204, 'success': true, 'result': [] }
        return next(null, req, res, next)
      }

      db.manyOrNone('select uuid, name, denom, image_data, image_extension from native_denoms;')
      .then((nativeDenoms) => {
        if(!nativeDenoms || nativeDenoms.length === 0) {
          res.status(204)
          res.body = { 'status': 204, 'success': true, 'result': [] }
          return next(null, req, res, next)
        }

        nativeList = nativeList.result.map((native) => {
          const match = nativeDenoms.filter((nativeDenom) => { return nativeDenom.denom === native.denom })
          let returnDenom = native
          if(match.length > 0) {
            returnDenom.uuid = match[0].uuid
            returnDenom.name = match[0].name
            returnDenom.image_data = match[0].image_data
            returnDenom.image_extension = match[0].image_extension
          }
          return returnDenom
        })

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': nativeList }
        return next(null, req, res, next)
      })
    })
  },

  getNativeDenomPrice(req, res, next) {
    const token = encryption.decodeToken(req, res)

    zarNetwork.getDenomPrice((err, price) => {
      if(err) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      res.status(205)
      res.body = { 'status': 200, 'success': true, 'result': price }
      return next(null, req, res, next)
    })
  },
}

module.exports = NativeDenoms
