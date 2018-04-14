const ytsearch = require('youtube-search')
const fs = require('fs')
const path = require('path')

const OPTS = {
  key: fs.readFileSync(path.join(__dirname, '../youtube-key.txt'), 'utf8'),
  maxResults: 5,
  type: 'video'
}

const SHORT_OPTS = Object.assign({}, OPTS, {
  videoDuration: 'short'
})

const MEDIUM_OPTS = Object.assign({}, OPTS, {
  videoDuration: 'medium'
})

module.exports = {
  findLikelyVideo: (query) => new Promise((resolve, reject) => {
    ytsearch(query, SHORT_OPTS, (shortErr, shortRes) => {
      if (shortErr) {
        reject(shortErr)
      } else {
        if (shortRes.length > 0) {
          resolve(shortRes[0].link)
        } else {
          ytsearch(query, MEDIUM_OPTS, (medErr, medRes) => {
            if (medErr) {
              reject(medErr)
            } else {
              if (medRes.length > 0) {
                resolve(medRes[0].link)
              } else {
                reject('no video found')
              }
            }
          })
        }
      }
    })
  })
}