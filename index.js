const reader = require('./lib/csv-reader')
const spotify = require('./lib/spotify')
const ytdl = require('ytdl-core')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ID3Writer = require('browser-id3-writer')
const fetch = require('node-fetch')
const mkdirp = require('mkdirp')
const del = require('del')

const FFMPEG_PATH = require('ffmpeg-static').path
const OPTS = {
  quality: 'highestaudio',
  filter: 'audioonly'
}

ffmpeg.setFfmpegPath(FFMPEG_PATH)

let convertToMP3 = (path) => new Promise((resolve, reject) => {
  let tmp = path.replace('.mp3', '.bak.mp3')
  return ffmpeg(path).outputOptions('-c:a', 'mp3')
    .save(tmp)
    .on('end', () => {
      del.sync([path], { force: true })
      fs.renameSync(tmp, path)
      resolve(path)
    })
    .on('error', err => reject(err))
})

let applyTags = (path, tags) => new Promise((resolve, reject) => {
  fetch(tags['cover'])
    .then(data => data.buffer())
    .then(artBuffer => {
      const writer = new ID3Writer(fs.readFileSync(path))
      writer
        .setFrame('TPE1', [tags['artist_name']])
        .setFrame('TPE3', tags['artist_name'])
        .setFrame('TPE4', tags['artist_name'])
        .setFrame('TIT2', tags['track_name'])
        .setFrame('TALB', tags['album_name'])
        .setFrame('TPOS', tags['disc_number'])
        .setFrame('TRCK', tags['track_number'])
        .setFrame('TCON', [tags['genre']])
        .setFrame('APIC', {
          type: 3,
          data: artBuffer,
          description: 'Cover (front)'
        })
      writer.addTag()
      let tmp = path.replace('.mp3', '.bak.mp3')
      fs.writeFileSync(tmp, Buffer.from(writer.arrayBuffer))
      del.sync([path], { force: true })
      fs.renameSync(tmp, path)
      resolve(path)
    })
    .catch(err => reject(err))
})

let download = (track) => new Promise((resolve, reject) => {
  let dir = `./downloads/${track['artist_name']}/${track['album_name']}/`
  let path = `${dir}/${track['track_name']}.mp3`
  if (!fs.existsSync(path)) {
    console.log(`downloading ${path} (${track['youtube_link']})`)
    mkdirp.sync(dir)
    ytdl(track['youtube_link'], OPTS)
      .pipe(fs.createWriteStream(path))
      .on('finish', () => {
        console.log('converting to mp3...')
        convertToMP3(path)
          .then(path => {
            console.log('applying tags...')
            applyTags(path, track)
              .then(_ => resolve(path))
              .catch(err => reject(err))
          })
      })
      .on('error', err => reject(err))
    } else {
      resolve(path)
    }
})

let downloadSongs = (songs) => {
  let promises = []
  for (song of songs) {
    promises.push(download(song))
  }
  return Promise.all(promises)
}

let type = process.argv[2]

if (type === 'spotify') {
  console.log('using spotify.csv')
  spotify.modifyCSV('./spotify.csv')
    .then(songs => downloadSongs(songs))
    .catch(err => console.log(err))
} else if (type === 'youtube') {
  console.log('using youtube.csv')
  reader('./youtube.csv')
    .then(songs => downloadSongs(songs))
    .catch(err => console.log(err))
}