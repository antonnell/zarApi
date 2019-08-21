const {
  encryption,
  zarNetwork
} = require('../helpers');

const asset = {

  getAsset(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {
      const token = encryption.decodeToken(req, res)

      db.manyOrNone('select uuid, name, symbol, total_supply, mintable, owner_burnable, holder_burnable, from_burnable, freezable from assets where issued is true or user_uuid = $1;', [token.user.uuid])
      .then((assets) => {
        if(!assets) {
          res.status(204)
          res.body = { 'status': 204, 'success': true, 'result': [] }
          return next(null, req, res, next)
        }
        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': assets }
        return next(null, req, res, next)
      })
      .catch((err) => {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      })
    })
  },

  issueAsset(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = asset.validateIssue(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)

      asset.insertAsset(data, token.user, (err, assetDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        zarNetwork.issue(data, (err, issueResponse) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          asset.updateAsset(assetDetails, issueResponse, (err) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': 'Asset Issued' }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

  validateIssue(data) {
    const {
      symbol,
      name,
      total_supply
      minting_address,
      mintable,
      owner_burnable,
      holder_burnable,
      from_burnable,
      freezable
    } = data

    if(!symbol) {
      return 'symbol is required'
    }

    if(!name) {
      return 'name is required'
    }

    if(!total_supply) {
      return 'total_supply is required'
    }

    if(!minting_address) {
      return 'minting_address is required'
    }

    return true
  },

  insertAsset(data, user, callback) {
    db.oneOrNone('insert into assets (uuid, user_uuid, name, symbol, total_supply, minting_address, mintable, owner_burnable, holder_burnable, from_burnable, freezable, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, $7, $8, now()) returning *;',
    [user.uuid, data.name, data.symbol, data.total_supply, data.minting_address, data.mintable, data.owner_burnable, data.holder_burnable, data.from_burnable, data.freezable])
    .then((asset) => {
      callback(null, asset)
    })
    .catch(callback)
  },

  updateAsset(asset, issueResponse, callback) {
    db.none('update assets set issued = true, issue_response = $2 modified = now() where uuid = $1;', [asset.uuid, issueResponse])
    .then(callback)
    .catch(callback)
  },

  mintAsset(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = asset.validateMint(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)

      asset.getAsset(data.asset_uuid, (err, assetDetails) => {

        zarNetwork.mint(data, assetDetails, (err, mintResponse) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          asset.updateAssetTotalSupply(assetDetails.uuid, mintResponse.total_supply, (err) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': 'Asset Minted' }
            return next(null, req, res, next)
          })
        })

      })
    })
  },

  validateMint(data) {
    const {
      asset_uuid,
      recipient_uuid,
      amount
    } = data

    if(!asset_uuid) {
      return 'asset_uuid is required'
    }

    if(!recipient_uuid) {
      return 'recipient_uuid is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    return true
  },

  getAsset(assetUuid, callback) {
    db.oneOrNone('select * from assets where uuid = $1;', [assetUuid])
    .then((assetDetails) => {
      callback(assetDetails)
    })
    .catch(callback)
  },

  updateAssetTotalSupply(assetUuid, totalSupply, callback) {
    db.none('update assets set total_supply=$2, modified=now() where uuid = $1', [assetUuid, totalSupply])
    .then(callback)
    .catch(callback)
  },

  burnAsset(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = asset.validateBurn(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      const token = encryption.decodeToken(req, res)

      asset.getAsset(data.asset_uuid, (err, assetDetails) => {

        zarNetwork.burn(data, assetDetails, (err, burnResponse) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          asset.updateAssetTotalSupply(assetDetails.uuid, burnResponse.total_supply, (err) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': 'Asset Burnt' }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

  validateBurn(data) {
    const {
      asset_uuid,
      address_uuid,
      amount
    } = data

    if(!asset_uuid) {
      return 'asset_uuid is required'
    }

    if(!recipient_uuid) {
      return 'recipient_uuid is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    return true
  },
}

module.exports = asset
