const {
  encryption,
  zarNetwork,
  db
} = require('../helpers');

const asset = {

  getAssets(req, res, next) {
    const token = encryption.decodeToken(req, res)

    zarNetwork.getIssueList((err, issueList) => {
      db.manyOrNone('select uuid, user_uuid, asset_id from assets where issued is true;', [token.user.uuid])
      .then((assets) => {
        if(!issueList || issueList.result.length === 0) {
          res.status(204)
          res.body = { 'status': 204, 'success': true, 'result': [] }
          return next(null, req, res, next)
        }

        issueList = issueList.result.map((issue) => {
          const issueAsset = assets.filter((asset) => { return asset.asset_id === issue.issue_id })
          if(issueAsset.length > 0) {
            issue.uuid = issueAsset[0].uuid
            issue.user_uuid = issueAsset[0].user_uuid
          }
          return issue
        })

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': issueList }
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

      asset.getAccountDetails(data.minting_address, (err, accountDetails) => {
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!accountDetails || accountDetails.length == 0) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching address found' }
          return next(null, req, res, next)
        }

        asset.insertAsset(data, token.user, (err, assetDetails) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          const privateKey = encryption.unhashAccountField(accountDetails.private_key, accountDetails.encr_key)

          zarNetwork.issue(data, accountDetails, privateKey, (err, issueResponse) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            //get success
            let success = false
            let txId = null
            try {
              success = issueResponse.result.logs[0].success
              txId = issueResponse.result.txhash
            } catch(ex) {
              console.log(ex)
            }

            zarNetwork.getTransaction(txId, (err, transactionDetails) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              let issueId = null
              try {
                issueId = transactionDetails.events[0].attributes.filter((att) => { return att.key === 'issue-id'})[0].value
              } catch(ex) {
                console.log(ex)
              }

              asset.updateAsset(assetDetails, issueResponse, success, issueId, (err) => {
                if(err) {
                  console.log(err)
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                res.status(205)
                res.body = { 'status': 200, 'success': success, 'result': txId }
                return next(null, req, res, next)
              })
            })
          })
        })
      })

    })
  },

  validateIssue(data) {
    const {
      symbol,
      name,
      total_supply,
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

  getAccountDetails(addressUuid, callback) {
    db.oneOrNone('select * from accounts where uuid = $1;', [addressUuid])
    .then((account) => {
      callback(null, account)
    })
    .catch(callback)
  },

  insertAsset(data, user, callback) {
    db.oneOrNone('insert into assets (uuid, user_uuid, name, symbol, total_supply, minting_address_uuid, mintable, owner_burnable, holder_burnable, from_burnable, freezable, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now()) returning *;',
    [user.uuid, data.name, data.symbol, data.total_supply, data.minting_address, data.mintable, data.owner_burnable, data.holder_burnable, data.from_burnable, data.freezable])
    .then((asset) => {
      callback(null, asset)
    })
    .catch(callback)
  },

  updateAsset(asset, issueResponse, succcess, issueId, callback) {
    db.none('update assets set issued = $3, issue_response = $2, asset_id = $4, modified = now() where uuid = $1;', [asset.uuid, issueResponse, succcess, issueId])
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

      asset.getAccountDetailsForUser(token.user.uuid, (err, accountDetails) => {
        console.log(accountDetails)
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!accountDetails || accountDetails.length == 0) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching address found' }
          return next(null, req, res, next)
        }

        asset.getAssetDetails(data.asset_uuid, (err, assetDetails) => {
          console.log(assetDetails)
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          if(!assetDetails || assetDetails.length == 0) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'No matching address found' }
            return next(null, req, res, next)
          }

          asset.insertMint(token.user, data, assetDetails, (err, mintRequest) => {
            console.log(mintRequest)
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            const privateKey = encryption.unhashAccountField(accountDetails.private_key, accountDetails.encr_key)

            zarNetwork.mint(data, assetDetails, privateKey, accountDetails.address, (err, mintResponse) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              //get success
              let success = false
              let txId = null
              try {
                success = mintResponse.result.logs[0].success
                txId = mintResponse.result.txhash
              } catch(ex) {
                console.log(ex)
              }

              asset.updateMintProcessed(mintRequest, mintResponse, (err) => {
                if(err) {
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                res.status(205)
                res.body = { 'status': 200, 'success': success, 'result': txId }
                return next(null, req, res, next)
              })
            })
          })
        })
      })
    })
  },

  validateMint(data) {
    const {
      asset_uuid,
      address,
      amount
    } = data

    if(!asset_uuid) {
      return 'asset_uuid is required'
    }

    if(!address) {
      return 'address is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    return true
  },

  getAccountDetailsForUser(userUUID, callback) {
    db.oneOrNone('select * from accounts where user_uuid = $1 order by created desc limit 1;', [userUUID])
    .then((accountDetails) => {
      callback(null, accountDetails)
    })
    .catch(callback)
  },

  getAssetDetails(assetUuid, callback) {
    db.oneOrNone('select * from assets where uuid = $1;', [assetUuid])
    .then((assetDetails) => {
      callback(null, assetDetails)
    })
    .catch(callback)
  },

  insertMint(user, data, assetDetails, callback) {
    db.oneOrNone('insert into mint_requests (uuid, user_uuid, asset_uuid, amount, recipient_address, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, now()) returning uuid',
    [user.uuid, assetDetails.uuid, data.amount, data.address])
    .then((mintRequest) => {
      callback(null, mintRequest)
    })
    .catch(callback)
  },

  updateMintProcessed(mintRequest, response, callback) {
    db.none('update mint_requests set processed = true, processed_result = $2, processed_time = now(), modified = now() where uuid = $1',
    [mintRequest.uuid, response])
    .then(callback)
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

      asset.getAccountDetailsForUser(token.user.uuid, (err, accountDetails) => {
        console.log(accountDetails)
        if(err) {
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!accountDetails || accountDetails.length == 0) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching address found' }
          return next(null, req, res, next)
        }

        asset.getAssetDetails(data.asset_uuid, (err, assetDetails) => {
          if(err) {
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          if(!assetDetails || assetDetails.length == 0) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'No matching address found' }
            return next(null, req, res, next)
          }

          asset.insertBurn(token.user, data, assetDetails, (err, burnRequest) => {
            console.log(burnRequest)
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            const privateKey = encryption.unhashAccountField(accountDetails.private_key, accountDetails.encr_key)

            zarNetwork.burn(data, assetDetails, privateKey, accountDetails.address, (err, burnResponse) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              //get success
              let success = false
              let txId = null
              try {
                success = burnResponse.result.logs[0].success
                txId = burnResponse.result.txhash
              } catch(ex) {
                console.log(ex)
              }

              asset.updateBurnProcessed(burnRequest, burnResponse, (err) => {
                if(err) {
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                res.status(205)
                res.body = { 'status': 200, 'success': success, 'result': txId }
                return next(null, req, res, next)
              })
            })
          })
        })
      })
    })
  },

  validateBurn(data) {
    const {
      asset_uuid,
      address,
      amount
    } = data

    if(!asset_uuid) {
      return 'asset_uuid is required'
    }

    if(!address) {
      return 'address is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    return true
  },

  insertBurn(user, data, assetDetails, callback) {
    db.oneOrNone('insert into burn_requests (uuid, user_uuid, asset_uuid, amount, recipient_address, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, now()) returning uuid',
    [user.uuid, assetDetails.uuid, data.amount, data.address])
    .then((burnRequest) => {
      callback(null, burnRequest)
    })
    .catch(callback)
  },

  updateBurnProcessed(burnRequest, response, callback) {
    db.none('update burn_requests set processed = true, processed_result = $2, processed_time = now(), modified = now() where uuid = $1',
    [burnRequest.uuid, response])
    .then(callback)
    .catch(callback)
  },
}

module.exports = asset
