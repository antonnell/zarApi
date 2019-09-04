const {
  encryption,
  zarNetwork,
  db
} = require('../helpers');

const asset = {

  getAssets(req, res, next) {
    const token = encryption.decodeToken(req, res)

    zarNetwork.getIssueList((err, issueList) => {
      if(err) {
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': err }
        return next(null, req, res, next)
      }

      db.manyOrNone('select uuid, user_uuid, asset_id, image_data, image_extension from assets where issued is true;', [token.user.uuid])
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
            issue.image_data = issueAsset[0].image_data
            issue.image_extension = issueAsset[0].image_extension
          }
          return issue
        })

        //add fantom token
        issueList.push({
          burn_from_disabled: false,
          burn_holder_disabled: false,
          burn_owner_disabled: false,
          freeze_disabled: false,
          minting_finished: false,
          decimals: "18",
          description: "",
          issue_id: "ftm",
          issue_time: "1567416346",
          issuer: "",
          name: "Fantom",
          owner: "",
          symbol: "FTM",
          total_supply: "10000000",
          user_uuid: "fantomuuid",
          uuid: "fantomuuid",
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

  async issueAsset(req, res, next) {
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
            let rawLog = null
            let txId = null
            try {
              success = issueResponse.result.logs ? issueResponse.result.logs[0].success : false
              if(!success) {
                rawLog = JSON.parse(issueResponse.result.raw_log)
              }
              txId = issueResponse.result.txhash
            } catch(ex) {
              console.log(ex)
            }

            if(success) {

              zarNetwork.verifyTransactionSuccess(txId, (err, transactionDetails) => {
                if(err) {
                  console.log(err)
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                let issueId = null
                let issueSuccess = null
                let issueError = null
                try {
                  issueError = transactionDetails.error

                  if(issueError) {
                    res.status(400)
                    res.body = { 'status': 400, 'success': false, 'result': issueError }
                    return next(null, req, res, next)
                  }

                  issueSuccess = transactionDetails.logs[0].success
                  if(issueSuccess) {
                    issueId = transactionDetails.events[0].attributes.filter((att) => { return att.key === 'issue-id'})[0].value
                  } else {
                    issueError = JSON.parse(transactionDetails.logs[0].log).message

                    res.status(400)
                    res.body = { 'status': 400, 'success': false, 'result': issueError }
                    return next(null, req, res, next)
                  }
                } catch(ex) {
                  console.log(ex)

                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': ex }
                  return next(null, req, res, next)
                }

                asset.updateAsset(assetDetails, issueResponse, issueSuccess, issueId, (err) => {
                  if(err) {
                    console.log(err)
                    res.status(500)
                    res.body = { 'status': 500, 'success': false, 'result': err }
                    return next(null, req, res, next)
                  }

                  res.status(205)
                  res.body = { 'status': 200, 'success': issueSuccess, 'result': txId }
                  return next(null, req, res, next)
                })
              })

            } else {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': rawLog }
              return next(null, req, res, next)
            }
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

          asset.getRecipientAddress(data, (err, recipientAddress) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            asset.insertMint(token.user, data, assetDetails, recipientAddress, (err, mintRequest) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              const privateKey = encryption.unhashAccountField(accountDetails.private_key, accountDetails.encr_key)

              zarNetwork.mint(data, assetDetails, privateKey, accountDetails.address, recipientAddress.address, (err, mintResponse) => {
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

                if(success) {

                  zarNetwork.verifyTransactionSuccess(txId, (err, transactionDetails) => {
                    if(err) {
                      console.log(err)
                      res.status(500)
                      res.body = { 'status': 500, 'success': false, 'result': err }
                      return next(null, req, res, next)
                    }

                    let mintSuccess = null
                    let mintError = null
                    try {
                      mintError = transactionDetails.error

                      if(mintError) {
                        res.status(400)
                        res.body = { 'status': 400, 'success': false, 'result': mintError }
                        return next(null, req, res, next)
                      }

                      mintSuccess = transactionDetails.logs[0].success
                      if(!mintSuccess) {
                        mintError = JSON.parse(transactionDetails.logs[0].log).message

                        res.status(400)
                        res.body = { 'status': 400, 'success': false, 'result': mintError }
                        return next(null, req, res, next)
                      }
                    } catch(ex) {
                      console.log(ex)

                      res.status(500)
                      res.body = { 'status': 500, 'success': false, 'result': ex }
                      return next(null, req, res, next)
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
                } else {
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': mintResponse }
                  return next(null, req, res, next)
                }
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
      amount,
      address,
      beneficiary_uuid,
      own_account_uuid
    } = data

    if(!asset_uuid) {
      return 'asset_uuid is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    if(!address && !beneficiary_uuid && !own_account_uuid) {
      return 'identifier is required'
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

  getRecipientAddress(data, callback) {
    if(data.recipient_type == 'public') {
      return callback(null, { address:  data.address })
    }

    if(data.recipient_type == 'beneficiary') {
      db.oneOrNone('select a.address from beneficiaries b left join accounts a on b.beneficiary_user_uuid = a.user_uuid where b.uuid = $1;', [data.beneficiary_uuid])
      .then((acc) => {
        callback(null, acc)
      })
      .catch(callback)
      return
    }

    if(data.recipient_type == 'own') {
      db.oneOrNone('select address from accounts where uuid = $1;', [data.own_account_uuid])
      .then((acc) => {
        callback(null, acc)
      })
      .catch(callback)
      return
    }
  },

  insertMint(user, data, assetDetails, recipientAddress, callback) {

    db.oneOrNone('insert into mint_requests (uuid, user_uuid, asset_uuid, amount, recipient_type, recipient_address, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now()) returning uuid',
    [user.uuid, assetDetails.uuid, data.amount, data.recipient_type, recipientAddress.address])
    .then((mintRequest) => {
      callback(null, mintRequest)

      //just inserting into transactions for now
      db.none('insert into transactions (uuid, user_uuid, reference, amount, source_uuid, type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now());',
      [user.uuid, 'Mint Asset', data.amount, mintRequest.uuid, 'Mint Asset'])
      .then(() => {})
      .catch((err) => { console.log(err) })
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

          asset.getRecipientAddress(data, (err, recipientAddress) => {
            if(err) {
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            asset.insertBurn(token.user, data, assetDetails, recipientAddress, (err, burnRequest) => {
              if(err) {
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              const privateKey = encryption.unhashAccountField(accountDetails.private_key, accountDetails.encr_key)

              zarNetwork.burn(data, assetDetails, privateKey, accountDetails.address, recipientAddress.address, (err, burnResponse) => {
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


                if(success) {

                  zarNetwork.verifyTransactionSuccess(txId, (err, transactionDetails) => {
                    if(err) {
                      console.log(err)
                      res.status(500)
                      res.body = { 'status': 500, 'success': false, 'result': err }
                      return next(null, req, res, next)
                    }

                    let burnSuccess = null
                    let burnError = null
                    try {
                      burnError = transactionDetails.error

                      if(burnError) {
                        res.status(400)
                        res.body = { 'status': 400, 'success': false, 'result': burnError }
                        return next(null, req, res, next)
                      }

                      burnSuccess = transactionDetails.logs[0].success
                      if(!burnSuccess) {
                        burnError = JSON.parse(transactionDetails.logs[0].log).message

                        res.status(400)
                        res.body = { 'status': 400, 'success': false, 'result': burnError }
                        return next(null, req, res, next)
                      }
                    } catch(ex) {
                      console.log(ex)

                      res.status(500)
                      res.body = { 'status': 500, 'success': false, 'result': ex }
                      return next(null, req, res, next)
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
                } else {
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': burnResponse }
                  return next(null, req, res, next)
                }
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
      amount,
    } = data

    if(!asset_uuid) {
      return 'asset_uuid is required'
    }

    if(!amount) {
      return 'amount is required'
    }

    return true
  },

  insertBurn(user, data, assetDetails, recipientAddress, callback) {
    db.oneOrNone('insert into burn_requests (uuid, user_uuid, asset_uuid, amount, recipient_type, recipient_address, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now()) returning uuid',
    [user.uuid, assetDetails.uuid, data.amount, data.recipient_type, recipientAddress.address])
    .then((burnRequest) => {
      callback(null, burnRequest)

      //just inserting into transactions for now
      db.none('insert into transactions (uuid, user_uuid, reference, amount, source_uuid, type, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now());',
      [user.uuid, 'Burn Asset', data.amount, burnRequest.uuid, 'Burn Asset'])
      .then(() => {})
      .catch((err) => { console.log(err) })
    })
    .catch(callback)
  },

  updateBurnProcessed(burnRequest, response, callback) {
    db.none('update burn_requests set processed = true, processed_result = $2, processed_time = now(), modified = now() where uuid = $1',
    [burnRequest.uuid, response])
    .then(callback)
    .catch(callback)
  },

  uploadAssetImage(req, res, next) {
    encryption.descryptPayload(req, res, next, (data) => {

      const validation = asset.validateUploadAssetImage(data)
      if(validation !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': validation }
        return next(null, req, res, next)
      }

      asset.getAssetDetails(data.asset_uuid, (err, assetDetails) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!assetDetails) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'No matching address found' }
          return next(null, req, res, next)
        }

        const token = encryption.decodeToken(req, res)

        if(assetDetails.user_uuid != token.user.uuid) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Invalid asset owner' }
          return next(null, req, res, next)
        }

        asset.updateImageData(data, (err) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': 'Asset updated' }
          return next(null, req, res, next)
        })
      })
    })
  },

  validateUploadAssetImage(data) {
    const {
      asset_uuid,
      image_data,
      image_extension
    } = data

    if(!asset_uuid) {
      return 'asset_uuid is required'
    }

    if(!image_data) {
      return 'image_data is required'
    }

    if(!image_extension) {
      return 'image_extension is required'
    }

    return true
  },

  updateImageData(data, callback) {
    db.none('update assets set image_data = $1, image_extension = $2 where uuid = $3;',
    [data.image_data, data.image_extension, data.asset_uuid])
    .then(callback)
    .catch(callback)
  }
}

module.exports = asset
