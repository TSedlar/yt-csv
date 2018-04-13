const reader = require('./csv-reader')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const youtube = require('./youtube')

const SPOTIFY_TRACK = 'https://open.spotify.com/track/'

var self = module.exports = {
  fetchMissingTags: (data) => new Promise((resolve, reject) => {
    // data = data.slice(0, 1) // just for testing purposes
    let promises = data.map(item => new Promise((res, rej) => {
      let trackId = item['spotify_uri']
      trackId = trackId.substring(trackId.lastIndexOf(':') + 1)
      let trackURL = (SPOTIFY_TRACK + trackId)
      fetch(trackURL)
        .then(trackData => trackData.text())
        .then(trackData => {
          let $ = cheerio.load(trackData)
          item['cover'] = $('meta[property="og:image"]').attr('content')
          let artistURL = $('meta[property="music:musician"]').attr('content')
          fetch(artistURL)
            .then(artistData => artistData.text())
            .then(artistData => {
              artistData = artistData.replace(/\s+/g, '')
              let genre = "Misc."
              if (artistData.indexOf('"genres":["') != -1) {
                genre = artistData.split('"genres":["')[1].split('"')[0]
                if (genre[0] == genre[0].toLowerCase()) {
                  genre = genre[0].toUpperCase() + genre.substring(1) // capitalize first letter
                } 
              }
              item['genre'] = genre
              let query = `${item['artist_name']} ${item['track_name']}`
              youtube.findLikelyVideo(query)
                .then(link => {
                  item['youtube_link'] = link
                  res()
                })
                .catch(err => rej(err)) // resolve to continue, yt vid not found
            })
            .catch(err => rej(err)) // resolve to continue, the genre is simply unknown.
        })
        .catch(err => rej(err)) // resolve to continue, likely a rate-limit
    }))
    Promise.all(promises)
      .then(() => resolve(data))
      .catch(err => reject(err))
  }),

  modifyCSV: (path) => reader(path).then(data => self.fetchMissingTags(data))
}