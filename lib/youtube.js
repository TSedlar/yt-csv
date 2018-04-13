const ytsearch = require('youtube-search')
const fs = require('fs')
const path = require('path')

const OPTS = {
  key: fs.readFileSync(path.join(__dirname, '../youtube-key.txt'), 'utf8'),
  maxResults: 5,
  type: 'video'
}

module.exports = {
  findLikelyVideo: (query) => new Promise((resolve, reject) => {
    ytsearch(query, OPTS, (err, res) => {
      if (err) {
        reject(err)
      } else {
        if (res.length > 0) {
          resolve(res[0].link)
        } else {
          reject('no video found')
        }
      }
    })
  })
}